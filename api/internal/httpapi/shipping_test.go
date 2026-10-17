package httpapi_test

import (
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func TestShippingZonesAndQuotes(t *testing.T) {
	h := newHarness(t)
	// Zones belong to the whole shop; this test is the only one that makes them.
	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones"); err != nil {
		t.Fatal(err)
	}
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	dhaka := map[string]any{
		"name": "Inside Dhaka", "districts": []string{"Dhaka"}, "base_charge": 7000, "base_weight_g": 1000,
		"extra_per_kg": 2000, "free_over": 300000, "delivery_days": "1–2 days",
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", staff.AccessToken, dhaka), 403, apigen.Forbidden)
	zone := decode[apigen.ShippingZone](t, expect2(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, dhaka), 201))

	outside := map[string]any{"name": "Outside Dhaka", "districts": []string{"Chattogram", "Dhaka"}, "base_charge": 13000, "delivery_days": "3–5 days"}
	e := expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, outside), 400, apigen.Validation)
	if (*e.Error.Fields)["districts"] == "" {
		t.Error("a district in two zones should be refused on districts")
	}
	outside["districts"] = []string{"Chattogram", "Atlantis"}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, outside), 400, apigen.Validation)
	outside["districts"] = []string{"Chattogram"}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, outside), 201, "")

	// A hidden zone may overlap; only active zones claim districts.
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Old Dhaka rate", "districts": []string{"Dhaka"}, "base_charge": 1, "delivery_days": "x", "active": false,
	}), 201, "")
	public := decode[struct{ Items []apigen.ShippingZone }](t, expect2(t, h.call("GET", "/v1/shipping/zones", "", nil), 200))
	if len(public.Items) != 2 {
		t.Errorf("public zones should be the 2 active ones, got %d", len(public.Items))
	}

	cat := h.category(admin.AccessToken, "Heavy", nil)
	body := plain("Rice 5 kg", 60000, 50, cat.Id)
	body["variants"].([]any)[0].(map[string]any)["weight_g"] = 1500
	variant := h.product(admin.AccessToken, body).Variants[0]
	if variant.WeightG != 1500 {
		t.Fatalf("weight %d", variant.WeightG)
	}
	token := *h.setItem("", "", variant.Id.String(), 2).Token // 3 kg, ৳1,200

	quote := func(district string) apigen.ShippingQuote {
		t.Helper()
		rec := h.cartCall("POST", "/v1/cart/shipping-quote", "", token, map[string]any{"district": district})
		return decode[apigen.ShippingQuote](t, expect2(t, rec, 200))
	}
	if q := quote("Dhaka"); q.Charge != 7000+2*2000 || q.Free || q.WeightG != 3000 || q.ZoneId != zone.Id {
		t.Errorf("Dhaka quote %+v", q)
	}
	if q := quote("Chattogram"); q.Charge != 13000 || q.DeliveryDays != "3–5 days" {
		t.Errorf("Chattogram quote %+v", q)
	}
	h.setItem("", token, variant.Id.String(), 5) // ৳3,000: free in Dhaka
	if q := quote("Dhaka"); q.Charge != 0 || !q.Free {
		t.Errorf("free delivery quote %+v", q)
	}
	expect(t, h.cartCall("POST", "/v1/cart/shipping-quote", "", token, map[string]any{"district": "Sylhet"}), 422, apigen.NotDeliverable)
	expect(t, h.cartCall("POST", "/v1/cart/shipping-quote", "", token, map[string]any{"district": "Narnia"}), 400, apigen.Validation)

	expect(t, h.call("DELETE", "/v1/admin/shipping-zones/"+zone.Id.String(), admin.AccessToken, nil), 204, "")
	expect(t, h.cartCall("POST", "/v1/cart/shipping-quote", "", token, map[string]any{"district": "Dhaka"}), 422, apigen.NotDeliverable)

	districts := decode[struct{ Items []apigen.District }](t, expect2(t, h.call("GET", "/v1/districts", "", nil), 200))
	if len(districts.Items) != 64 {
		t.Errorf("districts %d", len(districts.Items))
	}
}
