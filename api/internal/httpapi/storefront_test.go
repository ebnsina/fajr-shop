package httpapi_test

import (
	"net/url"
	"slices"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
)

func TestBrands(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Electronics", nil)
	brand := "Walton " + tag()
	for _, name := range []string{"Fridge", "Fan"} {
		p := plain(name, 1000, 1, cat.Id)
		p["brand"] = brand
		h.product(admin.AccessToken, p)
	}
	h.product(admin.AccessToken, plain("No brand", 1000, 1, cat.Id))

	page := decode[apigen.ProductPage](t, expect2(t, h.call("GET", "/v1/products?brand="+url.QueryEscape(brand)+"&sort=name", "", nil), 200))
	var names []string
	for _, p := range page.Items {
		names = append(names, p.Name)
		if p.Brand == nil || *p.Brand != brand {
			t.Errorf("summary brand %v", p.Brand)
		}
	}
	if !slices.Equal(names, []string{"Fan", "Fridge"}) {
		t.Errorf("brand filter: %v", names)
	}
	brands := decode[struct{ Items []apigen.Brand }](t, expect2(t, h.call("GET", "/v1/brands", "", nil), 200))
	i := slices.IndexFunc(brands.Items, func(b apigen.Brand) bool { return b.Name == brand })
	if i < 0 || brands.Items[i].ProductCount != 2 {
		t.Errorf("brands: %+v", brands.Items)
	}
}

func TestHighlightsNewsletterAndOverview(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()

	store := decode[apigen.Store](t, h.call("GET", "/v1/store", "", nil))
	store.Highlights = &[]apigen.Highlight{{Icon: apigen.Cash, Title: "Cash on delivery"}, {Icon: apigen.Truck, Title: "Delivery in 2–3 days"}}
	expect(t, h.call("PUT", "/v1/admin/store", admin.AccessToken, store), 200, "")
	got := decode[apigen.Store](t, h.call("GET", "/v1/store", "", nil))
	if got.Highlights == nil || len(*got.Highlights) != 2 || (*got.Highlights)[0].Title != "Cash on delivery" {
		t.Errorf("highlights %+v", got.Highlights)
	}

	before := decode[apigen.Overview](t, expect2(t, h.call("GET", "/v1/admin/overview", admin.AccessToken, nil), 200))
	email := uniqueEmail()
	expect(t, h.call("POST", "/v1/newsletter", "", map[string]any{"email": email}), 204, "")
	expect(t, h.call("POST", "/v1/newsletter", "", map[string]any{"email": email}), 204, "") // no "already signed up"
	expect(t, h.call("POST", "/v1/newsletter", "", map[string]any{"email": "not-an-email"}), 400, apigen.Validation)

	cat := h.category(admin.AccessToken, "Low", nil)
	h.product(admin.AccessToken, plain("Almost gone "+tag(), 1000, 2, cat.Id))
	after := decode[apigen.Overview](t, h.call("GET", "/v1/admin/overview", admin.AccessToken, nil))
	if after.Subscribers != before.Subscribers+1 || after.Products.Active != before.Products.Active+1 {
		t.Errorf("before %+v after %+v", before, after)
	}
	if len(after.LowStock) == 0 {
		t.Error("a variant with 2 left should be low on stock")
	}
	customer := h.register(uniqueEmail())
	expect(t, h.call("GET", "/v1/admin/overview", customer.AccessToken, nil), 403, apigen.Forbidden)
}
