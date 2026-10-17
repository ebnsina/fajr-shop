package httpapi_test

import (
	"fmt"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// checkout is a valid delivery address in district, for the cart held by token (or the signed-in caller).
func checkout(district string) map[string]any {
	return map[string]any{
		"name": "Rahim Uddin", "phone": "01712-345678", "district": district, "area": "Tongi",
		"address": "House 12, Road 3, near the mosque", "payment_method": "cod",
	}
}

func TestCheckoutAndOrders(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Dhaka division", "districts": []string{"Gazipur"}, "base_charge": 10000, "base_weight_g": 1000,
		"extra_per_kg": 2000, "delivery_days": "2 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Honey", nil)
	honey := h.product(admin.AccessToken, plain("Sundarban Honey", 150000, 3, cat.Id))
	variant := honey.Variants[0].Id.String()
	code := "HONEY" + tag()
	expect(t, h.call("POST", "/v1/admin/discounts", admin.AccessToken, map[string]any{"code": code, "kind": "fixed", "value": 10000, "usage_limit": 1}), 201, "")

	// An empty bag can't be ordered.
	expect(t, h.cartCall("POST", "/v1/checkout", "", "", checkout("Gazipur")), 409, apigen.CartEmpty)

	// A guest orders two jars with the code: 2 × ৳1,500 − ৳100 + delivery for 1 kg (৳100, 500 g each).
	cart := h.setItem("", "", variant, 2)
	token := *cart.Token
	expect(t, h.cartCall("PUT", "/v1/cart/discount", "", token, map[string]any{"code": code}), 200, "")
	bad := checkout("Gazipur")
	bad["phone"] = "12345"
	e := expect(t, h.cartCall("POST", "/v1/checkout", "", token, bad), 400, apigen.Validation)
	if (*e.Error.Fields)["phone"] == "" {
		t.Errorf("phone not flagged: %v", e.Error)
	}
	expect(t, h.cartCall("POST", "/v1/checkout", "", token, checkout("Sylhet")), 422, apigen.NotDeliverable)

	placed := decode[struct {
		Order apigen.Order
		Token string
	}](t, expect2(t, h.cartCall("POST", "/v1/checkout", "", token, checkout("Gazipur")), 201))
	o := placed.Order
	if o.Subtotal != 300000 || o.DiscountTotal != 10000 || o.DeliveryCharge != 10000 || o.Total != 300000 || o.Status != apigen.Pending {
		t.Errorf("totals %+v", o)
	}
	if o.Phone != "+8801712345678" || o.ItemCount != 2 || o.Items[0].Name != "Sundarban Honey" || len(o.Events) != 1 {
		t.Errorf("order %+v", o)
	}
	if left := decode[apigen.Product](t, h.call("GET", "/v1/products/"+honey.Slug, "", nil)).Variants[0].Stock; left != 1 {
		t.Errorf("stock left %d, want 1", left)
	}
	if c := decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", "", token, nil)); len(c.Items) != 0 || c.Discount != nil {
		t.Errorf("bag not emptied: %+v", c)
	}
	// The code had one use, so it's now refused.
	h.setItem("", token, variant, 1)
	expect(t, h.cartCall("PUT", "/v1/cart/discount", "", token, map[string]any{"code": code}), 400, apigen.Validation)

	// Only the link's holder (or staff) can see a guest's order.
	path := fmt.Sprintf("/v1/orders/%d", o.Number)
	stranger := h.register(uniqueEmail())
	expect(t, h.call("GET", path, "", nil), 404, apigen.NotFound)
	expect(t, h.call("GET", path+"?token=fso_wrong", "", nil), 404, apigen.NotFound)
	expect(t, h.call("GET", path, stranger.AccessToken, nil), 404, apigen.NotFound)
	if got := decode[apigen.Order](t, expect2(t, h.call("GET", path+"?token="+placed.Token, "", nil), 200)); got.Id != o.Id {
		t.Errorf("by link: %+v", got)
	}
	// Row-level security holds outside the API too.
	var n int
	if err := h.pool.QueryRow(t.Context(), "SELECT count(*) FROM orders").Scan(&n); err != nil || n != 0 {
		t.Errorf("unscoped query saw %d orders (err %v)", n, err)
	}

	// Stock fell below what's in a bag: refused, with nothing taken.
	expect(t, h.call("POST", "/v1/admin/variants/"+variant+"/stock-adjustments", admin.AccessToken, map[string]any{"delta": -1, "reason": "damaged"}), 200, "")
	expect(t, h.cartCall("POST", "/v1/checkout", "", token, checkout("Gazipur")), 409, apigen.CartChanged)

	// A signed-in customer's orders are theirs to list.
	expect(t, h.call("POST", "/v1/admin/variants/"+variant+"/stock-adjustments", admin.AccessToken, map[string]any{"delta": 5, "reason": "received"}), 200, "")
	h.setItem(stranger.AccessToken, "", variant, 1)
	mine := decode[struct{ Order apigen.Order }](t, expect2(t, h.cartCall("POST", "/v1/checkout", stranger.AccessToken, "", checkout("Gazipur")), 201)).Order
	list := decode[struct{ Items []apigen.OrderSummary }](t, expect2(t, h.call("GET", "/v1/orders", stranger.AccessToken, nil), 200)).Items
	if len(list) != 1 || list[0].Number != mine.Number {
		t.Errorf("my orders: %+v", list)
	}
	expect(t, h.call("GET", fmt.Sprintf("/v1/orders/%d", mine.Number), stranger.AccessToken, nil), 200, "")

	// The shop moves the guest's order on, one step at a time, and cancelling puts stock back.
	staff := h.member(dbq.UserRoleStaff)
	status := fmt.Sprintf("/v1/admin/orders/%d/status", o.Number)
	expect(t, h.call("POST", status, stranger.AccessToken, map[string]any{"from": "pending", "to": "confirmed"}), 403, apigen.Forbidden)
	expect(t, h.call("POST", status, staff.AccessToken, map[string]any{"from": "pending", "to": "shipped"}), 400, apigen.Validation)
	confirmed := decode[apigen.Order](t, expect2(t, h.call("POST", status, staff.AccessToken, map[string]any{"from": "pending", "to": "confirmed", "note": "Called, confirmed"}), 200))
	if confirmed.Status != apigen.Confirmed || len(confirmed.Events) != 2 || *confirmed.Events[1].Actor != "Al-Khwarizmi" {
		t.Errorf("confirmed: %+v", confirmed)
	}
	expect(t, h.call("POST", status, staff.AccessToken, map[string]any{"from": "pending", "to": "confirmed"}), 409, apigen.StatusChanged)
	before := decode[apigen.Product](t, h.call("GET", "/v1/products/"+honey.Slug, "", nil)).Variants[0].Stock
	expect(t, h.call("POST", status, staff.AccessToken, map[string]any{"from": "confirmed", "to": "cancelled"}), 200, "")
	if after := decode[apigen.Product](t, h.call("GET", "/v1/products/"+honey.Slug, "", nil)).Variants[0].Stock; after != before+2 {
		t.Errorf("stock after cancelling %d, want %d", after, before+2)
	}
	all := decode[struct{ Items []apigen.OrderSummary }](t, expect2(t, h.call("GET", "/v1/admin/orders?status=cancelled", staff.AccessToken, nil), 200)).Items
	if len(all) == 0 || all[0].Number != o.Number {
		t.Errorf("cancelled list: %+v", all)
	}
}

