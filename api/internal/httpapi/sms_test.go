package httpapi_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/sms"
)

func TestOrderTexts(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	var mu sync.Mutex
	sent := map[string][]string{} // number → texts
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.FormValue("api_key") != "sms-key" || r.FormValue("senderid") != "8809617" {
			fmt.Fprint(w, `{"response_code":1002,"error_message":"Sender Id/Masking Not Found"}`)
			return
		}
		mu.Lock()
		sent[r.FormValue("number")] = append(sent[r.FormValue("number")], r.FormValue("message"))
		mu.Unlock()
		fmt.Fprint(w, `{"response_code":202,"message_id":1,"success_message":"SMS Submitted Successfully"}`)
	}))
	defer fake.Close()
	was := sms.BulkSMSBDURL
	sms.BulkSMSBDURL = fake.URL
	defer func() { sms.BulkSMSBDURL = was }()

	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones; DELETE FROM providers"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Dhaka division", "districts": []string{"Gazipur"}, "base_charge": 10000, "delivery_days": "2 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Dates", nil)
	variant := h.product(admin.AccessToken, plain("Ajwa Dates 1 kg", 160000, 10, cat.Id)).Variants[0].Id.String()
	order := func(phone string) apigen.Order {
		t.Helper()
		token := *h.setItem("", "", variant, 1).Token
		body := checkout("Gazipur")
		body["phone"] = phone
		return decode[struct{ Order apigen.Order }](t, expect2(t, h.cartCall("POST", "/v1/checkout", "", token, body), 201)).Order
	}

	// No gateway on: nothing is queued, and ordering works as ever.
	order("01811000001")

	expect(t, h.call("PUT", "/v1/admin/providers/bulksmsbd", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"api_key": "sms-key", "sender_id": "8809617"},
	}), 200, "")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := h.app.Start(ctx); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = h.app.Stop(context.Background()) })

	o := order("01811000002")
	n := fmt.Sprintf("/v1/admin/orders/%d/status", o.Number)
	expect(t, h.call("POST", n, staff.AccessToken, map[string]any{"from": "pending", "to": "confirmed"}), 200, "")
	expect(t, h.call("POST", n, staff.AccessToken, map[string]any{"from": "confirmed", "to": "packed"}), 200, "")
	expect(t, h.call("POST", n, staff.AccessToken, map[string]any{"from": "packed", "to": "cancelled"}), 200, "")

	want := []string{"We got your order #%d for ৳1,700", "Order #%d is confirmed", "Order #%d is cancelled"}
	deadline := time.Now().Add(15 * time.Second)
	for {
		mu.Lock()
		got := append([]string(nil), sent["8801811000002"]...)
		none := len(sent["8801811000001"])
		mu.Unlock()
		if len(got) >= len(want) || time.Now().After(deadline) {
			if none != 0 {
				t.Errorf("texted an order placed while SMS was off")
			}
			if len(got) != len(want) {
				t.Fatalf("texts %q", got)
			}
			for _, w := range want {
				w = fmt.Sprintf(w, o.Number)
				if !strings.Contains(strings.Join(got, "\n"), w) {
					t.Errorf("no text containing %q in %q", w, got)
				}
			}
			break
		}
		time.Sleep(100 * time.Millisecond)
	}
}
