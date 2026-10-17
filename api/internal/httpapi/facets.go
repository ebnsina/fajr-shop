package httpapi

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
)

func (s *Server) ListProductFacets(ctx context.Context, req apigen.ListProductFacetsRequestObject) (apigen.ListProductFacetsResponseObject, error) {
	pr := req.Params
	out := apigen.Facets{Categories: []apigen.CategoryFacet{}, Brands: []apigen.BrandFacet{}, Options: []apigen.OptionFacet{}}
	f, noMatch, err := s.shopFilter(ctx, pr.Q, pr.Category, pr.MinPrice, pr.MaxPrice, pr.InStock, pr.Featured, pr.OnSale, pr.Brand, pr.Option)
	if err != nil {
		return nil, err
	}
	if noMatch {
		return apigen.ListProductFacets200JSONResponse(out), nil
	}

	// Each group is counted without its own filter, so its counts say what ticking one more adds.
	query := func(skip, sql string) (pgx.Rows, error) {
		var args []any
		arg := func(v any) string {
			args = append(args, v)
			return fmt.Sprintf("$%d", len(args))
		}
		where := strings.Join(append(f.conditions(skip, arg), "true"), " AND ")
		return s.pool.Query(ctx, strings.ReplaceAll(sql, "{where}", where), args...)
	}

	// Categories keep the category filter, so a department lists only its own subcategories.
	rows, err := query("", `SELECT c.slug, c.name, count(*)::int FROM products p JOIN categories c ON c.id = p.category_id
		WHERE {where} GROUP BY c.slug, c.name ORDER BY count(*) DESC, c.name LIMIT 100`)
	if err != nil {
		return nil, fmt.Errorf("facets: categories: %w", err)
	}
	for rows.Next() {
		var c apigen.CategoryFacet
		if err := rows.Scan(&c.Slug, &c.Name, &c.Count); err != nil {
			return nil, fmt.Errorf("facets: categories: %w", err)
		}
		out.Categories = append(out.Categories, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("facets: categories: %w", err)
	}

	rows, err = query("brand", `SELECT p.brand, count(*)::int FROM products p
		WHERE {where} AND p.brand IS NOT NULL GROUP BY p.brand ORDER BY count(*) DESC, p.brand LIMIT 40`)
	if err != nil {
		return nil, fmt.Errorf("facets: brands: %w", err)
	}
	for rows.Next() {
		var b apigen.BrandFacet
		if err := rows.Scan(&b.Name, &b.Count); err != nil {
			return nil, fmt.Errorf("facets: brands: %w", err)
		}
		out.Brands = append(out.Brands, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("facets: brands: %w", err)
	}

	rows, err = query("option", `SELECT o.key, o.value, count(DISTINCT p.id)::int
		FROM products p JOIN variants v ON v.product_id = p.id, jsonb_each_text(v.options) o
		WHERE {where} GROUP BY o.key, o.value ORDER BY o.key, count(DISTINCT p.id) DESC, o.value LIMIT 300`)
	if err != nil {
		return nil, fmt.Errorf("facets: options: %w", err)
	}
	for rows.Next() {
		var name, value string
		var count int
		if err := rows.Scan(&name, &value, &count); err != nil {
			return nil, fmt.Errorf("facets: options: %w", err)
		}
		if n := len(out.Options); n == 0 || out.Options[n-1].Name != name {
			out.Options = append(out.Options, apigen.OptionFacet{Name: name})
		}
		last := &out.Options[len(out.Options)-1]
		last.Values = append(last.Values, apigen.ValueFacet{Count: count, Value: value})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("facets: options: %w", err)
	}

	rows, err = query("price", `SELECT min(p.price_min), max(p.price_max) FROM products p WHERE {where}`)
	if err != nil {
		return nil, fmt.Errorf("facets: price: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		var lo, hi *int64
		if err := rows.Scan(&lo, &hi); err != nil {
			return nil, fmt.Errorf("facets: price: %w", err)
		}
		if lo != nil && hi != nil {
			out.Price = &apigen.PriceRange{Min: *lo, Max: *hi}
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("facets: price: %w", err)
	}
	return apigen.ListProductFacets200JSONResponse(out), nil
}
