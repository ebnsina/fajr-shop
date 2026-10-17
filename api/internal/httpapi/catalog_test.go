package httpapi_test

import (
	"bytes"
	"image"
	"image/png"
	"mime/multipart"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func tag() string { return strings.ReplaceAll(uuid.NewString()[:8], "-", "") }

func (h *harness) category(token, name string, parent *uuid.UUID) apigen.Category {
	h.t.Helper()
	body := map[string]any{"name": name, "slug": "c-" + tag()}
	if parent != nil {
		body["parent_id"] = parent.String()
	}
	rec := h.call("POST", "/v1/admin/categories", token, body)
	expect(h.t, rec, 201, "")
	return decode[apigen.Category](h.t, rec)
}

func (h *harness) product(token string, body map[string]any) apigen.Product {
	h.t.Helper()
	rec := h.call("POST", "/v1/admin/products", token, body)
	expect(h.t, rec, 201, "")
	return decode[apigen.Product](h.t, rec)
}

func plain(name string, price, stock int, category uuid.UUID) map[string]any {
	return map[string]any{
		"name": name, "status": "active", "category_id": category.String(), "options": []any{},
		"variants": []any{map[string]any{"price": price, "stock": stock, "options": map[string]string{}}},
	}
}

func TestCategories(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	customer := h.register(uniqueEmail())

	expect(t, h.call("POST", "/v1/admin/categories", customer.AccessToken, map[string]any{"name": "Nope"}), 403, apigen.Forbidden)

	men := h.category(admin.AccessToken, "Men", nil)
	panjabi := h.category(admin.AccessToken, "Panjabi", &men.Id)
	if *panjabi.ParentId != men.Id {
		t.Fatal("parent not kept")
	}

	// A category can't move under its own child.
	e := expect(t, h.call("PUT", "/v1/admin/categories/"+men.Id.String(), admin.AccessToken,
		map[string]any{"name": "Men", "parent_id": panjabi.Id.String()}), 400, apigen.Validation)
	if (*e.Error.Fields)["parent_id"] == "" {
		t.Error("loop not reported on parent_id")
	}

	expect(t, h.call("DELETE", "/v1/admin/categories/"+men.Id.String(), admin.AccessToken, nil), 409, apigen.InUse)
	expect(t, h.call("DELETE", "/v1/admin/categories/"+panjabi.Id.String(), admin.AccessToken, nil), 204, "")
	expect(t, h.call("DELETE", "/v1/admin/categories/"+panjabi.Id.String(), admin.AccessToken, nil), 404, apigen.NotFound)

	list := decode[struct{ Items []apigen.Category }](t, expect2(t, h.call("GET", "/v1/categories", "", nil), 200))
	if !slices.ContainsFunc(list.Items, func(c apigen.Category) bool { return c.Id == men.Id }) {
		t.Error("new category not listed")
	}
}

func TestProductLifecycle(t *testing.T) {
	h := newHarness(t)
	staff := h.member(dbq.UserRoleStaff)
	cat := h.category(staff.AccessToken, "Panjabi", nil)
	sku := "PJ-" + tag()

	body := map[string]any{
		"name": "Cotton Panjabi", "description": "Hand-stitched.", "status": "draft", "category_id": cat.Id.String(),
		"options": []any{map[string]any{"name": "Size", "values": []string{"M", "L"}}},
		"variants": []any{
			map[string]any{"sku": sku, "price": 250000, "compare_at_price": 300000, "stock": 4, "options": map[string]string{"Size": "M"}},
			map[string]any{"price": 270000, "stock": 0, "options": map[string]string{"Size": "L"}},
		},
	}
	p := h.product(staff.AccessToken, body)
	if !strings.HasPrefix(p.Slug, "cotton-panjabi") || len(p.Variants) != 2 || p.Variants[0].Stock != 4 {
		t.Fatalf("created %+v", p)
	}

	// Drafts are not for sale.
	expect(t, h.call("GET", "/v1/products/"+p.Slug, "", nil), 404, apigen.NotFound)

	// Same name again gets its own address.
	other := h.product(staff.AccessToken, plain("Cotton Panjabi", 100, 0, cat.Id))
	if other.Slug == p.Slug {
		t.Error("slug reused")
	}

	// A SKU belongs to one variant in the whole shop.
	dup := plain("Copy", 100, 0, cat.Id)
	dup["variants"].([]any)[0].(map[string]any)["sku"] = sku
	expect(t, h.call("POST", "/v1/admin/products", staff.AccessToken, dup), 400, apigen.Validation)

	// Publish, reprice M, drop L, add XL. M's stock stays at 4 even though the form says 99.
	body["status"] = "active"
	body["options"] = []any{map[string]any{"name": "Size", "values": []string{"M", "XL"}}}
	body["variants"] = []any{
		map[string]any{"id": p.Variants[0].Id.String(), "sku": sku, "price": 240000, "stock": 99, "options": map[string]string{"Size": "M"}},
		map[string]any{"price": 290000, "stock": 2, "options": map[string]string{"Size": "XL"}},
	}
	rec := h.call("PUT", "/v1/admin/products/"+p.Id.String(), staff.AccessToken, body)
	expect(t, rec, 200, "")
	got := decode[apigen.Product](t, h.call("GET", "/v1/products/"+p.Slug, "", nil))
	if len(got.Variants) != 2 || got.Variants[0].Price != 240000 || got.Variants[0].Stock != 4 || got.Variants[1].Stock != 2 {
		t.Fatalf("after update %+v", got.Variants)
	}

	// Every variant must name one value per option.
	body["variants"] = []any{map[string]any{"price": 1, "options": map[string]string{}}}
	e := expect(t, h.call("PUT", "/v1/admin/products/"+p.Id.String(), staff.AccessToken, body), 400, apigen.Validation)
	if (*e.Error.Fields)["variants.0.options"] == "" {
		t.Errorf("fields = %v", *e.Error.Fields)
	}

	expect(t, h.call("DELETE", "/v1/admin/products/"+p.Id.String(), staff.AccessToken, nil), 204, "")
	expect(t, h.call("GET", "/v1/admin/products/"+p.Id.String(), staff.AccessToken, nil), 404, apigen.NotFound)
}

func TestStockAdjustments(t *testing.T) {
	h := newHarness(t)
	staff := h.member(dbq.UserRoleStaff)
	customer := h.register(uniqueEmail())
	cat := h.category(staff.AccessToken, "Attar", nil)
	p := h.product(staff.AccessToken, plain("Oud", 150000, 3, cat.Id))
	path := "/v1/admin/variants/" + p.Variants[0].Id.String() + "/stock-adjustments"

	v := decode[apigen.Variant](t, expect2(t, h.call("POST", path, staff.AccessToken, map[string]any{"delta": 5, "reason": "received"}), 200))
	if v.Stock != 8 {
		t.Errorf("stock %d, want 8", v.Stock)
	}
	expect(t, h.call("POST", path, staff.AccessToken, map[string]any{"delta": -9, "reason": "damaged"}), 409, apigen.InsufficientStock)
	expect(t, h.call("POST", path, staff.AccessToken, map[string]any{"delta": 0, "reason": "correction"}), 400, apigen.Validation)
	expect(t, h.call("POST", path, customer.AccessToken, map[string]any{"delta": 1, "reason": "received"}), 403, apigen.Forbidden)
	expect(t, h.call("POST", "/v1/admin/variants/"+uuid.NewString()+"/stock-adjustments", staff.AccessToken,
		map[string]any{"delta": 1, "reason": "received"}), 404, apigen.NotFound)
}

func TestProductListFiltersSortsAndPages(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	parent := h.category(admin.AccessToken, "Clothing", nil)
	child := h.category(admin.AccessToken, "Saree", &parent.Id)
	word := "zx" + tag()

	h.product(admin.AccessToken, plain("Jamdani "+word, 900000, 1, child.Id))
	h.product(admin.AccessToken, plain("Tangail", 300000, 0, child.Id))
	h.product(admin.AccessToken, plain("Katan", 600000, 2, parent.Id))
	h.product(admin.AccessToken, plain("Muslin", 1200000, 5, parent.Id))
	colors := h.product(admin.AccessToken, map[string]any{
		"name": "Gamcha", "status": "active", "category_id": parent.Id.String(),
		"options": []any{map[string]any{"name": "Color", "values": []string{"Red", "Green"}}},
		"variants": []any{
			map[string]any{"price": 50000, "stock": 0, "options": map[string]string{"Color": "Red"}},
			map[string]any{"price": 60000, "stock": 1, "options": map[string]string{"Color": "Green"}},
		},
	})
	draft := plain("Hidden", 100, 1, parent.Id)
	draft["status"] = "draft"
	h.product(admin.AccessToken, draft)

	names := func(query string) []string {
		t.Helper()
		var all []string
		cursor := ""
		for page := 0; page < 10; page++ {
			q := query + "&limit=2"
			if cursor != "" {
				q += "&cursor=" + url.QueryEscape(cursor)
			}
			got := decode[apigen.ProductPage](t, expect2(t, h.call("GET", "/v1/products?"+q, "", nil), 200))
			for _, p := range got.Items {
				all = append(all, p.Name)
			}
			if got.NextCursor == nil {
				return all
			}
			cursor = *got.NextCursor
		}
		t.Fatal("more than 10 pages")
		return nil
	}
	in := "category=" + parent.Slug
	tests := []struct {
		query string
		want  []string
	}{
		{in + "&sort=price_asc", []string{"Gamcha", "Tangail", "Katan", "Jamdani " + word, "Muslin"}},
		{in + "&sort=price_desc", []string{"Muslin", "Jamdani " + word, "Katan", "Tangail", "Gamcha"}},
		{in + "&sort=name", []string{"Gamcha", "Jamdani " + word, "Katan", "Muslin", "Tangail"}},
		{in + "&sort=newest", []string{"Gamcha", "Muslin", "Katan", "Tangail", "Jamdani " + word}},
		{"category=" + child.Slug + "&sort=name", []string{"Jamdani " + word, "Tangail"}},
		{in + "&in_stock=true&sort=name", []string{"Gamcha", "Jamdani " + word, "Katan", "Muslin"}},
		{in + "&min_price=500000&max_price=1000000&sort=name", []string{"Jamdani " + word, "Katan"}},
		{in + "&option=Color:Green", []string{"Gamcha"}},
		{in + "&option=Color:Blue", nil},
		{"q=" + word, []string{"Jamdani " + word}},
		{"q=" + word[:5], []string{"Jamdani " + word}}, // part of a word still matches the name
		{"category=no-such-" + tag(), nil},
	}
	for _, tt := range tests {
		if got := names(tt.query); !slices.Equal(got, tt.want) {
			t.Errorf("%s:\n got  %v\n want %v", tt.query, got, tt.want)
		}
	}

	page := decode[apigen.ProductPage](t, h.call("GET", "/v1/products?option=Color:Green&"+in, "", nil))
	if s := page.Items[0]; s.Id != colors.Id || s.PriceMin != 50000 || s.PriceMax != 60000 || !s.InStock {
		t.Errorf("summary %+v", s)
	}

	// A cursor from one sort can't be used with another.
	first := decode[apigen.ProductPage](t, h.call("GET", "/v1/products?limit=1&sort=name&"+in, "", nil))
	expect(t, h.call("GET", "/v1/products?sort=price_asc&cursor="+url.QueryEscape(*first.NextCursor)+"&"+in, "", nil), 400, apigen.Validation)

	admins := decode[apigen.ProductPage](t, expect2(t, h.call("GET", "/v1/admin/products?status=draft&q=Hidden", admin.AccessToken, nil), 200))
	if len(admins.Items) == 0 || admins.Items[0].Status != apigen.Draft {
		t.Errorf("admin list = %+v", admins.Items)
	}
}

func (h *harness) upload(token, filename string, data []byte) *httptest.ResponseRecorder {
	h.t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		h.t.Fatal(err)
	}
	fw.Write(data)
	mw.Close()
	req := httptest.NewRequest("POST", "/v1/admin/uploads", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	return h.send(req)
}

func TestUploadsAndProductImages(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()

	var pngBytes bytes.Buffer
	if err := png.Encode(&pngBytes, image.NewRGBA(image.Rect(0, 0, 40, 30))); err != nil {
		t.Fatal(err)
	}
	rec := h.upload(admin.AccessToken, "photo.png", pngBytes.Bytes())
	expect(t, rec, 201, "")
	img := decode[apigen.Image](t, rec)
	if img.Width != 40 || img.Height != 30 || !strings.HasPrefix(img.Url, "http://media.test/") {
		t.Fatalf("image %+v", img)
	}

	served := h.send(httptest.NewRequest("GET", "/media/"+strings.TrimPrefix(img.Url, "http://media.test/"), nil))
	if served.Code != 200 || !strings.Contains(served.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("serving: %d %v", served.Code, served.Header())
	}
	if rec := h.send(httptest.NewRequest("GET", "/media/", nil)); rec.Code != 404 {
		t.Errorf("directory listing: status %d", rec.Code)
	}

	expect(t, h.upload(admin.AccessToken, "notes.png", []byte("just text, not an image")), 415, apigen.UnsupportedType)
	expect(t, h.upload(admin.AccessToken, "huge.png", make([]byte, 11<<20)), 413, apigen.TooLarge)

	cat := h.category(admin.AccessToken, "Prints", nil)
	body := plain("Calligraphy print", 80000, 1, cat.Id)
	body["image_ids"] = []string{img.Id.String()}
	p := h.product(admin.AccessToken, body)
	if len(p.Images) != 1 || p.Images[0].Id != img.Id {
		t.Fatalf("images %+v", p.Images)
	}
	list := decode[apigen.ProductPage](t, h.call("GET", "/v1/products?category="+cat.Slug, "", nil))
	if list.Items[0].Image == nil || list.Items[0].Image.Id != img.Id {
		t.Errorf("summary image %+v", list.Items[0].Image)
	}

	body["image_ids"] = []string{uuid.NewString()}
	expect(t, h.call("PUT", "/v1/admin/products/"+p.Id.String(), admin.AccessToken, body), 400, apigen.Validation)
}

func TestValidationMessagesArePlain(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	body := map[string]any{
		"name": "x", "status": "active", "options": []any{},
		"variants": []any{map[string]any{"price": nil, "options": map[string]string{}}},
	}
	e := expect(t, h.call("POST", "/v1/admin/products", admin.AccessToken, body), 400, apigen.Validation)
	if got := (*e.Error.Fields)["variants.0.price"]; got != "Fill this in." {
		t.Errorf("fields = %v", *e.Error.Fields)
	}
	body["variants"] = []any{map[string]any{"price": 100, "options": map[string]string{}}}
	delete(body, "status")
	e = expect(t, h.call("POST", "/v1/admin/products", admin.AccessToken, body), 400, apigen.Validation)
	if got := (*e.Error.Fields)["status"]; got != "Fill this in." {
		t.Errorf("missing property: fields = %v", *e.Error.Fields)
	}
}