func TestCheckoutVat(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	if _, err := h.pool.Exec(t.Context(), "DELETE FROM shipping_zones"); err != nil {
		t.Fatal(err)
	}
	expect(t, h.call("POST", "/v1/admin/shipping-zones", admin.AccessToken, map[string]any{
		"name": "Everywhere", "districts": []string{"Khulna"}, "base_charge": 10000, "delivery_days": "3 days",
	}), 201, "")
	cat := h.category(admin.AccessToken, "Tea", nil)
	tea := h.product(admin.AccessToken, plain("Seylon Tea", 100000, 9, cat.Id)).Variants[0].Id.String()
	setVat := func(included bool) {
		t.Helper()
		expect(t, h.call("PUT", "/v1/admin/store", admin.AccessToken, map[string]any{
			"name": "Fajr Bazar", "currency": "BDT", "vat": map[string]any{"enabled": true, "rate_bp": 500, "prices_include_vat": included},
		}), 200, "")
	}
	t.Cleanup(func() {
		h.call("PUT", "/v1/admin/store", admin.AccessToken, map[string]any{"name": "Fajr Bazar", "currency": "BDT", "vat": map[string]any{"enabled": false, "rate_bp": 0, "prices_include_vat": true}})
	})

	place := func() apigen.Order {
		t.Helper()
		token := *h.setItem("", "", tea, 1).Token
		return decode[struct{ Order apigen.Order }](t, expect2(t, h.cartCall("POST", "/v1/checkout", "", token, checkout("Khulna")), 201)).Order
	}
	setVat(false) // 5% on top of ৳1,000
	if o := place(); o.VatTotal != 5000 || o.Total != 100000+10000+5000 || o.VatIncluded {
		t.Errorf("added VAT: %+v", o)
	}
	setVat(true) // ৳1,000 already includes 5%: ৳47.62
	if o := place(); o.VatTotal != 4762 || o.Total != 100000+10000 || !o.VatIncluded {
		t.Errorf("included VAT: vat %d total %d", o.VatTotal, o.Total)
	}
}
