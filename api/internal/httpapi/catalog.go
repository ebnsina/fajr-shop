package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/catalog"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/media"
)

func notFound(what string) error {
	return &apiError{http.StatusNotFound, apigen.NotFound, what + " doesn't exist.", nil}
}

// --- Categories

func (s *Server) ListCategories(ctx context.Context, _ apigen.ListCategoriesRequestObject) (apigen.ListCategoriesResponseObject, error) {
	rows, err := s.q.ListCategories(ctx)
	if err != nil {
		return nil, fmt.Errorf("list categories: %w", err)
	}
	items := make([]apigen.Category, len(rows))
	for i, c := range rows {
		items[i] = s.toCategory(dbq.CategoryByIDRow(c))
	}
	return apigen.ListCategories200JSONResponse{
		Body: struct {
			Items []apigen.Category `json:"items"`
		}{items},
		Headers: apigen.ListCategories200ResponseHeaders{CacheControl: "public, max-age=60"},
	}, nil
}

func (s *Server) CreateCategory(ctx context.Context, req apigen.CreateCategoryRequestObject) (apigen.CreateCategoryResponseObject, error) {
	c, err := s.saveCategory(ctx, uuid.Nil, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.CreateCategory201JSONResponse(c), nil
}

func (s *Server) UpdateCategory(ctx context.Context, req apigen.UpdateCategoryRequestObject) (apigen.UpdateCategoryResponseObject, error) {
	c, err := s.saveCategory(ctx, req.Id, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.UpdateCategory200JSONResponse(c), nil
}

// saveCategory creates a category (id is Nil) or replaces one.
func (s *Server) saveCategory(ctx context.Context, id uuid.UUID, in apigen.CategoryInput) (apigen.Category, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return apigen.Category{}, err
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		return apigen.Category{}, invalid(map[string]string{"name": "Give the category a name."})
	}
	var parent uuid.NullUUID
	if in.ParentId != nil {
		parent = uuid.NullUUID{UUID: *in.ParentId, Valid: true}
	}
	position := int32(0)
	if in.Position != nil {
		position = int32(*in.Position)
	}
	var image uuid.NullUUID
	if in.ImageId != nil {
		image = uuid.NullUUID{UUID: *in.ImageId, Valid: true}
	}
	var saved dbq.CategoryByIDRow
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if parent.Valid {
			if _, err := q.CategoryByID(ctx, parent.UUID); errors.Is(err, pgx.ErrNoRows) {
				return invalid(map[string]string{"parent_id": "That parent category doesn't exist."})
			} else if err != nil {
				return err
			}
			if id != uuid.Nil {
				loop, err := q.CategoryIsAncestor(ctx, dbq.CategoryIsAncestorParams{CategoryID: parent.UUID, AncestorID: id})
				if err != nil {
					return err
				}
				if loop {
					return invalid(map[string]string{"parent_id": "A category can't sit inside itself or one of its own subcategories."})
				}
			}
		}
		if image.Valid {
			if found, err := q.UploadsByIDs(ctx, []uuid.UUID{image.UUID}); err != nil {
				return err
			} else if len(found) == 0 {
				return invalid(map[string]string{"image_id": "That picture is missing. Upload it again."})
			}
		}
		slug, err := s.uniqueSlug(ctx, q, id, in.Slug, name)
		if err != nil {
			return err
		}
		if id == uuid.Nil {
			c, err := q.CreateCategory(ctx, dbq.CreateCategoryParams{ParentID: parent, Name: name, Slug: slug, Position: position, ImageID: image})
			if err != nil {
				return err
			}
			if saved, err = q.CategoryByID(ctx, c.ID); err != nil {
				return err
			}
			return s.audit(ctx, q, p, "category.create", "category", saved.ID.String(), nil, s.toCategory(saved))
		}
		before, err := q.CategoryByID(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("That category")
		}
		if err != nil {
			return err
		}
		if _, err := q.UpdateCategory(ctx, dbq.UpdateCategoryParams{ID: id, ParentID: parent, Name: name, Slug: slug, Position: position, ImageID: image}); err != nil {
			return err
		}
		if saved, err = q.CategoryByID(ctx, id); err != nil {
			return err
		}
		return s.audit(ctx, q, p, "category.update", "category", id.String(), s.toCategory(before), s.toCategory(saved))
	})
	if err != nil {
		return apigen.Category{}, fmt.Errorf("save category: %w", err)
	}
	return s.toCategory(saved), nil
}

