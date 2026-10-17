package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/go-chi/chi/v5/middleware"
	nethttpmiddleware "github.com/oapi-codegen/nethttp-middleware"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
)

func writeError(w http.ResponseWriter, status int, code apigen.ErrorCode, message string, fields map[string]string) {
	var body apigen.Error
	body.Error.Code = code
	body.Error.Message = message
	if len(fields) > 0 {
		body.Error.Fields = &fields
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body) // the status is already sent; a failed write has no one left to tell
}

// internalError logs the real cause and gives the client only the request id to quote.
func internalError(w http.ResponseWriter, r *http.Request, err error) {
	id := middleware.GetReqID(r.Context())
	slog.ErrorContext(r.Context(), "request failed", "err", err, "request_id", id, "path", r.URL.Path)
	writeError(w, http.StatusInternalServerError, apigen.Internal, "Something went wrong on our side. Reference: "+id, nil)
}

func badRequest(w http.ResponseWriter, _ *http.Request, err error) {
	writeError(w, http.StatusBadRequest, apigen.Validation, "The request is not valid.", fieldsOf(err))
}

// specError turns a request the spec refuses into our error shape.
func specError(_ context.Context, err error, w http.ResponseWriter, _ *http.Request, opts nethttpmiddleware.ErrorHandlerOpts) {
	// The middleware suggests 404 for every route miss, including a known path with the wrong method.
	switch {
	case errors.Is(err, routers.ErrMethodNotAllowed):
		writeError(w, http.StatusMethodNotAllowed, apigen.MethodNotAllowed, "This address does not accept that method.", nil)
	case opts.StatusCode == http.StatusNotFound:
		writeError(w, http.StatusNotFound, apigen.NotFound, "There is nothing at this address.", nil)
	default:
		writeError(w, http.StatusBadRequest, apigen.Validation, "The request is not valid.", fieldsOf(err))
	}
}

func fieldsOf(err error) map[string]string {
	reqErr, ok := errors.AsType[*openapi3filter.RequestError](err)
	if !ok {
		return nil
	}
	reason := reqErr.Reason
	if schemaErr, ok := errors.AsType[*openapi3.SchemaError](err); ok {
		reason = schemaErr.Reason
		if ptr := schemaErr.JSONPointer(); len(ptr) > 0 {
			return map[string]string{strings.Join(ptr, "."): reason}
		}
	}
	if reqErr.Parameter != nil {
		return map[string]string{reqErr.Parameter.Name: reason}
	}
	return map[string]string{"body": reason}
}

func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				if v == http.ErrAbortHandler {
					panic(v)
				}
				internalError(w, r, errors.New("panic: "+slog.AnyValue(v).String()))
			}
		}()
		next.ServeHTTP(w, r)
	})
}
