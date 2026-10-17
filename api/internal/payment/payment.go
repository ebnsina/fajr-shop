// Package payment sends customers to the shop's payment gateway and checks with the gateway that they paid.
package payment

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// SSLCommerz's hosts, test and live; tests point both at a fake.
var (
	SSLCommerzSandbox = "https://sandbox.sslcommerz.com"
	SSLCommerzLive    = "https://securepay.sslcommerz.com"
)

var client = &http.Client{Timeout: 20 * time.Second}

var ErrUnsupported = errors.New("payment: paying with this gateway isn't available yet")

// Refused is the gateway saying no in its own words.
type Refused struct{ Message string }

func (e *Refused) Error() string { return "payment refused: " + e.Message }

// Supports says whether customers can pay through this gateway from here yet.
func Supports(code string) bool { return code == "sslcommerz" }

type Charge struct {
	TranID string
	// Amount in poisha.
	Amount  int64
	Name    string
	Email   string
	Phone   string
	Address string
	City    string
	Items   int
	// Where the gateway sends the customer back.
	SuccessURL, FailURL, CancelURL string
}

// Start opens a payment with the gateway and says where to send the customer to pay.
func Start(ctx context.Context, code string, keys map[string]string, live bool, c Charge) (string, error) {
	if !Supports(code) {
		return "", ErrUnsupported
	}
	form := url.Values{
		"store_id": {keys["store_id"]}, "store_passwd": {keys["store_password"]},
		"total_amount": {amount(c.Amount)}, "currency": {"BDT"}, "tran_id": {c.TranID},
		"success_url": {c.SuccessURL}, "fail_url": {c.FailURL}, "cancel_url": {c.CancelURL},
		"cus_name": {c.Name}, "cus_email": {c.Email}, "cus_phone": {c.Phone}, "cus_add1": {c.Address},
		"cus_city": {c.City}, "cus_state": {c.City}, "cus_postcode": {"0000"}, "cus_country": {"Bangladesh"},
		"shipping_method": {"Courier"}, "num_of_item": {strconv.Itoa(c.Items)},
		"ship_name": {c.Name}, "ship_add1": {c.Address}, "ship_city": {c.City}, "ship_state": {c.City},
		"ship_postcode": {"0000"}, "ship_country": {"Bangladesh"},
		"product_name": {"Order " + c.TranID}, "product_category": {"General"}, "product_profile": {"physical-goods"},
	}
	var out struct {
		Status  string `json:"status"`
		Reason  string `json:"failedreason"`
		PageURL string `json:"GatewayPageURL"`
	}
	if err := call(ctx, http.MethodPost, host(live)+"/gwprocess/v4/api.php", strings.NewReader(form.Encode()), &out); err != nil {
		return "", err
	}
	if out.Status != "SUCCESS" || out.PageURL == "" {
		return "", &Refused{out.Reason}
	}
	return out.PageURL, nil
}

// Paid is what the gateway confirms about a payment.
type Paid struct {
	TranID string
	Amount int64
	Ref    string
}

// Confirm asks the gateway itself about a payment the customer's browser reported, so nobody can
// fake one by posting to the return page.
func Confirm(ctx context.Context, code string, keys map[string]string, live bool, valID string) (Paid, error) {
	if !Supports(code) {
		return Paid{}, ErrUnsupported
	}
	q := url.Values{"val_id": {valID}, "store_id": {keys["store_id"]}, "store_passwd": {keys["store_password"]}, "format": {"json"}, "v": {"1"}}
	var out struct {
		Status     string `json:"status"`
		TranID     string `json:"tran_id"`
		Amount     string `json:"amount"`
		Currency   string `json:"currency_type"`
		BankTranID string `json:"bank_tran_id"`
	}
	if err := call(ctx, http.MethodGet, host(live)+"/validator/api/validationserverAPI.php?"+q.Encode(), nil, &out); err != nil {
		return Paid{}, err
	}
	if out.Status != "VALID" && out.Status != "VALIDATED" {
		return Paid{}, &Refused{"payment not completed (" + out.Status + ")"}
	}
	if out.Currency != "" && out.Currency != "BDT" {
		return Paid{}, &Refused{"paid in " + out.Currency}
	}
	f, err := strconv.ParseFloat(out.Amount, 64)
	if err != nil {
		return Paid{}, fmt.Errorf("sslcommerz: amount %q: %w", out.Amount, err)
	}
	return Paid{TranID: out.TranID, Amount: int64(f*100 + 0.5), Ref: out.BankTranID}, nil
}

func host(live bool) string {
	if live {
		return SSLCommerzLive
	}
	return SSLCommerzSandbox
}

// amount writes poisha as taka with two decimals, as gateways expect.
func amount(poisha int64) string { return fmt.Sprintf("%d.%02d", poisha/100, poisha%100) }

func call(ctx context.Context, method, u string, body io.Reader, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, u, body)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	res, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sslcommerz: %w", err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return fmt.Errorf("sslcommerz: read: %w", err)
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("sslcommerz: %s: unreadable reply", res.Status)
	}
	return nil
}
