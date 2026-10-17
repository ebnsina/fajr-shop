package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
)

// cartCall sends a cart request as a guest holding cartToken, or as the signed-in owner of access.
func (h *harness) cartCall(method, path, access, cartToken string, body any) *httptest.ResponseRecorder {
	h.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			h.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if access != "" {
		req.Header.Set("Authorization", "Bearer "+access)
	}
	if cartToken != "" {
		req.Header.Set("X-Cart-Token", cartToken)
	}
	return h.send(req)
}

func (h *harness) setItem(access, cartToken, variant string, qty int) apigen.Cart {
	h.t.Helper()
	rec := h.cartCall("PUT", "/v1/cart/items/"+variant, access, cartToken, map[string]any{"quantity": qty})
	expect(h.t, rec, 200, "")
	return decode[apigen.Cart](h.t, rec)
}

func TestGuestCart(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Attar", nil)
	oud := h.product(admin.AccessToken, plain("Oud", 150000, 3, cat.Id)).Variants[0].Id.String()
	musk := h.product(admin.AccessToken, plain("Musk", 90000, 5, cat.Id)).Variants[0].Id.String()

	empty := decode[apigen.Cart](t, expect2(t, h.cartCall("GET", "/v1/cart", "", "", nil), 200))
	if len(empty.Items) != 0 || empty.Token != nil {
		t.Fatalf("no cart yet: %+v", empty)
	}

	// A one-variant product says which variant a list can add straight to the bag.
	listed := decode[apigen.ProductPage](t, h.call("GET", "/v1/products?category="+cat.Slug+"&sort=name", "", nil)).Items
	if len(listed) != 2 || listed[1].SingleVariantId == nil || listed[1].SingleVariantId.String() != oud {
		t.Errorf("single variant: %+v", listed)
	}

	first := h.setItem("", "", oud, 2)
	if first.Token == nil {
		t.Fatal("a new guest cart must hand back its token")
	}
	token := *first.Token
	cart := h.setItem("", token, musk, 1)
	if cart.Token != nil || cart.ItemCount != 3 || cart.Subtotal != 2*150000+90000 {
		t.Fatalf("cart %+v", cart)
	}

	// More than in stock is refused, and says how many are left.
	e := expect(t, h.cartCall("PUT", "/v1/cart/items/"+oud, "", token, map[string]any{"quantity": 4}), 409, apigen.InsufficientStock)
	if (*e.Error.Fields)["quantity"] != "Only 3 left." {
		t.Errorf("fields = %v", *e.Error.Fields)
	}

	// Prices are today's, and a line that can no longer be bought leaves the subtotal.
	expect(t, h.call("POST", "/v1/admin/variants/"+oud+"/stock-adjustments", admin.AccessToken, map[string]any{"delta": -2, "reason": "damaged"}), 200, "")
	got := decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", "", token, nil))
	if got.Items[0].Purchasable || got.Subtotal != 90000 {
		t.Errorf("after stock fell: %+v", got)
	}

	cart = h.setItem("", token, oud, 0)
	if len(cart.Items) != 1 || cart.Items[0].Name != "Musk" {
		t.Errorf("after removing: %+v", cart.Items)
	}

	// Unknown tokens just mean no cart.
	if c := decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", "", "fsc_nonsense", nil)); len(c.Items) != 0 {
		t.Error("a made-up token found a cart")
	}
}

func TestCartRefusals(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Hidden", nil)
	draft := plain("Draft", 100, 5, cat.Id)
	draft["status"] = "draft"
	v := h.product(admin.AccessToken, draft).Variants[0].Id.String()

	expect(t, h.cartCall("PUT", "/v1/cart/items/"+v, "", "", map[string]any{"quantity": 1}), 404, apigen.NotFound)

	rec := h.call("POST", "/v1/admin/api-keys", admin.AccessToken, map[string]any{"name": "Sync", "scopes": []string{"catalog:write"}})
	key := decode[apigen.ApiKeyCreated](t, rec).Key
	expect(t, h.cartCall("GET", "/v1/cart", key, "", nil), 403, apigen.Forbidden)
	expect(t, h.cartCall("GET", "/v1/cart", "fsa_expired", "", nil), 401, apigen.SessionExpired)
}

func TestSignInMergesTheGuestCart(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Panjabi", nil)
	a := h.product(admin.AccessToken, plain("A", 1000, 10, cat.Id)).Variants[0].Id.String()
	b := h.product(admin.AccessToken, plain("B", 2000, 10, cat.Id)).Variants[0].Id.String()

	customer := h.register(uniqueEmail())
	mine := h.setItem(customer.AccessToken, "", a, 1)
	if mine.Token != nil {
		t.Error("a customer's cart has no token")
	}

	guest := *h.setItem("", "", a, 2).Token
	h.setItem("", guest, b, 1)

	rec := h.call("POST", "/v1/cart/merge", customer.AccessToken, map[string]any{"cart_token": guest})
	merged := decode[apigen.Cart](t, expect2(t, rec, 200))
	if merged.ItemCount != 4 || merged.Subtotal != 3*1000+2000 {
		t.Fatalf("merged %+v", merged)
	}
	if c := decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", "", guest, nil)); len(c.Items) != 0 {
		t.Error("the guest cart should be gone after merging")
	}
	// Merging again (a retried request) changes nothing.
	again := decode[apigen.Cart](t, h.call("POST", "/v1/cart/merge", customer.AccessToken, map[string]any{"cart_token": guest}))
	if again.ItemCount != 4 {
		t.Errorf("second merge: %+v", again)
	}
}
