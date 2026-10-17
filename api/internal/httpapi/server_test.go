package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/config"
	"github.com/ebnsina/fajr-shop/api/internal/db"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/httpapi"
)

type harness struct {
	t       *testing.T
	pool    *pgxpool.Pool
	handler http.Handler
	router  routers.Router
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	url := os.Getenv("FAJR_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("FAJR_TEST_DATABASE_URL not set")
	}
	pool, err := db.Open(t.Context(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if err := db.Migrate(t.Context(), pool); err != nil {
		t.Fatal(err)
	}
	h, err := httpapi.New(pool, config.Config{})
	if err != nil {
		t.Fatal(err)
	}
	spec, err := apigen.GetSpec()
	if err != nil {
		t.Fatal(err)
	}
	spec.Servers = nil
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		t.Fatal(err)
	}
	return &harness{t: t, pool: pool, handler: h, router: router}
}

// call sends a request and fails the test if the response breaks the spec.
func (h *harness) call(method, path, token string, body any) *httptest.ResponseRecorder {
	h.t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			h.t.Fatal(err)
		}
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(buf.Bytes()))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return h.send(req)
}

func (h *harness) send(req *http.Request) *httptest.ResponseRecorder {
	h.t.Helper()
	rec := httptest.NewRecorder()
	h.handler.ServeHTTP(rec, req)

	route, params, err := h.router.FindRoute(req)
	if err != nil {
		return rec // not in the spec, so there is no contract to check
	}
	in := &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{Request: req, PathParams: params, Route: route},
		Status:                 rec.Code,
		Header:                 rec.Header(),
		Options:                &openapi3filter.Options{IncludeResponseStatus: true},
	}
	in.SetBodyBytes(rec.Body.Bytes())
	if err := openapi3filter.ValidateResponse(h.t.Context(), in); err != nil {
		h.t.Errorf("%s %s: response breaks the spec: %v\n%s", req.Method, req.URL, err, rec.Body)
	}
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %s: %v", rec.Body, err)
	}
	return v
}

// expect fails unless the response has this status and, for errors, this code.
func expect(t *testing.T, rec *httptest.ResponseRecorder, status int, code apigen.ErrorCode) apigen.Error {
	t.Helper()
	if rec.Code != status {
		t.Fatalf("status %d, want %d: %s", rec.Code, status, rec.Body)
	}
	if code == "" {
		return apigen.Error{}
	}
	e := decode[apigen.Error](t, rec)
	if e.Error.Code != code {
		t.Fatalf("code %q, want %q", e.Error.Code, code)
	}
	return e
}

func uniqueEmail() string { return fmt.Sprintf("u-%s@example.com", uuid.NewString()[:8]) }

func (h *harness) register(email string) apigen.Session {
	h.t.Helper()
	rec := h.call("POST", "/v1/auth/register", "", map[string]any{"name": "Ibn Battuta", "email": email, "password": "travels-far"})
	expect(h.t, rec, 201, "")
	return decode[apigen.Session](h.t, rec)
}

// admin creates an admin directly, as `fajr create-admin` does, and signs in.
func (h *harness) admin() apigen.Session {
	h.t.Helper()
	email := uniqueEmail()
	hash, err := auth.HashPassword("admin-password")
	if err != nil {
		h.t.Fatal(err)
	}
	if _, err := dbq.New(h.pool).CreateUser(h.t.Context(), dbq.CreateUserParams{
		Role: dbq.UserRoleAdmin, Name: "Al-Khwarizmi", Email: &email, PasswordHash: hash,
	}); err != nil {
		h.t.Fatal(err)
	}
	rec := h.call("POST", "/v1/auth/login", "", map[string]any{"login": email, "password": "admin-password"})
	expect(h.t, rec, 200, "")
	return decode[apigen.Session](h.t, rec)
}

func TestHealth(t *testing.T) {
	h := newHarness(t)
	expect(t, h.call("GET", "/v1/health", "", nil), 200, "")
}

func TestStoreIsCacheable(t *testing.T) {
	h := newHarness(t)
	rec := h.call("GET", "/v1/store", "", nil)
	expect(t, rec, 200, "")
	if store := decode[apigen.Store](t, rec); store.Name == "" || store.Currency != "BDT" {
		t.Errorf("unexpected store %+v", store)
	}
	req := httptest.NewRequest("GET", "/v1/store", nil)
	req.Header.Set("If-None-Match", rec.Header().Get("ETag"))
	if rec := h.send(req); rec.Code != 304 {
		t.Errorf("matching ETag: status %d, want 304", rec.Code)
	}
}