func (s *Server) DeleteCategory(ctx context.Context, req apigen.DeleteCategoryRequestObject) (apigen.DeleteCategoryResponseObject, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		c, err := q.DeleteCategory(ctx, req.Id)
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "category.delete", "category", c.ID.String(), map[string]string{"name": c.Name, "slug": c.Slug}, nil)
	})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return nil, notFound("That category")
	case isForeignKeyViolation(err):
		return nil, &apiError{http.StatusConflict, apigen.InUse, "This category still has products or subcategories. Move them first.", nil}
	case err != nil:
		return nil, fmt.Errorf("delete category: %w", err)
	}
	return apigen.DeleteCategory204Response{}, nil
}

// uniqueSlug uses the given slug, or one made from the name, adding a short suffix if it is taken.
func (s *Server) uniqueSlug(ctx context.Context, q *dbq.Queries, id uuid.UUID, given *string, name string) (string, error) {
	slug := catalog.Slugify(name)
	if given != nil && *given != "" {
		slug = *given
	}
	if slug == "" {
		slug = randomSuffix()
	}
	for range 5 {
		taken, err := q.SlugTaken(ctx, dbq.SlugTakenParams{Slug: slug, ID: id})
		if err != nil {
			return "", err
		}
		if !taken.Bool {
			return slug, nil
		}
		if given != nil && *given != "" {
			return "", invalid(map[string]string{"slug": "Another product or category already uses this web address."})
		}
		slug = catalog.Slugify(name) + "-" + randomSuffix()
		slug = strings.TrimPrefix(slug, "-")
	}
	return "", errors.New("slug: no free suffix after 5 tries")
}

func randomSuffix() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b) // never fails on supported platforms
	return hex.EncodeToString(b)
}

// --- Products

