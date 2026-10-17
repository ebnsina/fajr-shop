// Package httpapi serves the OpenAPI contract in openapi.yaml. Requests the spec refuses never reach a handler.
package httpapi

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	nethttpmiddleware "github.com/oapi-codegen/nethttp-middleware"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// Server implements every operation in the spec.
type Server struct {
	pool *pgxpool.Pool
	q    *dbq.Queries
}

var _ apigen.StrictServerInterface = (*Server)(nil)

func New(pool *pgxpool.Pool, corsOrigins []string) (http.Handler, error) {
	spec, err := apigen.GetSpec()
	if err != nil {
		return nil, fmt.Errorf("httpapi: load spec: %w", err)
	}
	s := &Server{pool: pool, q: dbq.New(pool)}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, recoverer)
	if len(corsOrigins) > 0 {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   corsOrigins,
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
	}))

	strict := apigen.NewStrictHandlerWithOptions(s, nil, apigen.StrictHTTPServerOptions{
		RequestErrorHandlerFunc:  badRequest,
		ResponseErrorHandlerFunc: internalError,
	})
	return apigen.HandlerWithOptions(strict, apigen.ChiServerOptions{
		BaseRouter:       r,
		ErrorHandlerFunc: badRequest,
	}), nil
}
