package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
)

// productFilter is everything a product list can be narrowed and ordered by.
type productFilter struct {
	statuses    []string // nil: any status
	q           string
	categoryIDs []uuid.UUID // nil: any category
	minPrice    *int64
	maxPrice    *int64
	inStock     bool
	options     map[string]string
	sort        string
	cursor      *string
	limit       int
}

// Each sort's ORDER BY, the matching keyset condition, and the column its cursor stores.
// The keyset compares the same columns in the same direction, so every page is an index seek.
var sorts = map[string]struct{ order, after, key, cast string }{
	"newest":     {"p.created_at DESC, p.id DESC", "(p.created_at, p.id) < (%s, %s)", "p.created_at", "timestamptz"},
	"price_asc":  {"p.price_min, p.id", "(p.price_min, p.id) > (%s, %s)", "p.price_min", "bigint"},
	"price_desc": {"p.price_max DESC, p.id DESC", "(p.price_max, p.id) < (%s, %s)", "p.price_max", "bigint"},
	"name":       {"p.name, p.id", "(p.name, p.id) > (%s, %s)", "p.name", "text"},
}

type productCursor struct {
	Sort  string    `json:"s"`
	Value string    `json:"v"`
	ID    uuid.UUID `json:"id"`
}

var errBadCursor = invalid(map[string]string{"cursor": "This page link has expired. Start from the first page."})

func (s *Server) ListProducts(ctx context.Context, req apigen.ListProductsRequestObject) (apigen.ListProductsResponseObject, error) {
	pr := req.Params
	f := productFilter{statuses: []string{"active"}, minPrice: pr.MinPrice, maxPrice: pr.MaxPrice, cursor: pr.Cursor, sort: "newest"}
	if pr.Q != nil {
		f.q = strings.TrimSpace(*pr.Q)
	}
	if pr.InStock != nil {
		f.inStock = *pr.InStock
	}
	if pr.Sort != nil {
		f.sort = string(*pr.Sort)
	}
	f.limit = limitOr(pr.Limit)
	if pr.Option != nil {
		f.options = map[string]string{}
		for i, o := range *pr.Option {
			name, value, ok := strings.Cut(o, ":")
			if !ok || name == "" || value == "" || f.options[name] != "" {
				return nil, invalid(map[string]string{fmt.Sprintf("option.%d", i): "Use Name:Value, once per option name."})
			}
			f.options[name] = value
		}
	}
	if pr.Category != nil {
		ids, err := s.q.CategorySubtree(ctx, *pr.Category)
		if err != nil {
			return nil, fmt.Errorf("list products: category: %w", err)
		}
		if len(ids) == 0 {
			return apigen.ListProducts200JSONResponse{Items: []apigen.ProductSummary{}}, nil
		}
		f.categoryIDs = ids
	}
	page, err := s.listProducts(ctx, f)
	if err != nil {
		return nil, err
	}
	return apigen.ListProducts200JSONResponse(page), nil
}

func (s *Server) AdminListProducts(ctx context.Context, req apigen.AdminListProductsRequestObject) (apigen.AdminListProductsResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	f := productFilter{sort: "newest", cursor: req.Params.Cursor, limit: limitOr(req.Params.Limit)}
	if req.Params.Q != nil {
		f.q = strings.TrimSpace(*req.Params.Q)
	}
	if req.Params.Status != nil {
		f.statuses = []string{string(*req.Params.Status)}
	}
	page, err := s.listProducts(ctx, f)
	if err != nil {
		return nil, err
	}
	return apigen.AdminListProducts200JSONResponse(page), nil
}

func limitOr(l *int) int {
	if l == nil {
		return 50
	}
	return *l
}