func TestErrorsUseOneShape(t *testing.T) {
	h := newHarness(t)
	expect(t, h.call("GET", "/v1/nope", "", nil), 404, apigen.NotFound)
	expect(t, h.call("DELETE", "/v1/store", "", nil), 405, apigen.MethodNotAllowed)
	e := expect(t, h.call("POST", "/v1/auth/login", "", map[string]any{"login": "x"}), 400, apigen.Validation)
	if e.Error.Fields == nil {
		t.Error("validation error has no fields")
	}
}

func TestRegisterSignInAndOut(t *testing.T) {
	h := newHarness(t)
	email := uniqueEmail()
	s := h.register(email)

	me := decode[apigen.User](t, expect2(t, h.call("GET", "/v1/me", s.AccessToken, nil), 200))
	if string(*me.Email) != email || me.Role != apigen.Customer || len(me.Permissions) != 0 {
		t.Errorf("me = %+v", me)
	}

	expect(t, h.call("POST", "/v1/auth/register", "", map[string]any{"name": "Again", "email": strings.ToUpper(email), "password": "travels-far"}), 409, apigen.AccountExists)
	expect(t, h.call("POST", "/v1/auth/register", "", map[string]any{"name": "Nobody", "password": "travels-far"}), 400, apigen.Validation)
	expect(t, h.call("POST", "/v1/auth/register", "", map[string]any{"name": "Bad", "phone": "01212345678", "password": "travels-far"}), 400, apigen.Validation)

	expect(t, h.call("POST", "/v1/auth/logout", s.AccessToken, nil), 204, "")
	expect(t, h.call("GET", "/v1/me", s.AccessToken, nil), 401, apigen.SessionExpired)
	expect(t, h.call("GET", "/v1/me", "", nil), 401, apigen.Unauthenticated)
}

func expect2(t *testing.T, rec *httptest.ResponseRecorder, status int) *httptest.ResponseRecorder {
	t.Helper()
	expect(t, rec, status, "")
	return rec
}

func TestLoginGivesOneAnswerForEveryFailure(t *testing.T) {
	h := newHarness(t)
	phone := fmt.Sprintf("017%08d", uuid.New().ID()%100000000)
	rec := h.call("POST", "/v1/auth/register", "", map[string]any{"name": "Ibn Sina", "phone": phone, "password": "canon-of-medicine"})
	expect(t, rec, 201, "")

	expect(t, h.call("POST", "/v1/auth/login", "", map[string]any{"login": "+88" + phone, "password": "canon-of-medicine"}), 200, "")
	expect(t, h.call("POST", "/v1/auth/login", "", map[string]any{"login": phone, "password": "wrong"}), 401, apigen.InvalidCredentials)
	expect(t, h.call("POST", "/v1/auth/login", "", map[string]any{"login": uniqueEmail(), "password": "wrong"}), 401, apigen.InvalidCredentials)
}

func TestRefreshRotatesAndReuseEndsTheSession(t *testing.T) {
	h := newHarness(t)
	s := h.register(uniqueEmail())

	rec := h.call("POST", "/v1/auth/refresh", "", map[string]any{"refresh_token": s.RefreshToken})
	expect(t, rec, 200, "")
	next := decode[apigen.Session](t, rec)
	if next.RefreshToken == s.RefreshToken || next.AccessToken == s.AccessToken {
		t.Fatal("tokens did not rotate")
	}
	expect(t, h.call("GET", "/v1/me", s.AccessToken, nil), 401, apigen.SessionExpired)
	expect(t, h.call("GET", "/v1/me", next.AccessToken, nil), 200, "")

	// The old refresh token again: someone copied it. Both holders are signed out.
	expect(t, h.call("POST", "/v1/auth/refresh", "", map[string]any{"refresh_token": s.RefreshToken}), 401, apigen.SessionExpired)
	expect(t, h.call("GET", "/v1/me", next.AccessToken, nil), 401, apigen.SessionExpired)
	expect(t, h.call("POST", "/v1/auth/refresh", "", map[string]any{"refresh_token": next.RefreshToken}), 401, apigen.SessionExpired)
}

