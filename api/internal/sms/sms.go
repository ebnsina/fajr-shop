// Package sms sends a text through the shop's own SMS gateway account.
package sms

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// The gateways' send endpoints; tests point them at fakes.
var (
	BulkSMSBDURL   = "https://bulksmsbd.net/api/smsapi"
	SSLWirelessURL = "https://smsplus.sslwireless.com/api/v3/send-sms"
)

var client = &http.Client{Timeout: 20 * time.Second}

// Refused is the gateway saying no, like a wrong key or an unapproved sender id; trying again won't help.
type Refused struct{ Message string }

func (e *Refused) Error() string { return "sms refused: " + e.Message }

// Send texts phone (01XXXXXXXXX) through the gateway named by code.
func Send(ctx context.Context, code string, keys map[string]string, phone, text string) error {
	msisdn := "88" + phone
	switch code {
	case "bulksmsbd":
		q := url.Values{"api_key": {keys["api_key"]}, "type": {"text"}, "number": {msisdn}, "senderid": {keys["sender_id"]}, "message": {text}}
		var out struct {
			Code    int    `json:"response_code"`
			Message string `json:"error_message"`
		}
		if err := call(ctx, http.MethodPost, BulkSMSBDURL, "application/x-www-form-urlencoded", []byte(q.Encode()), &out); err != nil {
			return err
		}
		if out.Code != 202 {
			return &Refused{fmt.Sprintf("BulkSMSBD code %d %s", out.Code, out.Message)}
		}
		return nil
	case "sslwireless":
		id := make([]byte, 8)
		_, _ = rand.Read(id) // crypto/rand.Read never fails
		body, _ := json.Marshal(map[string]string{
			"api_token": keys["api_token"], "sid": keys["sid"], "msisdn": msisdn, "sms": text, "csms_id": hex.EncodeToString(id),
		})
		var out struct {
			Status  string `json:"status"`
			Message string `json:"error_message"`
		}
		if err := call(ctx, http.MethodPost, SSLWirelessURL, "application/json", body, &out); err != nil {
			return err
		}
		if out.Status != "SUCCESS" {
			return &Refused{"SSL Wireless: " + out.Message}
		}
		return nil
	}
	return &Refused{"unknown SMS gateway " + code}
}

func call(ctx context.Context, method, u, contentType string, body []byte, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, u, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Accept", "application/json")
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sms: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("sms: read: %w", err)
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("sms: %s: unreadable reply", res.Status)
	}
	return nil
}
