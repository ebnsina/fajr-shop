package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
)

func (s *Server) ListBrands(ctx context.Context, _ apigen.ListBrandsRequestObject) (apigen.ListBrandsResponseObject, error) {
	rows, err := s.q.ListBrands(ctx)
	if err != nil {
		return nil, fmt.Errorf("list brands: %w", err)
	}
	items := make([]apigen.Brand, len(rows))
	for i, r := range rows {
		items[i] = apigen.Brand{Name: r.Name, ProductCount: int(r.ProductCount)}
		if r.ImageKey != "" {
			img := s.toImage(r.ImageID, r.ImageKey, "", r.ImageWidth, r.ImageHeight)
			items[i].Image = &img
		}
	}
	return apigen.ListBrands200JSONResponse{
		Body: struct {
			Items []apigen.Brand `json:"items"`
		}{items},
		Headers: apigen.ListBrands200ResponseHeaders{CacheControl: "public, max-age=300"},
	}, nil
}

func (s *Server) SubscribeNewsletter(ctx context.Context, req apigen.SubscribeNewsletterRequestObject) (apigen.SubscribeNewsletterResponseObject, error) {
	email := strings.ToLower(strings.TrimSpace(string(req.Body.Email)))
	if err := s.q.Subscribe(ctx, email); err != nil {
		return nil, fmt.Errorf("subscribe: %w", err)
	}
	return apigen.SubscribeNewsletter204Response{}, nil
}

func (s *Server) AdminOverview(ctx context.Context, _ apigen.AdminOverviewRequestObject) (apigen.AdminOverviewResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	c, err := s.q.OverviewCounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("overview: %w", err)
	}
	low, err := s.q.LowStock(ctx)
	if err != nil {
		return nil, fmt.Errorf("overview: low stock: %w", err)
	}
	out := apigen.Overview{Categories: int(c.Categories), OutOfStock: int(c.OutOfStock), Subscribers: int(c.Subscribers)}
	out.Products.Active, out.Products.Draft, out.Products.Archived = int(c.Active), int(c.Draft), int(c.Archived)
	out.LowStock = make([]apigen.LowStockItem, len(low))
	for i, l := range low {
		item := &out.LowStock[i]
		item.Name, item.ProductId, item.VariantId, item.Stock = l.Name, l.ProductID, l.VariantID, int(l.Stock)
		if err := json.Unmarshal(l.Options, &item.Options); err != nil {
			return nil, fmt.Errorf("overview: options: %w", err)
		}
	}
	return apigen.AdminOverview200JSONResponse(out), nil
}
