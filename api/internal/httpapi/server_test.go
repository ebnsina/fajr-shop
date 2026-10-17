package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db"
	"github.com/ebnsina/fajr-shop/api/internal/httpapi"
)

type harness struct {
	t       *testing.T
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
	h, err := httpapi.New(pool, nil)
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
	return &harness{t: t, handler: h, router: router}
}

// do sends a request and fails the test if the response breaks the spec.
func (h *harness) do(req *http.Request) *httptest.ResponseRecorder {
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

func errorCode(t *testing.T, body io.Reader) apigen.ErrorCode {
	t.Helper()
	var e apigen.Error
	if err := json.NewDecoder(body).Decode(&e); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	return e.Error.Code
}

func TestHealth(t *testing.T) {
	h := newHarness(t)
	rec := h.do(httptest.NewRequest("GET", "/v1/health", nil))
	if rec.Code != 200 {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
}

func TestStoreIsCacheable(t *testing.T) {
	h := newHarness(t)
	rec := h.do(httptest.NewRequest("GET", "/v1/store", nil))
	if rec.Code != 200 {
		t.Fatalf("status %d: %s", rec.Code, rec.Body)
	}
	var store apigen.Store
	if err := json.Unmarshal(rec.Body.Bytes(), &store); err != nil {
		t.Fatal(err)
	}
	if store.Name == "" || store.Currency != "BDT" {
		t.Errorf("unexpected store %+v", store)
	}

	tag := rec.Header().Get("ETag")
	req := httptest.NewRequest("GET", "/v1/store", nil)
	req.Header.Set("If-None-Match", tag)
	if rec := h.do(req); rec.Code != 304 {
		t.Errorf("matching ETag: status %d, want 304", rec.Code)
	}
}

func TestErrorsUseOneShape(t *testing.T) {
	h := newHarness(t)
	tests := []struct {
		method, path string
		status       int
		code         apigen.ErrorCode
	}{
		{"GET", "/v1/nope", 404, apigen.NotFound},
		{"DELETE", "/v1/store", 405, apigen.MethodNotAllowed},
	}
	for _, tt := range tests {
		rec := h.do(httptest.NewRequest(tt.method, tt.path, bytes.NewReader(nil)))
		if rec.Code != tt.status {
			t.Errorf("%s %s: status %d, want %d", tt.method, tt.path, rec.Code, tt.status)
			continue
		}
		if got := errorCode(t, rec.Body); got != tt.code {
			t.Errorf("%s %s: code %q, want %q", tt.method, tt.path, got, tt.code)
		}
	}
}