func (s *Server) GetProduct(ctx context.Context, req apigen.GetProductRequestObject) (apigen.GetProductResponseObject, error) {
	p, err := s.q.ProductBySlug(ctx, req.Slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That product")
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	out, err := s.loadProduct(ctx, s.q, p)
	if err != nil {
		return nil, err
	}
	return apigen.GetProduct200JSONResponse(out), nil
}

func (s *Server) AdminGetProduct(ctx context.Context, req apigen.AdminGetProductRequestObject) (apigen.AdminGetProductResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	p, err := s.q.ProductByID(ctx, req.Id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That product")
	}
	if err != nil {
		return nil, fmt.Errorf("get product: %w", err)
	}
	out, err := s.loadProduct(ctx, s.q, p)
	if err != nil {
		return nil, err
	}
	return apigen.AdminGetProduct200JSONResponse(out), nil
}

func (s *Server) CreateProduct(ctx context.Context, req apigen.CreateProductRequestObject) (apigen.CreateProductResponseObject, error) {
	out, err := s.saveProduct(ctx, uuid.Nil, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.CreateProduct201JSONResponse(out), nil
}

func (s *Server) UpdateProduct(ctx context.Context, req apigen.UpdateProductRequestObject) (apigen.UpdateProductResponseObject, error) {
	out, err := s.saveProduct(ctx, req.Id, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.UpdateProduct200JSONResponse(out), nil
}

// saveProduct creates a product (id is Nil) or replaces one, with its variants and images, in one transaction.
func (s *Server) saveProduct(ctx context.Context, id uuid.UUID, in apigen.ProductInput) (apigen.Product, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return apigen.Product{}, err
	}
	name := strings.TrimSpace(in.Name)
	options := make([]catalog.Option, len(in.Options))
	for i, o := range in.Options {
		options[i] = catalog.Option{Name: o.Name, Values: o.Values}
	}
	variants := make([]catalog.Variant, len(in.Variants))
	for i, v := range in.Variants {
		variants[i] = catalog.Variant{Price: v.Price, CompareAt: v.CompareAtPrice, Options: v.Options}
		if v.Id != nil {
			variants[i].ID = v.Id.String()
		}
		if v.Sku != nil {
			variants[i].SKU = *v.Sku
		}
		if variants[i].Options == nil {
			variants[i].Options = map[string]string{}
		}
	}
	errs := catalog.Check(options, variants)
	if name == "" {
		errs["name"] = "Give the product a name."
	}
	if len(errs) > 0 {
		return apigen.Product{}, invalid(errs)
	}
	optionsJSON, err := json.Marshal(options)
	if err != nil {
		return apigen.Product{}, err
	}
	lo, hi := catalog.PriceRange(variants)
	var category uuid.NullUUID
	if in.CategoryId != nil {
		category = uuid.NullUUID{UUID: *in.CategoryId, Valid: true}
	}
	description := ""
	if in.Description != nil {
		description = strings.TrimSpace(*in.Description)
	}
	featured := in.Featured != nil && *in.Featured
	var imageIDs []uuid.UUID
	if in.ImageIds != nil {
		imageIDs = *in.ImageIds
	}

	var out apigen.Product
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if category.Valid {
			if _, err := q.CategoryByID(ctx, category.UUID); errors.Is(err, pgx.ErrNoRows) {
				return invalid(map[string]string{"category_id": "That category doesn't exist."})
			} else if err != nil {
				return err
			}
		}
		if len(imageIDs) > 0 {
			found, err := q.UploadsByIDs(ctx, imageIDs)
			if err != nil {
				return err
			}
			if len(found) != len(imageIDs) {
				return invalid(map[string]string{"image_ids": "One of the images is missing. Upload it again."})
			}
		}
		slug, err := s.uniqueSlug(ctx, q, id, in.Slug, name)
		if err != nil {
			return err
		}

		var before any
		var row dbq.Product
		if id == uuid.Nil {
			row, err = q.CreateProduct(ctx, dbq.CreateProductParams{
				Slug: slug, Name: name, Description: description, Status: dbq.ProductStatus(in.Status),
				CategoryID: category, Options: optionsJSON, PriceMin: lo, PriceMax: hi, Featured: featured, Brand: blank(in.Brand),
			})
		} else {
			old, err := q.ProductByID(ctx, id)
			if errors.Is(err, pgx.ErrNoRows) {
				return notFound("That product")
			}
			if err != nil {
				return err
			}
			if before, err = s.loadProduct(ctx, q, old); err != nil {
				return err
			}
			row, err = q.UpdateProduct(ctx, dbq.UpdateProductParams{
				ID: id, Slug: slug, Name: name, Description: description, Status: dbq.ProductStatus(in.Status),
				CategoryID: category, Options: optionsJSON, PriceMin: lo, PriceMax: hi, Featured: featured, Brand: blank(in.Brand),
			})
			if err != nil {
				return err
			}
		}
		if err != nil {
			return err
		}
		if err := s.saveVariants(ctx, q, p, row.ID, in.Variants, variants); err != nil {
			return err
		}
		if err := q.ClearProductImages(ctx, row.ID); err != nil {
			return err
		}
		if len(imageIDs) > 0 {
			if err := q.SetProductImages(ctx, dbq.SetProductImagesParams{ProductID: row.ID, UploadIds: imageIDs}); err != nil {
				return err
			}
		}
		if out, err = s.loadProduct(ctx, q, row); err != nil {
			return err
		}
		action := "product.create"
		if id != uuid.Nil {
			action = "product.update"
		}
		return s.audit(ctx, q, p, action, "product", row.ID.String(), before, out)
	})
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.ConstraintName == "variants_sku_key" {
		return apigen.Product{}, invalid(map[string]string{"variants": "A SKU here is already used by another product."})
	}
	if err != nil {
		return apigen.Product{}, fmt.Errorf("save product: %w", err)
	}
	return out, nil
}

