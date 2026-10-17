// Package httpapi serves the OpenAPI contract in openapi.yaml. Requests the spec refuses never reach a handler.
package httpapi

import (
	"fmt"
	"net/http"
	"net/netip"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	nethttpmiddleware "github.com/oapi-codegen/nethttp-middleware"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/config"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// Server implements every operation in the spec.
type Server struct {
	pool           *pgxpool.Pool
	q              *dbq.Queries
	trustedProxies []netip.Prefix
	limits         *limiter
}

var _ apigen.StrictServerInterface = (*Server)(nil)

func New(pool *pgxpool.Pool, cfg config.Config) (http.Handler, error) {
	spec, err := apigen.GetSpec()
	if err != nil {
		return nil, fmt.Errorf("httpapi: load spec: %w", err)
	}
	s := &Server{pool: pool, q: dbq.New(pool), trustedProxies: cfg.TrustedProxies, limits: &limiter{}}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, recoverer)
	if len(cfg.CORSOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   cfg.CORSOrigins,
			AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
			AllowedHeaders:   []string{"Authorization", "Content-Type", "Idempotency-Key", "If-None-Match"},
			ExposedHeaders:   []string{"ETag"},
			AllowCredentials: true,
			MaxAge:           600,
		}))
	}
	r.Use(nethttpmiddleware.OapiRequestValidatorWithOptions(spec, &nethttpmiddleware.Options{
		DoNotValidateServers: true,
		ErrorHandlerWithOpts: specError,
		// Who is calling is decided by identify; whether they may is the handler's call.
		Options: openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc},
	}))
	r.Use(s.identify, s.throttle)

	strict := apigen.NewStrictHandlerWithOptions(s, nil, apigen.StrictHTTPServerOptions{
		RequestErrorHandlerFunc:  badRequest,
		ResponseErrorHandlerFunc: handlerError,
	})
	return apigen.HandlerWithOptions(strict, apigen.ChiServerOptions{
		BaseRouter:       r,
		ErrorHandlerFunc: badRequest,
	}), nil
}
