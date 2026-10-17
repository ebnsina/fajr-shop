package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
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

// apiError is a refusal a handler means to give; anything else a handler returns is a 500.
type apiError struct {
	status  int
	code    apigen.ErrorCode
	message string
	fields  map[string]string
}

func (e *apiError) Error() string { return string(e.code) }

func invalid(fields map[string]string) error {
	return &apiError{http.StatusBadRequest, apigen.Validation, "Please check the highlighted fields.", fields}
}

func handlerError(w http.ResponseWriter, r *http.Request, err error) {
	if e, ok := errors.AsType[*apiError](err); ok {
		writeError(w, e.status, e.code, e.message, e.fields)
		return
	}
	internalError(w, r, err)
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
	switch _, tooBig := errors.AsType[*http.MaxBytesError](err); {
	case tooBig:
		writeError(w, http.StatusRequestEntityTooLarge, apigen.TooLarge, "That is too large to send.", nil)
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
	if schemaErr, ok := errors.AsType[*openapi3.SchemaError](err); ok {
		path := schemaErr.JSONPointer()
		// Point a missing property's error at the property, not its parent.
		if m := missingProperty.FindStringSubmatch(schemaErr.Reason); m != nil && (len(path) == 0 || path[len(path)-1] != m[1]) {
			path = append(path, m[1])
		}
		field := strings.Join(path, ".")
		if field == "" {
			field = "body"
		}
		return map[string]string{field: plainReason(schemaErr)}
	}
	if reqErr.Parameter != nil {
		return map[string]string{reqErr.Parameter.Name: "Check this value."}
	}
	return map[string]string{"body": "Check what you sent."}
}

var missingProperty = regexp.MustCompile(`property "([^"]+)" is missing`)

// plainReason says what a value must be in words a shop owner can act on; the validator's own
// reasons are written for developers.
func plainReason(e *openapi3.SchemaError) string {
	s := e.Schema
	switch e.SchemaField {
	case "required", "nullable":
		return "Fill this in."
	case "minimum":
		if s != nil && s.Min != nil {
			return fmt.Sprintf("Must be %v or more.", *s.Min)
		}
	case "maximum":
		if s != nil && s.Max != nil {
			return fmt.Sprintf("Must be %v or less.", *s.Max)
		}
	case "minLength":
		if s != nil && s.MinLength > 1 {
			return fmt.Sprintf("Use at least %d characters.", s.MinLength)
		}
		return "Fill this in."
	case "maxLength":
		if s != nil && s.MaxLength != nil {
			return fmt.Sprintf("Use %d characters or fewer.", *s.MaxLength)
		}
	case "minItems":
		if s != nil {
			return fmt.Sprintf("Add at least %d.", s.MinItems)
		}
	case "maxItems":
		if s != nil && s.MaxItems != nil {
			return fmt.Sprintf("Use %d or fewer.", *s.MaxItems)
		}
	case "uniqueItems":
		return "Each one must be different."
	case "enum":
		return "Choose one of the options given."
	case "pattern", "format":
		return "This isn't in the right format."
	case "type":
		return "This isn't a valid value."
	}
	return "Check this value."
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
