package httpapi_test

import (
	"strings"
	"testing"
	"time"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func TestDiscounts(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	cat := h.category(admin.AccessToken, "Dates", nil)
	ajwa := h.product(admin.AccessToken, plain("Ajwa", 150000, 9, cat.Id)).Variants[0].Id.String()

	code := func(body map[string]any) apigen.Discount {
		t.Helper()
		return decode[apigen.Discount](t, expect2(t, h.call("POST", "/v1/admin/discounts", admin.AccessToken, body), 201))
	}
	eid := "eid" + tag()
	capped := code(map[string]any{"code": eid, "kind": "percent", "value": 10, "max_discount": 20000, "min_subtotal": 200000, "description": "Eid treat"})
	if capped.Code != strings.ToUpper(eid) || *capped.MaxDiscount != 20000 || !capped.Active {
		t.Fatalf("saved %+v", capped)
	}

	// Who may manage codes, and what's refused.
	staff := h.member(dbq.UserRoleStaff)
	expect(t, h.call("GET", "/v1/admin/discounts", staff.AccessToken, nil), 403, apigen.Forbidden)
	e := expect(t, h.call("POST", "/v1/admin/discounts", admin.AccessToken, map[string]any{"code": strings.ToUpper(eid), "kind": "fixed", "value": 100}), 400, apigen.Validation)
	if (*e.Error.Fields)["code"] == "" {
		t.Errorf("same code in other case must clash: %v", e.Error)
	}
	expect(t, h.call("POST", "/v1/admin/discounts", admin.AccessToken, map[string]any{"code": "X" + tag(), "kind": "percent", "value": 150}), 400, apigen.Validation)
	expect(t, h.call("POST", "/v1/admin/discounts", admin.AccessToken, map[string]any{"code": "has space", "kind": "fixed", "value": 100}), 400, apigen.Validation)

	// A guest with no cart yet gets one by applying a code; below the minimum it waits.
	cart := decode[apigen.Cart](t, expect2(t, h.cartCall("PUT", "/v1/cart/discount", "", "", map[string]any{"code": eid}), 200))
	if cart.Token == nil || cart.Discount == nil || cart.Discount.Applies || *cart.Discount.Reason != apigen.BelowMinimum || cart.Discount.MinSubtotal != 200000 {
		t.Fatalf("below minimum: %+v", cart)
	}
	token := *cart.Token
	cart = h.setItem("", token, ajwa, 1)
	if cart.Discount.Applies || cart.Total != 150000 {
		t.Errorf("one box is under the minimum: %+v", cart.Discount)
	}
	// 10% of ৳3,000 is ৳300, capped at ৳200.
	cart = h.setItem("", token, ajwa, 2)
	if !cart.Discount.Applies || cart.DiscountTotal != 20000 || cart.Total != 280000 || *cart.Discount.Description != "Eid treat" {
		t.Errorf("capped: %+v %+v", cart, cart.Discount)
	}

	// Codes that can't be used are refused with a reason.
	ended := code(map[string]any{"code": "OLD" + tag(), "kind": "fixed", "value": 5000, "starts_at": time.Now().Add(-48 * time.Hour), "ends_at": time.Now().Add(-time.Hour)})
	off := code(map[string]any{"code": "OFF" + tag(), "kind": "fixed", "value": 5000, "active": false})
	for c, want := range map[string]string{ended.Code: "That code has ended.", off.Code: "That code isn't valid. Check it and try again.", "NOPE" + tag(): "That code isn't valid. Check it and try again."} {
		e := expect(t, h.cartCall("PUT", "/v1/cart/discount", "", token, map[string]any{"code": c}), 400, apigen.Validation)
		if (*e.Error.Fields)["code"] != want {
			t.Errorf("%s: %v", c, *e.Error.Fields)
		}
	}

	// Switching a code off after it's on a cart stops it applying, but the shopper sees why.
	upd := map[string]any{"code": eid, "kind": "percent", "value": 10, "max_discount": 20000, "min_subtotal": 200000, "active": false}
	expect(t, h.call("PUT", "/v1/admin/discounts/"+capped.Id.String(), admin.AccessToken, upd), 200, "")
	cart = decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", "", token, nil))
	if cart.Discount.Applies || *cart.Discount.Reason != apigen.Inactive || cart.Total != cart.Subtotal {
		t.Errorf("switched off: %+v", cart.Discount)
	}
	upd["active"] = true
	expect(t, h.call("PUT", "/v1/admin/discounts/"+capped.Id.String(), admin.AccessToken, upd), 200, "")

	// Signing in brings the guest's code along.
	customer := h.register("d" + tag() + "@example.com")
	merged := decode[apigen.Cart](t, expect2(t, h.cartCall("POST", "/v1/cart/merge", customer.AccessToken, "", map[string]any{"cart_token": token}), 200))
	if merged.Discount == nil || merged.Discount.Code != capped.Code || merged.DiscountTotal != 20000 {
		t.Fatalf("merged: %+v", merged)
	}

	// Taking it off, and deleting a code, both leave the cart without one.
	cart = decode[apigen.Cart](t, expect2(t, h.cartCall("DELETE", "/v1/cart/discount", customer.AccessToken, "", nil), 200))
	if cart.Discount != nil || cart.Total != cart.Subtotal {
		t.Errorf("removed: %+v", cart)
	}
	expect(t, h.cartCall("PUT", "/v1/cart/discount", customer.AccessToken, "", map[string]any{"code": strings.ToLower(eid)}), 200, "")
	expect(t, h.call("DELETE", "/v1/admin/discounts/"+capped.Id.String(), admin.AccessToken, nil), 204, "")
	cart = decode[apigen.Cart](t, h.cartCall("GET", "/v1/cart", customer.AccessToken, "", nil))
	if cart.Discount != nil {
		t.Errorf("deleted code still on cart: %+v", cart.Discount)
	}
	expect(t, h.call("DELETE", "/v1/admin/discounts/"+capped.Id.String(), admin.AccessToken, nil), 404, apigen.NotFound)

	list := decode[struct{ Items []apigen.Discount }](t, expect2(t, h.call("GET", "/v1/admin/discounts", admin.AccessToken, nil), 200))
	if len(list.Items) < 2 {
		t.Errorf("list: %d", len(list.Items))
	}
}