// saveVariants makes the product's variants match the input: kept ones updated, new ones added
// with their starting stock recorded, the rest removed.
func (s *Server) saveVariants(ctx context.Context, q *dbq.Queries, p *principal, productID uuid.UUID, in []apigen.VariantInput, checked []catalog.Variant) error {
	existing, err := q.VariantsByProduct(ctx, productID)
	if err != nil {
		return err
	}
	known := map[uuid.UUID]bool{}
	for _, v := range existing {
		known[v.ID] = true
	}
	keep := []uuid.UUID{}
	for _, v := range in {
		if v.Id != nil {
			if !known[*v.Id] {
				return invalid(map[string]string{"variants": "A variant in this form no longer exists. Reload and try again."})
			}
			keep = append(keep, *v.Id)
		}
	}
	// Removed first, so a kept variant can take over a removed one's options.
	if err := q.DeleteVariantsExcept(ctx, dbq.DeleteVariantsExceptParams{ProductID: productID, Keep: keep}); err != nil {
		return err
	}
	for i, v := range in {
		opts, err := json.Marshal(checked[i].Options)
		if err != nil {
			return err
		}
		var sku *string
		if checked[i].SKU != "" {
			sku = &checked[i].SKU
		}
		weight := int32(500)
		if v.WeightG != nil {
			weight = int32(*v.WeightG)
		}
		compare := pgtype.Int8{}
		if v.CompareAtPrice != nil {
			compare = pgtype.Int8{Int64: *v.CompareAtPrice, Valid: true}
		}
		if v.Id != nil {
			if _, err := q.UpdateVariant(ctx, dbq.UpdateVariantParams{
				ID: *v.Id, ProductID: productID, Sku: sku, Price: v.Price, CompareAtPrice: compare, Options: opts, Position: int32(i),
				WeightG: weight,
			}); err != nil {
				return err
			}
			continue
		}
		stock := int32(0)
		if v.Stock != nil {
			stock = int32(*v.Stock)
		}
		created, err := q.CreateVariant(ctx, dbq.CreateVariantParams{
			ProductID: productID, Sku: sku, Price: v.Price, CompareAtPrice: compare, Stock: stock, Options: opts, Position: int32(i),
			WeightG: weight,
		})
		if err != nil {
			return err
		}
		if stock > 0 {
			user, key := actor(p)
			if err := q.InsertStockMovement(ctx, dbq.InsertStockMovementParams{
				VariantID: created.ID, Delta: stock, Reason: "initial", ActorUserID: user, ActorApiKeyID: key,
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Server) DeleteProduct(ctx context.Context, req apigen.DeleteProductRequestObject) (apigen.DeleteProductResponseObject, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		row, err := q.DeleteProduct(ctx, req.Id)
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "product.delete", "product", row.ID.String(), map[string]string{"name": row.Name, "slug": row.Slug}, nil)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That product")
	}
	if err != nil {
		return nil, fmt.Errorf("delete product: %w", err)
	}
	return apigen.DeleteProduct204Response{}, nil
}

func (s *Server) AdjustStock(ctx context.Context, req apigen.AdjustStockRequestObject) (apigen.AdjustStockResponseObject, error) {
	p, err := need(ctx, auth.InventoryWrite)
	if err != nil {
		return nil, err
	}
	b := req.Body
	if b.Delta == 0 {
		return nil, invalid(map[string]string{"delta": "Enter how many to add or take away."})
	}
	var v dbq.Variant
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		v, err = q.AdjustStock(ctx, dbq.AdjustStockParams{ID: req.Id, Delta: int32(b.Delta)})
		if errors.Is(err, pgx.ErrNoRows) {
			exists, err := q.VariantExists(ctx, req.Id)
			if err != nil {
				return err
			}
			if !exists {
				return notFound("That variant")
			}
			return &apiError{http.StatusConflict, apigen.InsufficientStock, "There isn't that much in stock to take away.", nil}
		}
		if err != nil {
			return err
		}
		user, key := actor(p)
		return q.InsertStockMovement(ctx, dbq.InsertStockMovementParams{
			VariantID: v.ID, Delta: int32(b.Delta), Reason: string(b.Reason), Note: blank(b.Note), ActorUserID: user, ActorApiKeyID: key,
		})
	})
	if err != nil {
		return nil, fmt.Errorf("adjust stock: %w", err)
	}
	out, err := toVariant(v)
	if err != nil {
		return nil, err
	}
	return apigen.AdjustStock200JSONResponse(out), nil
}

func (s *Server) UploadImage(ctx context.Context, req apigen.UploadImageRequestObject) (apigen.UploadImageResponseObject, error) {
	pr := caller(ctx)
	if pr == nil {
		return nil, unauthenticated(ctx)
	}
	if !auth.Has(pr.perms, auth.CatalogWrite) && !auth.Has(pr.perms, auth.StoreWrite) {
		return nil, errForbidden
	}
	for {
		part, err := req.Body.NextPart()
		if err != nil {
			return nil, invalid(map[string]string{"file": "Choose an image to upload."})
		}
		if part.FormName() != "file" {
			continue
		}
		stored, err := media.Save(s.mediaDir, part)
		switch {
		case errors.Is(err, media.ErrTooLarge):
			return nil, &apiError{http.StatusRequestEntityTooLarge, apigen.TooLarge, "That image is over 10 MB. Try a smaller one.", nil}
		case errors.Is(err, media.ErrUnsupported):
			return nil, &apiError{http.StatusUnsupportedMediaType, apigen.UnsupportedType, "Upload a JPEG, PNG or WebP image.", nil}
		case err != nil:
			return nil, err
		}
		u, err := s.q.CreateUpload(ctx, dbq.CreateUploadParams{
			Key: stored.Key, ContentType: stored.ContentType, Width: int32(stored.Width), Height: int32(stored.Height), Bytes: int32(stored.Bytes),
		})
		if err != nil {
			return nil, fmt.Errorf("upload: %w", err)
		}
		return apigen.UploadImage201JSONResponse(s.toImage(u.ID, u.Key, "", u.Width, u.Height)), nil
	}
}