func TestUpdateStoreNeedsPermissionAndIsAudited(t *testing.T) {
	h := newHarness(t)
	customer := h.register(uniqueEmail())
	admin := h.admin()

	store := map[string]any{
		"name": "Bayt al-Hikma", "currency": "BDT", "accent_color": "#0f766e", "contact_phone": "01712345678",
		"vat": map[string]any{"enabled": true, "rate_bp": 500, "prices_include_vat": true, "bin": "000123456-0101"},
	}
	expect(t, h.call("PUT", "/v1/admin/store", "", store), 401, apigen.Unauthenticated)
	expect(t, h.call("PUT", "/v1/admin/store", customer.AccessToken, store), 403, apigen.Forbidden)

	bad := map[string]any{"name": "x", "currency": "BDT", "accent_color": "red", "vat": store["vat"]}
	e := expect(t, h.call("PUT", "/v1/admin/store", admin.AccessToken, bad), 400, apigen.Validation)
	if _, ok := (*e.Error.Fields)["accent_color"]; !ok {
		t.Errorf("fields = %v, want accent_color", *e.Error.Fields)
	}

	expect(t, h.call("PUT", "/v1/admin/store", admin.AccessToken, store), 200, "")
	expect(t, h.call("PUT", "/v1/admin/store", admin.AccessToken, store), 200, "")
	got := decode[apigen.Store](t, expect2(t, h.call("GET", "/v1/store", "", nil), 200))
	if got.Name != "Bayt al-Hikma" || got.Vat.RateBp != 500 || *got.Vat.Bin != "000123456-0101" {
		t.Errorf("store = %+v", got)
	}

	page := decode[apigen.AuditPage](t, expect2(t, h.call("GET", "/v1/admin/audit-log?limit=1", admin.AccessToken, nil), 200))
	if len(page.Items) != 1 || page.Items[0].Action != "store.update" || *page.Items[0].Actor != "Al-Khwarizmi" {
		t.Fatalf("audit = %+v", page.Items)
	}
	if page.NextCursor == nil {
		t.Error("no next page")
	}
	expect(t, h.call("GET", "/v1/admin/audit-log?cursor=bm90LWEtbnVtYmVy", admin.AccessToken, nil), 400, apigen.Validation)
}

func TestAPIKeys(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()

	rec := h.call("POST", "/v1/admin/api-keys", admin.AccessToken, map[string]any{"name": "Accounting sync", "scopes": []string{"store:write"}})
	expect(t, rec, 201, "")
	key := decode[apigen.ApiKeyCreated](t, rec)

	store := decode[apigen.Store](t, expect2(t, h.call("GET", "/v1/store", "", nil), 200))
	expect(t, h.call("PUT", "/v1/admin/store", key.Key, store), 200, "")
	expect(t, h.call("GET", "/v1/admin/audit-log", key.Key, nil), 403, apigen.Forbidden)
	expect(t, h.call("GET", "/v1/admin/api-keys", key.Key, nil), 403, apigen.Forbidden) // keys can't manage keys

	list := decode[struct{ Items []apigen.ApiKey }](t, expect2(t, h.call("GET", "/v1/admin/api-keys", admin.AccessToken, nil), 200))
	if len(list.Items) == 0 || list.Items[0].Hint != key.Key[len(key.Key)-4:] {
		t.Errorf("list = %+v", list)
	}

	expect(t, h.call("DELETE", "/v1/admin/api-keys/"+key.Id.String(), admin.AccessToken, nil), 204, "")
	expect(t, h.call("DELETE", "/v1/admin/api-keys/"+key.Id.String(), admin.AccessToken, nil), 404, apigen.NotFound)
	expect(t, h.call("PUT", "/v1/admin/store", key.Key, store), 401, apigen.SessionExpired)
}

func TestSignInIsRateLimited(t *testing.T) {
	h := newHarness(t)
	body := map[string]any{"login": uniqueEmail(), "password": "wrong"}
	for range 10 {
		expect(t, h.call("POST", "/v1/auth/login", "", body), 401, apigen.InvalidCredentials)
	}
	rec := h.call("POST", "/v1/auth/login", "", body)
	expect(t, rec, 429, apigen.RateLimited)
	if rec.Header().Get("Retry-After") == "" {
		t.Error("no Retry-After")
	}
}

func TestKeysCannotBeGivenKeyManagement(t *testing.T) {
	h := newHarness(t)
	admin := h.admin()
	body := map[string]any{"name": "Too much", "scopes": []string{"api_keys:manage"}}
	expect(t, h.call("POST", "/v1/admin/api-keys", admin.AccessToken, body), 400, apigen.Validation)
}
