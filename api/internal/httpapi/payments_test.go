package httpapi_test

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/courier"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/payment"
)

func TestOnlinePayments(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	// A fake SSLCommerz sandbox: sessions for the right store, and val_ids it has seen paid.
	var mu sync.Mutex
	paidAmount := map[string]string{} // val_id → "tran_id amount"
	var started []map[string]string
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.FormValue("store_id") != "fajr01" || r.FormValue("store_passwd") != "pw" {
			fmt.Fprint(w, `{"status":"FAILED","failedreason":"Store Credential Error Or Store is De-active"}`)
			return
		}
		mu.Lock()
		defer mu.Unlock()
		switch r.URL.Path {
		case "/gwprocess/v4/api.php":
			started = append(started, map[string]string{"tran_id": r.FormValue("tran_id"), "amount": r.FormValue("total_amount"), "success": r.FormValue("success_url"), "phone": r.FormValue("cus_phone")})
			fmt.Fprintf(w, `{"status":"SUCCESS","GatewayPageURL":"https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=PAY&SESSIONKEY=%s"}`, r.FormValue("tran_id"))
		case "/validator/api/validationserverAPI.php":
			v, ok := paidAmount[r.FormValue("val_id")]
			if !ok {
				fmt.Fprint(w, `{"status":"INVALID_TRANSACTION"}`)
				return
			}
			tran, amount, _ := strings.Cut(v, " ")
			fmt.Fprintf(w, `{"status":"VALID","tran_id":%q,"amount":%q,"currency_type":"BDT","bank_tran_id":"BANK1"}`, tran, amount)
		}
	}))
	defer fake.Close()
	was := payment.SSLCommerzSandbox
	payment.SSLCommerzSandbox = fake.URL
	defer func() { payment.SSLCommerzSandbox = was }()

	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones; DELETE FROM providers"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Dhaka division", "districts": []string{"Gazipur"}, "base_charge": 10000, "delivery_days": "2 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Oil", nil)
	variant := h.product(admin.AccessToken, plain("Mustard Oil 1 L", 32050, 20, cat.Id)).Variants[0].Id.String()
	place := func(method string) (apigen.Order, string, int) {
		t.Helper()
		token := *h.setItem("", "", variant, 1).Token
		body := checkout("Gazipur")
		body["payment_method"] = method
		rec := h.cartCall("POST", "/v1/checkout", "", token, body)
		if rec.Code != 201 {
			return apigen.Order{}, "", rec.Code
		}
		p := decode[struct {
			Order apigen.Order
			Token string
		}](t, rec)
		return p.Order, p.Token, 201
	}

	// Online needs a gateway that's on.
	if _, _, code := place("online"); code != 400 {
		t.Fatalf("online with no gateway: %d", code)
	}
	if m := decode[struct{ Items []any }](t, expect2(t, h.call("GET", "/v1/payment-methods", "", nil), 200)); len(m.Items) != 0 {
		t.Errorf("methods with none on %v", m.Items)
	}
	expect(t, h.call("PUT", "/v1/admin/providers/sslcommerz", admin.AccessToken, map[string]any{
		"enabled": true, "live": false, "values": map[string]string{"store_id": "fajr01", "store_password": "pw"},
	}), 200, "")
	if m := decode[struct{ Items []struct{ Code string } }](t, expect2(t, h.call("GET", "/v1/payment-methods", "", nil), 200)); len(m.Items) != 1 || m.Items[0].Code != "sslcommerz" {
		t.Errorf("methods %v", m.Items)
	}

	o, token, _ := place("online")
	if o.PaymentStatus != apigen.PaymentStatusUnpaid || o.PaymentMethod != apigen.PaymentMethodOnline {
		t.Fatalf("placed online %v %v", o.PaymentMethod, o.PaymentStatus)
	}
	pay := fmt.Sprintf("/v1/orders/%d/payments", o.Number)
	// Only whoever holds the link may start paying.
	expect(t, h.call("POST", pay, "", map[string]any{"provider": "sslcommerz"}), 404, apigen.NotFound)
	start := decode[struct{ Url string }](t, expect2(t, h.call("POST", pay, "", map[string]any{"provider": "sslcommerz", "token": token}), 200))
	if !strings.Contains(start.Url, "SESSIONKEY=FS") || started[0]["amount"] != fmt.Sprintf("%d.%02d", o.Total/100, o.Total%100) ||
		started[0]["success"] != "http://shop.test/pay/sslcommerz?r=success" || started[0]["phone"] != "01712345678" {
		t.Fatalf("session %v %+v", start.Url, started[0])
	}
	tran := started[0]["tran_id"]

	confirm := func(val string) *httptest.ResponseRecorder {
		return h.call("POST", "/v1/payments/sslcommerz/confirm", "", map[string]any{"val_id": val})
	}
	// A made-up val_id is refused by the gateway; one for less than the total is refused by us.
	expect(t, confirm("forged"), 422, apigen.PaymentError)
	paidAmount["short"] = tran + " 1.00"
	expect(t, confirm("short"), 422, apigen.PaymentError)
	paidAmount["real"] = fmt.Sprintf("%s %d.%02d", tran, o.Total/100, o.Total%100)
	if got := decode[struct{ Number int64 }](t, expect2(t, confirm("real"), 200)); got.Number != o.Number {
		t.Errorf("confirmed order %d", got.Number)
	}
	expect(t, confirm("real"), 200, "") // the gateway's own notice arrives too
	view := decode[apigen.Order](t, expect2(t, h.call("GET", fmt.Sprintf("/v1/orders/%d?token=%s", o.Number, token), "", nil), 200))
	if view.PaymentStatus != apigen.PaymentStatusPaid || view.PaidWith == nil || *view.PaidWith != "SSLCommerz" || len(view.Events) != 2 {
		t.Errorf("after paying %v %v %d events", view.PaymentStatus, view.PaidWith, len(view.Events))
	}
	expect(t, h.call("POST", pay, "", map[string]any{"provider": "sslcommerz", "token": token}), 409, apigen.StatusChanged)

	// A paid order's parcel collects nothing.
	sf := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if body, _ := io.ReadAll(r.Body); !strings.Contains(string(body), `"cod_amount":0`) {
			fmt.Fprint(w, `{"status":400,"message":"expected no cash to collect"}`)
			return
		}
		fmt.Fprint(w, `{"status":200,"consignment":{"consignment_id":7,"tracking_code":"T7","status":"in_review"}}`)
	}))
	defer sf.Close()
	wasSF := courier.SteadfastURL
	courier.SteadfastURL = sf.URL
	defer func() { courier.SteadfastURL = wasSF }()
	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"api_key": "k", "secret_key": "s"},
	}), 200, "")
	expect(t, h.call("POST", fmt.Sprintf("/v1/admin/orders/%d/status", o.Number), staff.AccessToken, map[string]any{"from": "pending", "to": "confirmed"}), 200, "")
	if b := decode[apigen.Order](t, expect2(t, h.call("POST", fmt.Sprintf("/v1/admin/orders/%d/shipment", o.Number), staff.AccessToken, map[string]any{"provider": "steadfast"}), 200)); b.Shipment.CodAmount != 0 {
		t.Errorf("paid order collects %d", b.Shipment.CodAmount)
	}

	// Changing an unpaid online order to cash on delivery, once.
	o2, token2, _ := place("online")
	cod := fmt.Sprintf("/v1/orders/%d/cash-on-delivery", o2.Number)
	expect(t, h.call("POST", cod, "", map[string]any{}), 404, apigen.NotFound)
	if c := decode[apigen.Order](t, expect2(t, h.call("POST", cod, "", map[string]any{"token": token2}), 200)); c.PaymentStatus != apigen.PaymentStatusCod {
		t.Errorf("after switching %v", c.PaymentStatus)
	}
	expect(t, h.call("POST", cod, "", map[string]any{"token": token2}), 409, apigen.StatusChanged)
}
