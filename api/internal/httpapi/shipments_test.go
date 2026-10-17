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

func TestShipments(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	// A fake Steadfast: books anything with the right keys, and says delivered once asked twice.
	var booked, asked atomic.Int32
	var got map[string]any
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Api-Key") != "sf-key" || r.Header.Get("Secret-Key") != "sf-secret" {
			w.WriteHeader(401)
			return
		}
		switch r.URL.Path {
		case "/create_order":
			_ = json.NewDecoder(r.Body).Decode(&got)
			if got["recipient_name"] == "Refuse Me" {
				fmt.Fprint(w, `{"status":400,"message":"Invalid recipient address"}`)
				return
			}
			booked.Add(1)
			fmt.Fprint(w, `{"status":200,"message":"Consignment has been created successfully.","consignment":{"consignment_id":1424107,"invoice":"x","tracking_code":"15BAEB8A","status":"in_review"}}`)
		case "/status_by_cid/1424107":
			if asked.Add(1) < 2 {
				fmt.Fprint(w, `{"status":200,"delivery_status":"pending"}`)
				return
			}
			fmt.Fprint(w, `{"status":200,"delivery_status":"delivered"}`)
		default:
			w.WriteHeader(404)
		}
	}))
	defer fake.Close()
	was := courier.SteadfastURL
	courier.SteadfastURL = fake.URL
	defer func() { courier.SteadfastURL = was }()

	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones; DELETE FROM providers"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Dhaka division", "districts": []string{"Gazipur"}, "base_charge": 10000, "delivery_days": "2 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Tea", nil)
	variant := h.product(admin.AccessToken, plain("Ispahani Tea", 50000, 10, cat.Id)).Variants[0].Id.String()
	order := func(name string) apigen.Order {
		t.Helper()
		token := *h.setItem("", "", variant, 1).Token
		body := checkout("Gazipur")
		body["name"] = name
		return decode[struct{ Order apigen.Order }](t, expect2(t, h.cartCall("POST", "/v1/checkout", "", token, body), 201)).Order
	}
	o := order("Karim Ahmed")
	book := fmt.Sprintf("/v1/admin/orders/%d/shipment", o.Number)
	steadfast := map[string]any{"provider": "steadfast"}

	// Not switched on yet, and a pending order can't go anyway.
	expect(t, h.call("POST", book, staff.AccessToken, steadfast), 400, apigen.Validation)
	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"api_key": "sf-key", "secret_key": "sf-secret"},
	}), 200, "")
	couriers := decode[struct{ Items []struct{ Code string } }](t, expect2(t, h.call("GET", "/v1/admin/couriers", staff.AccessToken, nil), 200))
	if len(couriers.Items) != 1 || couriers.Items[0].Code != "steadfast" {
		t.Errorf("couriers %+v", couriers.Items)
	}
	expect(t, h.call("POST", book, staff.AccessToken, steadfast), 409, apigen.StatusChanged)

	move := func(n int64, from, to string) {
		t.Helper()
		expect(t, h.call("POST", fmt.Sprintf("/v1/admin/orders/%d/status", n), staff.AccessToken, map[string]any{"from": from, "to": to}), 200, "")
	}
	move(o.Number, "pending", "confirmed")
	shipped := decode[apigen.Order](t, expect2(t, h.call("POST", book, staff.AccessToken, steadfast), 200))
	if shipped.Status != apigen.Shipped || shipped.Shipment == nil || *shipped.Shipment.TrackingCode != "15BAEB8A" || shipped.Shipment.CodAmount != o.Total {
		t.Fatalf("after booking %+v %+v", shipped.Status, shipped.Shipment)
	}
	if got["invoice"] != fmt.Sprint(o.Number) || got["recipient_phone"] != "01712345678" || got["cod_amount"] != float64(o.Total)/100 {
		t.Errorf("sent to Steadfast %v", got)
	}
	// Booking twice is refused before Steadfast is asked again.
	move2 := h.call("POST", book, staff.AccessToken, steadfast)
	if move2.Code != 409 || booked.Load() != 1 {
		t.Errorf("second booking: %d, booked %d times", move2.Code, booked.Load())
	}

	refresh := book + "/refresh"
	if r := decode[apigen.Order](t, expect2(t, h.call("POST", refresh, staff.AccessToken, nil), 200)); r.Status != apigen.Shipped || r.Shipment.Status != "pending" {
		t.Errorf("first refresh %v %v", r.Status, r.Shipment.Status)
	}
	if r := decode[apigen.Order](t, expect2(t, h.call("POST", refresh, staff.AccessToken, nil), 200)); r.Status != apigen.Delivered || r.Shipment.Status != "delivered" {
		t.Errorf("second refresh %v %v", r.Status, r.Shipment.Status)
	}

	// A refusal says why, and leaves the order free to book again.
	bad := order("Refuse Me")
	move(bad.Number, "pending", "confirmed")
	badBook := fmt.Sprintf("/v1/admin/orders/%d/shipment", bad.Number)
	e := expect(t, h.call("POST", badBook, staff.AccessToken, steadfast), 422, apigen.CourierError)
	if e.Error.Message != "Steadfast said: Invalid recipient address" {
		t.Errorf("refusal message %q", e.Error.Message)
	}
	if again := decode[apigen.Order](t, expect2(t, h.call("GET", fmt.Sprintf("/v1/admin/orders/%d", bad.Number), staff.AccessToken, nil), 200)); again.Shipment != nil || again.Status != apigen.Confirmed {
		t.Errorf("refused order kept a shipment: %+v", again.Shipment)
	}

	// Wrong keys read as Steadfast refusing them.
	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": true, "values": map[string]string{"api_key": "old"},
	}), 200, "")
	expect(t, h.call("POST", badBook, staff.AccessToken, steadfast), 422, apigen.CourierError)

	// Nobody outside the team can book.
	stranger := h.register(uniqueEmail())
	expect(t, h.call("POST", book, stranger.AccessToken, steadfast), 403, apigen.Forbidden)
}