func (s *Server) listProducts(ctx context.Context, f productFilter) (apigen.ProductPage, error) {
	sort := sorts[f.sort]
	var where []string
	var args []any
	arg := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}
	if f.statuses != nil {
		where = append(where, "p.status::text = ANY("+arg(f.statuses)+")")
	}
	if f.q != "" {
		like := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(f.q) + "%"
		where = append(where, fmt.Sprintf(
			"((setweight(to_tsvector('simple', p.name), 'A') || setweight(to_tsvector('simple', p.description), 'B')) @@ websearch_to_tsquery('simple', %s) OR p.name ILIKE %s)",
			arg(f.q), arg(like)))
	}
	if f.categoryIDs != nil {
		where = append(where, "p.category_id = ANY("+arg(f.categoryIDs)+")")
	}
	if f.minPrice != nil {
		where = append(where, "p.price_max >= "+arg(*f.minPrice))
	}
	if f.maxPrice != nil {
		where = append(where, "p.price_min <= "+arg(*f.maxPrice))
	}
	if f.inStock {
		where = append(where, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)")
	}
	if len(f.options) > 0 {
		want, err := json.Marshal(f.options)
		if err != nil {
			return apigen.ProductPage{}, err
		}
		where = append(where, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.options @> "+arg(string(want))+"::jsonb)")
	}
	if f.cursor != nil {
		c, err := decodeProductCursor(*f.cursor)
		if err != nil || c.Sort != f.sort {
			return apigen.ProductPage{}, errBadCursor
		}
		where = append(where, fmt.Sprintf(sort.after, arg(c.Value)+"::"+sort.cast, arg(c.ID)))
	}
	sql := `SELECT p.id, p.slug, p.name, p.status::text, p.price_min, p.price_max,
		(SELECT v.compare_at_price FROM variants v WHERE v.product_id = p.id ORDER BY v.price, v.position LIMIT 1),
		EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0),
		img.id, img.key, img.alt, img.width, img.height, ` + sort.key + `::text
	FROM products p
	LEFT JOIN LATERAL (
		SELECT u.id, u.key, pi.alt, u.width, u.height FROM product_images pi JOIN uploads u ON u.id = pi.upload_id
		WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1
	) img ON true`
	if len(where) > 0 {
		sql += " WHERE " + strings.Join(where, " AND ")
	}
	sql += " ORDER BY " + sort.order + " LIMIT " + arg(f.limit+1)

	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return apigen.ProductPage{}, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	page := apigen.ProductPage{Items: []apigen.ProductSummary{}}
	var lastKey string
	for rows.Next() {
		if len(page.Items) == f.limit {
			last := page.Items[len(page.Items)-1]
			next := encodeProductCursor(productCursor{Sort: f.sort, Value: lastKey, ID: last.Id})
			page.NextCursor = &next
			break
		}
		var p apigen.ProductSummary
		var status string
		var compare pgtype.Int8
		var imgID uuid.NullUUID
		var imgKey, imgAlt *string
		var imgW, imgH *int32
		if err := rows.Scan(&p.Id, &p.Slug, &p.Name, &status, &p.PriceMin, &p.PriceMax, &compare, &p.InStock,
			&imgID, &imgKey, &imgAlt, &imgW, &imgH, &lastKey); err != nil {
			return apigen.ProductPage{}, fmt.Errorf("list products: scan: %w", err)
		}
		p.Status = apigen.ProductStatus(status)
		p.Currency = "BDT"
		if compare.Valid {
			p.CompareAtPrice = &compare.Int64
		}
		if imgID.Valid {
			alt := ""
			if imgAlt != nil {
				alt = *imgAlt
			}
			img := s.toImage(imgID.UUID, *imgKey, alt, *imgW, *imgH)
			p.Image = &img
		}
		page.Items = append(page.Items, p)
	}
	if err := rows.Err(); err != nil {
		return apigen.ProductPage{}, fmt.Errorf("list products: %w", err)
	}
	return page, nil
}

// The sort key travels as text; created_at keeps full precision so no row is skipped between pages.
func encodeProductCursor(c productCursor) string {
	b, _ := json.Marshal(c) // a struct of strings and a UUID always marshals
	return base64.RawURLEncoding.EncodeToString(b)
}

func decodeProductCursor(s string) (productCursor, error) {
	var c productCursor
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return c, err
	}
	if err := json.Unmarshal(b, &c); err != nil {
		return c, err
	}
	if _, ok := sorts[c.Sort]; !ok {
		return c, fmt.Errorf("unknown sort %q", c.Sort)
	}
	if c.Sort == "newest" {
		_, err = time.Parse("2006-01-02 15:04:05.999999-07", c.Value)
	}
	return c, err
}
