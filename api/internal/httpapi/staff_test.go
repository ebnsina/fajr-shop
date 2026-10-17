package httpapi_test

import (
	"testing"

	"github.com/google/uuid"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// The "at least one admin" rule isn't exercised: the shared test database always has other admins.
func TestStaff(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)

	expect(t, h.call("GET", "/v1/admin/staff", staff.AccessToken, nil), 403, apigen.Forbidden)
	list := decode[struct{ Items []apigen.StaffMember }](t, expect2(t, h.call("GET", "/v1/admin/staff", admin.AccessToken, nil), 200)).Items
	var sawSelf bool
	for _, m := range list {
		sawSelf = sawSelf || (m.Id == admin.User.Id && m.You)
	}
	if !sawSelf {
		t.Error("the caller isn't marked as themselves")
	}

	email := uniqueEmail()
	body := map[string]any{"name": "Nusrat Jahan", "email": email, "role": "staff", "password": "short"}
	expect(t, h.call("POST", "/v1/admin/staff", admin.AccessToken, body), 400, apigen.Validation)
	body["password"] = "packs-orders-daily"
	added := decode[apigen.StaffMember](t, expect2(t, h.call("POST", "/v1/admin/staff", admin.AccessToken, body), 201))
	if added.Role != apigen.StaffRoleStaff || added.Disabled || added.You {
		t.Errorf("added %+v", added)
	}
	expect(t, h.call("POST", "/v1/admin/staff", admin.AccessToken, body), 409, apigen.AccountExists)

	// They can sign in and work; switched off, their session stops at once and sign-in is refused.
	login := map[string]any{"login": email, "password": "packs-orders-daily"}
	s := decode[apigen.Session](t, expect2(t, h.call("POST", "/v1/auth/login", "", login), 200))
	expect(t, h.call("GET", "/v1/admin/orders", s.AccessToken, nil), 200, "")
	path := "/v1/admin/staff/" + added.Id.String()
	expect(t, h.call("PUT", path, staff.AccessToken, map[string]any{"role": "staff", "disabled": true}), 403, apigen.Forbidden)
	off := decode[apigen.StaffMember](t, expect2(t, h.call("PUT", path, admin.AccessToken, map[string]any{"role": "staff", "disabled": true}), 200))
	if !off.Disabled {
		t.Error("not switched off")
	}
	expect(t, h.call("GET", "/v1/me", s.AccessToken, nil), 401, "")
	expect(t, h.call("POST", "/v1/auth/login", "", login), 401, apigen.InvalidCredentials)

	// Back on as an admin: they get the admin's permissions.
	expect(t, h.call("PUT", path, admin.AccessToken, map[string]any{"role": "admin", "disabled": false}), 200, "")
	s = decode[apigen.Session](t, expect2(t, h.call("POST", "/v1/auth/login", "", login), 200))
	expect(t, h.call("GET", "/v1/admin/staff", s.AccessToken, nil), 200, "")

	// Nobody changes their own access.
	expect(t, h.call("PUT", "/v1/admin/staff/"+admin.User.Id.String(), admin.AccessToken, map[string]any{"role": "staff", "disabled": false}), 400, apigen.Validation)
	expect(t, h.call("PUT", "/v1/admin/staff/"+uniqueID(), admin.AccessToken, map[string]any{"role": "staff", "disabled": false}), 404, apigen.NotFound)
}
func uniqueID() string { return uuid.NewString() }
