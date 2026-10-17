package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"maps"
	"slices"
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
	featured    bool
	onSale      bool
	brands      []string            // any of these
	options     map[string][]string // per option name, any of these values, on one variant
	sort        string
	cursor      *string
	limit       int
}

// shopFilter reads the filters the shop's product list and its facets share. noMatch is true for
// a category slug that doesn't exist, which can only match nothing.
func (s *Server) shopFilter(ctx context.Context, q, category *string, minPrice, maxPrice *int64,
	inStock, featured, onSale *bool, brands, options *[]string) (f productFilter, noMatch bool, err error) {
	f = productFilter{statuses: []string{"active"}, minPrice: minPrice, maxPrice: maxPrice}
	if q != nil {
		f.q = strings.TrimSpace(*q)
	}
	f.inStock = inStock != nil && *inStock
	f.featured = featured != nil && *featured
	f.onSale = onSale != nil && *onSale
	if brands != nil {
		for _, b := range *brands {
			if b = strings.TrimSpace(b); b != "" {
				f.brands = append(f.brands, b)
			}
		}
	}
	if options != nil {
		f.options = map[string][]string{}
		for i, o := range *options {
			name, value, ok := strings.Cut(o, ":")
			if !ok || name == "" || value == "" {
				return f, false, invalid(map[string]string{fmt.Sprintf("option.%d", i): "Use Name:Value, like Size:M."})
			}
			f.options[name] = append(f.options[name], value)
		}
	}
	if category != nil {
		ids, err := s.q.CategorySubtree(ctx, *category)
		if err != nil {
			return f, false, fmt.Errorf("category: %w", err)
		}
		if len(ids) == 0 {
			return f, true, nil
		}
		f.categoryIDs = ids
	}
	return f, false, nil
}

// conditions are f's SQL filters on products p, leaving out the group named skip (a facet's own,
// so its counts show what choosing one more of it would add).
func (f productFilter) conditions(skip string, arg func(any) string) []string {
	var where []string
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
	if skip != "price" {
		if f.minPrice != nil {
			where = append(where, "p.price_max >= "+arg(*f.minPrice))
		}
		if f.maxPrice != nil {
			where = append(where, "p.price_min <= "+arg(*f.maxPrice))
		}
	}
	if f.inStock {
		where = append(where, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.stock > 0)")
	}
	if f.featured {
		where = append(where, "p.featured")
	}
	if f.onSale {
		where = append(where, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND v.compare_at_price IS NOT NULL)")
	}
	if len(f.brands) > 0 && skip != "brand" {
		where = append(where, "p.brand = ANY("+arg(f.brands)+")")
	}
	if len(f.options) > 0 && skip != "option" {
		var each []string
		for _, name := range slices.Sorted(maps.Keys(f.options)) {
			each = append(each, fmt.Sprintf("v.options->>%s = ANY(%s)", arg(name), arg(f.options[name])))
		}
		where = append(where, "EXISTS (SELECT 1 FROM variants v WHERE v.product_id = p.id AND "+strings.Join(each, " AND ")+")")
	}
	return where
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
	f, noMatch, err := s.shopFilter(ctx, pr.Q, pr.Category, pr.MinPrice, pr.MaxPrice, pr.InStock, pr.Featured, pr.OnSale, pr.Brand, pr.Option)
	if err != nil {
		return nil, err
	}
	if noMatch {
		return apigen.ListProducts200JSONResponse{Items: []apigen.ProductSummary{}}, nil
	}
	f.cursor, f.sort, f.limit = pr.Cursor, "newest", limitOr(pr.Limit)
	if pr.Sort != nil {
		f.sort = string(*pr.Sort)
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
	where = f.conditions("", arg)
	if f.cursor != nil {
		c, err := decodeProductCursor(*f.cursor)
		if err != nil || c.Sort != f.sort {
			return apigen.ProductPage{}, errBadCursor
		}
		where = append(where, fmt.Sprintf(sort.after, arg(c.Value)+"::"+sort.cast, arg(c.ID)))
	}
	sql := `SELECT p.id, p.slug, p.name, p.status::text, p.brand, p.price_min, p.price_max,
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
		if err := rows.Scan(&p.Id, &p.Slug, &p.Name, &status, &p.Brand, &p.PriceMin, &p.PriceMax, &compare, &p.InStock,
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
