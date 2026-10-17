package httpapi

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
)

func (s *Server) GetHealth(ctx context.Context, _ apigen.GetHealthRequestObject) (apigen.GetHealthResponseObject, error) {
	if err := s.pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("health: ping: %w", err)
	}
	return apigen.GetHealth200JSONResponse{Status: apigen.Ok}, nil
}

func (s *Server) GetStore(ctx context.Context, req apigen.GetStoreRequestObject) (apigen.GetStoreResponseObject, error) {
	row, err := s.q.GetStoreSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("store: load settings: %w", err)
	}
	body := apigen.Store{
		Name:         row.Name,
		LogoUrl:      text(row.LogoUrl),
		AccentColor:  text(row.AccentColor),
		Currency:     row.Currency,
		ContactPhone: text(row.ContactPhone),
		ContactEmail: text(row.ContactEmail),
		Vat: apigen.Vat{
			Enabled:          row.VatEnabled,
			RateBp:           int(row.VatRateBp),
			PricesIncludeVat: row.PricesIncludeVat,
			Bin:              text(row.VatBin),
		},
	}
	tag, err := etag(body)
	if err != nil {
		return nil, err
	}
	if req.Params.IfNoneMatch != nil && matches(*req.Params.IfNoneMatch, tag) {
		return apigen.GetStore304Response{}, nil
	}
	return apigen.GetStore200JSONResponse{
		Body:    body,
		Headers: apigen.GetStore200ResponseHeaders{ETag: tag, CacheControl: "public, max-age=60"},
	}, nil
}

func text(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func etag(v any) (string, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return "", fmt.Errorf("etag: %w", err)
	}
	return fmt.Sprintf(`"%x"`, sha256.Sum256(b))[:17] + `"`, nil
}

func matches(ifNoneMatch, tag string) bool {
	for t := range strings.SplitSeq(ifNoneMatch, ",") {
		if t = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(t), "W/")); t == tag || t == "*" {
			return true
		}
	}
	return false
}
