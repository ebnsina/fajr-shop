// Package courier books parcels with the shop's own courier accounts and asks how they are doing.
package courier

import (
	"bytes"
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// SteadfastURL is Steadfast's merchant API; tests point it at a fake.
var SteadfastURL = "https://portal.steadfast.com.bd/api/v1"

var client = &http.Client{Timeout: 20 * time.Second}

// Refused is the courier saying no, in its own words, as opposed to the call failing.
type Refused struct{ Message string }

func (e *Refused) Error() string { return "courier refused: " + e.Message }

var ErrUnsupported = errors.New("courier: booking with this courier isn't available yet")

// Supports says whether parcels can be booked with this courier from here yet.
func Supports(code string) bool { return code == "steadfast" }

type Parcel struct {
	Invoice string
	Name    string
	// Phone is 01XXXXXXXXX.
	Phone   string
	Address string
	Note    string
	// COD is what the rider collects, in poisha.
	COD int64
}

type Booking struct {
	ConsignmentID string
	TrackingCode  string
	Status        string
}

func Book(ctx context.Context, code string, keys map[string]string, p Parcel) (Booking, error) {
	if !Supports(code) {
		return Booking{}, ErrUnsupported
	}
	var out struct {
		Status      int    `json:"status"`
		Message     string `json:"message"`
		Consignment struct {
			ConsignmentID json.Number `json:"consignment_id"`
			TrackingCode  string      `json:"tracking_code"`
			Status        string      `json:"status"`
		} `json:"consignment"`
	}
	body := map[string]any{
		"invoice": p.Invoice, "recipient_name": p.Name, "recipient_phone": p.Phone,
		"recipient_address": p.Address, "cod_amount": float64(p.COD) / 100, "note": p.Note,
	}
	if err := steadfast(ctx, keys, http.MethodPost, "/create_order", body, &out); err != nil {
		return Booking{}, err
	}
	if out.Status != 200 || out.Consignment.ConsignmentID == "" {
		return Booking{}, &Refused{out.Message}
	}
	return Booking{ConsignmentID: out.Consignment.ConsignmentID.String(), TrackingCode: out.Consignment.TrackingCode, Status: out.Consignment.Status}, nil
}

// Status is the courier's own word for where the parcel is, like in_review or delivered.
func Status(ctx context.Context, code string, keys map[string]string, consignmentID string) (string, error) {
	if !Supports(code) {
		return "", ErrUnsupported
	}
	var out struct {
		Status         int    `json:"status"`
		DeliveryStatus string `json:"delivery_status"`
	}
	if err := steadfast(ctx, keys, http.MethodGet, "/status_by_cid/"+consignmentID, nil, &out); err != nil {
		return "", err
	}
	if out.DeliveryStatus == "" {
		return "", &Refused{"no status for this parcel"}
	}
	return out.DeliveryStatus, nil
}

// Delivered says whether a courier status means the customer has the parcel.
func Delivered(status string) bool {
	return status == "delivered" || status == "partial_delivered"
}

func steadfast(ctx context.Context, keys map[string]string, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		b, err := json.Marshal(in)
		if err != nil {
			return err
		}
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, SteadfastURL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Api-Key", keys["api_key"])
	req.Header.Set("Secret-Key", keys["secret_key"])
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("steadfast: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("steadfast: read: %w", err)
	}
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden {
		return &Refused{"the API key or secret key was not accepted"}
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("steadfast: %d %s", res.StatusCode, strings.TrimSpace(string(raw[:min(len(raw), 200)])))
	}
	if res.StatusCode >= 400 {
		var e struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &e)
		return &Refused{cmp.Or(e.Message, res.Status)}
	}
	return nil
}
