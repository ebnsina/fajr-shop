package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
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
	out := apigen.Overview{Categories: int(c.Categories), OutOfStock: int(c.OutOfStock)}
	out.Products.Active, out.Products.Draft, out.Products.Archived = int(c.Active), int(c.Draft), int(c.Archived)
	out.LowStock = make([]apigen.LowStockItem, len(low))
	for i, l := range low {
		item := &out.LowStock[i]
		item.Name, item.ProductId, item.VariantId, item.Stock = l.Name, l.ProductID, l.VariantID, int(l.Stock)
		if err := json.Unmarshal(l.Options, &item.Options); err != nil {
			return nil, fmt.Errorf("overview: options: %w", err)
		}
	}
	if p := caller(ctx); p != nil && auth.Has(p.perms, auth.OrdersWrite) {
		err := s.scoped(ctx, func(q *dbq.Queries) error {
			st, err := q.OrderStats(ctx)
			if err != nil {
				return err
			}
			days, err := q.DailySales(ctx)
			if err != nil {
				return err
			}
			out.Orders = &apigen.OrderStats{
				Waiting: int(st.Waiting), ToShip: int(st.ToShip), TodayOrders: int(st.TodayOrders),
				TodaySales: st.TodaySales, WeekOrders: int(st.WeekOrders), WeekSales: st.WeekSales,
			}
			for _, d := range days {
				day, err := time.Parse(time.DateOnly, d.Day)
				if err != nil {
					return err
				}
				out.Orders.Days = append(out.Orders.Days, struct {
					Day    openapi_types.Date `json:"day"`
					Orders int                `json:"orders"`
					Sales  int64              `json:"sales"`
				}{Day: openapi_types.Date{Time: day}, Orders: int(d.Orders), Sales: d.Sales})
			}
			return nil
		})
		if err != nil {
			return nil, fmt.Errorf("overview: orders: %w", err)
		}
	}
	return apigen.AdminOverview200JSONResponse(out), nil
}
