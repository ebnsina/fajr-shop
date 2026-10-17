package httpapi_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/courier"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func TestDeliveryHistory(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	// Steadfast's panel: a sign-in form with a CSRF token, a session cookie, then the lookup.
	var sfLogins atomic.Int32
	sf := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == "GET" && r.URL.Path == "/login":
			fmt.Fprint(w, `<form><input type="hidden" name="_token" value="tok123"></form>`)
		case r.Method == "POST" && r.URL.Path == "/login":
			sfLogins.Add(1)
			if r.FormValue("_token") == "tok123" && r.FormValue("password") == "panel-pw" {
				http.SetCookie(w, &http.Cookie{Name: "session", Value: "ok", Path: "/"})
			}
			http.Redirect(w, r, "/dashboard", http.StatusFound)
		case r.URL.Path == "/dashboard":
			fmt.Fprint(w, "<html>dashboard</html>")
		case r.URL.Path == "/user/frauds/check/01712345678":
			if c, err := r.Cookie("session"); err != nil || c.Value != "ok" {
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}
			fmt.Fprint(w, `{"total_delivered":9,"total_cancelled":1}`)
		default:
			w.WriteHeader(404)
		}
	}))
	defer sf.Close()
	pathao := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v1/login":
			var in map[string]string
			_ = json.NewDecoder(r.Body).Decode(&in)
			if in["password"] != "pathao-pw" {
				w.WriteHeader(401)
				fmt.Fprint(w, `{"message":"Unauthorized"}`)
				return
			}
			fmt.Fprint(w, `{"access_token":"pt"}`)
		case "/api/v1/user/success":
			fmt.Fprint(w, `{"data":{"customer":{"total_delivery":4,"successful_delivery":1}}}`)
		}
	}))
	defer pathao.Close()
	was := [2]string{courier.SteadfastPanelURL, courier.PathaoPanelURL}
	courier.SteadfastPanelURL, courier.PathaoPanelURL = sf.URL, pathao.URL
	defer func() { courier.SteadfastPanelURL, courier.PathaoPanelURL = was[0], was[1] }()

	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones; DELETE FROM providers; DELETE FROM phone_checks"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Dhaka division", "districts": []string{"Gazipur"}, "base_charge": 10000, "delivery_days": "2 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Rice", nil)
	variant := h.product(admin.AccessToken, plain("Chinigura Rice", 20000, 50, cat.Id)).Variants[0].Id.String()
	// Orders from a phone no other test uses, so the shop's own record is only these.
	order := func() apigen.Order {
		t.Helper()
		token := *h.setItem("", "", variant, 1).Token
		body := checkout("Gazipur")
		body["phone"] = "01712345678"
		return decode[struct{ Order apigen.Order }](t, expect2(t, h.cartCall("POST", "/v1/checkout", "", token, body), 201)).Order
	}
	// Orders are behind row-level security, even for the table's owner.
	if _, err := h.pool.Exec(t.Context(), "BEGIN; SET LOCAL app.orders = 'on'; UPDATE orders SET phone = '+8801999999999' WHERE phone = '+8801712345678'; COMMIT"); err != nil {
		t.Fatal(err)
	}
	history := func(n int64) apigen.DeliveryHistory {
		t.Helper()
		return decode[apigen.DeliveryHistory](t, expect2(t, h.call("GET", fmt.Sprintf("/v1/admin/orders/%d/history", n), staff.AccessToken, nil), 200))
	}

	first := order()
	if got := history(first.Number); got.Verdict != apigen.New || len(got.Couriers) != 0 || got.Shop.Open != 0 {
		t.Errorf("a first-time customer %+v", got)
	}
	moveTo := func(n int64, path ...string) {
		for i := 1; i < len(path); i++ {
			expect(t, h.call("POST", fmt.Sprintf("/v1/admin/orders/%d/status", n), staff.AccessToken, map[string]any{"from": path[i-1], "to": path[i]}), 200, "")
		}
	}
	moveTo(first.Number, "pending", "confirmed", "packed", "shipped", "delivered")
	second := order()
	if got := history(second.Number); got.Verdict != apigen.Good || got.Shop.Delivered != 1 {
		t.Errorf("after one delivery %+v", got)
	}

	// Steadfast without its panel sign-in says how to add it; Pathao with a wrong password says so.
	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"api_key": "k", "secret_key": "s"},
	}), 200, "")
	expect(t, h.call("PUT", "/v1/admin/providers/pathao", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"client_id": "1", "client_secret": "x", "username": "shop@x.com", "password": "wrong", "store_id": "9"},
	}), 200, "")
	got := history(second.Number)
	if len(got.Couriers) != 2 || got.Couriers[0].Error == nil || got.Couriers[1].Error == nil || got.Verdict != apigen.Good {
		t.Fatalf("lookups that can't run %+v", got.Couriers)
	}

	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"panel_email": "shop@x.com", "panel_password": "panel-pw"},
	}), 200, "")
	expect(t, h.call("PUT", "/v1/admin/providers/pathao", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"password": "pathao-pw"},
	}), 200, "")
	// Shop 1/0, Steadfast 9/1, Pathao 1/3: 11 of 15 delivered, 73%.
	got = history(second.Number)
	if got.Delivered != 11 || got.Cancelled != 4 || got.Verdict != apigen.Mixed {
		t.Errorf("combined %+v %+v", got, got.Couriers)
	}
	logins := sfLogins.Load()
	// A day's cache: asking again signs in nowhere.
	if again := history(second.Number); again.Delivered != 11 || sfLogins.Load() != logins {
		t.Errorf("cache: delivered %d, Steadfast sign-ins %d → %d", again.Delivered, logins, sfLogins.Load())
	}
	expect(t, h.call("GET", fmt.Sprintf("/v1/admin/orders/%d/history", second.Number), h.register(uniqueEmail()).AccessToken, nil), 403, apigen.Forbidden)
}