// loadProduct adds a product's category, variants and images: three more queries, whatever its size.
func (s *Server) loadProduct(ctx context.Context, q *dbq.Queries, p dbq.Product) (apigen.Product, error) {
	out := apigen.Product{
		Id: p.ID, Slug: p.Slug, Name: p.Name, Description: p.Description, Status: apigen.ProductStatus(p.Status), Featured: p.Featured, Brand: p.Brand,
		Currency: "BDT", CreatedAt: p.CreatedAt.Time, UpdatedAt: p.UpdatedAt.Time,
		Options: []apigen.ProductOption{}, Variants: []apigen.Variant{}, Images: []apigen.Image{},
		RatingCount: int(p.RatingCount), RatingAverage: average(p.RatingCount, p.RatingTotal),
	}
	if err := json.Unmarshal(p.Options, &out.Options); err != nil {
		return out, fmt.Errorf("product options: %w", err)
	}
	if p.CategoryID.Valid {
		c, err := q.CategoryByID(ctx, p.CategoryID.UUID)
		if err != nil {
			return out, fmt.Errorf("product category: %w", err)
		}
		cat := s.toCategory(c)
		out.Category = &cat
	}
	variants, err := q.VariantsByProduct(ctx, p.ID)
	if err != nil {
		return out, fmt.Errorf("product variants: %w", err)
	}
	for _, v := range variants {
		av, err := toVariant(v)
		if err != nil {
			return out, err
		}
		out.Variants = append(out.Variants, av)
	}
	images, err := q.ImagesByProduct(ctx, p.ID)
	if err != nil {
		return out, fmt.Errorf("product images: %w", err)
	}
	for _, im := range images {
		out.Images = append(out.Images, s.toImage(im.ID, im.Key, im.Alt, im.Width, im.Height))
	}
	return out, nil
}

func (s *Server) toImage(id uuid.UUID, key, alt string, w, h int32) apigen.Image {
	img := apigen.Image{Id: id, Url: s.mediaURL + "/" + key, Width: int(w), Height: int(h)}
	if alt != "" {
		img.Alt = &alt
	}
	return img
}

func toVariant(v dbq.Variant) (apigen.Variant, error) {
	out := apigen.Variant{Id: v.ID, Sku: v.Sku, Price: v.Price, Stock: int(v.Stock), WeightG: int(v.WeightG), Options: map[string]string{}}
	if v.CompareAtPrice.Valid {
		out.CompareAtPrice = &v.CompareAtPrice.Int64
	}
	if err := json.Unmarshal(v.Options, &out.Options); err != nil {
		return out, fmt.Errorf("variant options: %w", err)
	}
	return out, nil
}

func (s *Server) toCategory(c dbq.CategoryByIDRow) apigen.Category {
	out := apigen.Category{Id: c.ID, Name: c.Name, Slug: c.Slug, Position: int(c.Position)}
	if c.ParentID.Valid {
		out.ParentId = &c.ParentID.UUID
	}
	if c.ImageID.Valid && c.ImageKey != "" {
		img := s.toImage(c.ImageID.UUID, c.ImageKey, "", c.ImageWidth, c.ImageHeight)
		out.Image = &img
	}
	return out
}

func actor(p *principal) (user, key uuid.NullUUID) {
	if p.sessionID != uuid.Nil {
		return uuid.NullUUID{UUID: p.userID, Valid: true}, key
	}
	return user, uuid.NullUUID{UUID: p.apiKeyID, Valid: true}
}

func isForeignKeyViolation(err error) bool {
	pgErr, ok := errors.AsType[*pgconn.PgError](err)
	return ok && pgErr.Code == "23503"
}
