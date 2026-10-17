package httpapi_test

import (
	"net/url"
	"slices"
	"strings"
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

func TestHighlightsAndOverview(t *testing.T) {
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

	cat := h.category(admin.AccessToken, "Low", nil)
	h.product(admin.AccessToken, plain("Almost gone "+tag(), 1000, 2, cat.Id))
	after := decode[apigen.Overview](t, h.call("GET", "/v1/admin/overview", admin.AccessToken, nil))
	if after.Products.Active != before.Products.Active+1 {
		t.Errorf("before %+v after %+v", before, after)
	}
	if len(after.LowStock) == 0 {
		t.Error("a variant with 2 left should be low on stock")
	}
	customer := h.register(uniqueEmail())
	expect(t, h.call("GET", "/v1/admin/overview", customer.AccessToken, nil), 403, apigen.Forbidden)
}

func TestFacetsAndMultiFilters(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Tees", nil)
	mk := func(name, brand string, price int, sizes, colors []string) {
		var variants []any
		for _, s := range sizes {
			for _, c := range colors {
				variants = append(variants, map[string]any{"price": price, "stock": 3, "options": map[string]string{"Size": s, "Color": c}})
			}
		}
		h.product(admin.AccessToken, map[string]any{
			"name": name, "status": "active", "category_id": cat.Id.String(), "brand": brand,
			"options":  []any{map[string]any{"name": "Size", "values": sizes}, map[string]any{"name": "Color", "values": colors}},
			"variants": variants,
		})
	}
	mk("Alpha", "Ecstasy", 50000, []string{"M", "L"}, []string{"Red"})
	mk("Beta", "Ecstasy", 90000, []string{"S"}, []string{"Blue"})
	mk("Gamma", "Yellow", 70000, []string{"L"}, []string{"Blue"})

	in := "category=" + cat.Slug
	facets := func(q string) apigen.Facets {
		t.Helper()
		return decode[apigen.Facets](t, expect2(t, h.call("GET", "/v1/products/facets?"+in+q, "", nil), 200))
	}
	count := func(f apigen.Facets, option, value string) int {
		for _, o := range f.Options {
			if o.Name == option {
				for _, v := range o.Values {
					if v.Value == value {
						return v.Count
					}
				}
			}
		}
		return 0
	}

	all := facets("")
	if len(all.Brands) != 2 || all.Brands[0].Name != "Ecstasy" || all.Brands[0].Count != 2 {
		t.Errorf("brands %+v", all.Brands)
	}
	if all.Total != 3 {
		t.Errorf("total %d, want 3", all.Total)
	}
	if count(all, "Size", "L") != 2 || count(all, "Color", "Blue") != 2 || all.Price.Min != 50000 || all.Price.Max != 90000 {
		t.Errorf("all facets %+v", all)
	}

	if len(all.Categories) != 1 || all.Categories[0].Slug != cat.Slug || all.Categories[0].Count != 3 {
		t.Errorf("categories should stay inside the filter: %+v", all.Categories)
	}

	// Picking a brand narrows the other groups but not the brand list itself.
	ecstasy := facets("&brand=Ecstasy")
	if len(ecstasy.Brands) != 2 || count(ecstasy, "Color", "Blue") != 1 || count(ecstasy, "Size", "L") != 1 {
		t.Errorf("with brand %+v", ecstasy)
	}

	names := func(q string) []string {
		t.Helper()
		page := decode[apigen.ProductPage](t, expect2(t, h.call("GET", "/v1/products?sort=name&"+in+q, "", nil), 200))
		var out []string
		for _, p := range page.Items {
			out = append(out, p.Name)
		}
		return out
	}
	tests := []struct{ q, want string }{
		{"&brand=Ecstasy&brand=Yellow", "Alpha Beta Gamma"},
		{"&option=Size:S&option=Size:M", "Alpha Beta"}, // any of one option's values
		{"&option=Size:L&option=Color:Blue", "Gamma"},  // both options on one variant
		{"&option=Size:M&option=Color:Blue", ""},       // no single variant is a blue M
		{"&brand=Ecstasy&option=Color:Red&option=Color:Blue", "Alpha Beta"},
	}
	for _, tt := range tests {
		if got := strings.Join(names(tt.q), " "); got != tt.want {
			t.Errorf("%s: got %q, want %q", tt.q, got, tt.want)
		}
	}
	none := decode[apigen.Facets](t, expect2(t, h.call("GET", "/v1/products/facets?category=no-such-"+tag(), "", nil), 200))
	if len(none.Brands) != 0 || none.Price != nil {
		t.Errorf("unknown category should have no facets: %+v", none)
	}
}
