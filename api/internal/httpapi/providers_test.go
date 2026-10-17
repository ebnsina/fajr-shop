package httpapi_test

import (
	"bytes"
	"testing"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func TestProviders(t *testing.T) {
	h := newHarness(t)
	// Providers belong to the whole shop; this test is the only one that sets them up.
	if _, err := h.pool.Exec(t.Context(), "DELETE FROM providers"); err != nil {
		t.Fatal(err)
	}
	admin := h.admin()
	staff := h.member(dbq.UserRoleStaff)
	expect(t, h.call("GET", "/v1/admin/providers", staff.AccessToken, nil), 403, apigen.Forbidden)

	list := decode[struct{ Items []apigen.Provider }](t, expect2(t, h.call("GET", "/v1/admin/providers", admin.AccessToken, nil), 200))
	if len(list.Items) < 10 || list.Items[0].Configured || list.Items[0].Enabled {
		t.Fatalf("fresh providers %+v", list.Items[0])
	}

	put := func(code string, body map[string]any) *apigen.Provider {
		t.Helper()
		rec := h.call("PUT", "/v1/admin/providers/"+code, admin.AccessToken, body)
		if rec.Code != 200 {
			return nil
		}
		p := decode[apigen.Provider](t, rec)
		return &p
	}

	// Switching on needs every required field; the refusal names the missing ones.
	e := expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": true, "live": false, "values": map[string]string{"api_key": "sf-key"},
	}), 400, apigen.Validation)
	if (*e.Error.Fields)["secret_key"] == "" {
		t.Errorf("missing secret_key not named: %v", *e.Error.Fields)
	}
	expect(t, h.call("PUT", "/v1/admin/providers/steadfast", admin.AccessToken, map[string]any{
		"enabled": false, "live": false, "values": map[string]string{"nonsense": "x"},
	}), 400, apigen.Validation)
	expect(t, h.call("PUT", "/v1/admin/providers/dhl", admin.AccessToken, map[string]any{"enabled": false, "live": false}), 404, apigen.NotFound)

	sf := put("steadfast", map[string]any{"enabled": true, "live": true, "values": map[string]string{"api_key": "sf-key", "secret_key": "sf-secret"}})
	if sf == nil || !sf.Enabled || !sf.Configured || !sf.Fields[0].Set || sf.Fields[0].Value != nil {
		t.Fatalf("steadfast after save %+v", sf)
	}
	// An empty secret keeps the saved one, so the form can be saved without retyping keys.
	if sf = put("steadfast", map[string]any{"enabled": true, "live": false, "values": map[string]string{"api_key": "", "secret_key": ""}}); sf == nil || !sf.Configured || sf.Live {
		t.Fatalf("resave with empty secrets %+v", sf)
	}

	ssl := put("sslcommerz", map[string]any{"enabled": false, "live": false, "values": map[string]string{"store_id": "fajr01", "store_password": "pw"}})
	if ssl == nil || ssl.Fields[0].Value == nil || *ssl.Fields[0].Value != "fajr01" || ssl.Fields[1].Value != nil {
		t.Fatalf("store id should read back, password not: %+v", ssl)
	}

	// The database row holds no key in the clear.
	var settings, secrets []byte
	if err := h.pool.QueryRow(t.Context(), "SELECT settings, secrets FROM providers WHERE code = 'steadfast'").Scan(&settings, &secrets); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(secrets, []byte("sf-secret")) || bytes.Contains(settings, []byte("sf-")) {
		t.Fatal("a secret is stored readable")
	}

	// One SMS gateway at a time.
	put("bulksmsbd", map[string]any{"enabled": true, "live": true, "values": map[string]string{"api_key": "k", "sender_id": "8809617"}})
	put("sslwireless", map[string]any{"enabled": true, "live": true, "values": map[string]string{"api_token": "t", "sid": "FAJR"}})
	list = decode[struct{ Items []apigen.Provider }](t, expect2(t, h.call("GET", "/v1/admin/providers", admin.AccessToken, nil), 200))
	on := map[string]bool{}
	for _, p := range list.Items {
		on[p.Code] = p.Enabled
	}
	if on["bulksmsbd"] || !on["sslwireless"] || !on["steadfast"] {
		t.Errorf("enabled after switching SMS gateways: %v", on)
	}
}
