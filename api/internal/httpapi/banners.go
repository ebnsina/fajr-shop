package httpapi

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func (s *Server) ListBanners(ctx context.Context, _ apigen.ListBannersRequestObject) (apigen.ListBannersResponseObject, error) {
	rows, err := s.q.ListActiveBanners(ctx)
	if err != nil {
		return nil, fmt.Errorf("list banners: %w", err)
	}
	items := make([]apigen.Banner, len(rows))
	for i, r := range rows {
		items[i] = s.toBanner(dbq.BannerByIDRow(r))
	}
	return apigen.ListBanners200JSONResponse{
		Body:    struct{ Items []apigen.Banner `json:"items"` }{items},
		Headers: apigen.ListBanners200ResponseHeaders{CacheControl: "public, max-age=60"},
	}, nil
}

func (s *Server) AdminListBanners(ctx context.Context, _ apigen.AdminListBannersRequestObject) (apigen.AdminListBannersResponseObject, error) {
	if _, err := need(ctx, auth.CatalogWrite); err != nil {
		return nil, err
	}
	rows, err := s.q.ListAllBanners(ctx)
	if err != nil {
		return nil, fmt.Errorf("list banners: %w", err)
	}
	items := make([]apigen.Banner, len(rows))
	for i, r := range rows {
		items[i] = s.toBanner(dbq.BannerByIDRow(r))
	}
	return apigen.AdminListBanners200JSONResponse{Items: items}, nil
}

func (s *Server) CreateBanner(ctx context.Context, req apigen.CreateBannerRequestObject) (apigen.CreateBannerResponseObject, error) {
	b, err := s.saveBanner(ctx, uuid.Nil, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.CreateBanner201JSONResponse(b), nil
}

func (s *Server) UpdateBanner(ctx context.Context, req apigen.UpdateBannerRequestObject) (apigen.UpdateBannerResponseObject, error) {
	b, err := s.saveBanner(ctx, req.Id, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.UpdateBanner200JSONResponse(b), nil
}

// saveBanner creates a banner (id is Nil) or replaces one.
func (s *Server) saveBanner(ctx context.Context, id uuid.UUID, in apigen.BannerInput) (apigen.Banner, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return apigen.Banner{}, err
	}
	alt := strings.TrimSpace(in.Alt)
	if alt == "" {
		return apigen.Banner{}, invalid(map[string]string{"alt": "Say what the banner shows, for people who can't see it."})
	}
	position := int32(0)
	if in.Position != nil {
		position = int32(*in.Position)
	}
	active := in.Active == nil || *in.Active
	var out apigen.Banner
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		found, err := q.UploadsByIDs(ctx, []uuid.UUID{in.ImageId})
		if err != nil {
			return err
		}
		if len(found) == 0 {
			return invalid(map[string]string{"image_id": "That picture is missing. Upload it again."})
		}
		var before any
		if id == uuid.Nil {
			id, err = q.CreateBanner(ctx, dbq.CreateBannerParams{
				Placement: dbq.BannerPlacement(in.Placement), UploadID: in.ImageId, Link: blank(in.Link), Alt: alt, Position: position, Active: active,
			})
		} else {
			old, err := q.BannerByID(ctx, id)
			if errors.Is(err, pgx.ErrNoRows) {
				return notFound("That banner")
			}
			if err != nil {
				return err
			}
			before = s.toBanner(old)
			_, err = q.UpdateBanner(ctx, dbq.UpdateBannerParams{
				ID: id, Placement: dbq.BannerPlacement(in.Placement), UploadID: in.ImageId, Link: blank(in.Link), Alt: alt, Position: position, Active: active,
			})
			if err != nil {
				return err
			}
		}
		if err != nil {
			return err
		}
		row, err := q.BannerByID(ctx, id)
		if err != nil {
			return err
		}
		out = s.toBanner(row)
		action := "banner.create"
		if before != nil {
			action = "banner.update"
		}
		return s.audit(ctx, q, p, action, "banner", id.String(), before, out)
	})
	if err != nil {
		return apigen.Banner{}, fmt.Errorf("save banner: %w", err)
	}
	return out, nil
}

func (s *Server) DeleteBanner(ctx context.Context, req apigen.DeleteBannerRequestObject) (apigen.DeleteBannerResponseObject, error) {
	p, err := need(ctx, auth.CatalogWrite)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		row, err := q.BannerByID(ctx, req.Id)
		if err != nil {
			return err
		}
		if _, err := q.DeleteBanner(ctx, req.Id); err != nil {
			return err
		}
		return s.audit(ctx, q, p, "banner.delete", "banner", req.Id.String(), s.toBanner(row), nil)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That banner")
	}
	if err != nil {
		return nil, fmt.Errorf("delete banner: %w", err)
	}
	return apigen.DeleteBanner204Response{}, nil
}

func (s *Server) toBanner(b dbq.BannerByIDRow) apigen.Banner {
	return apigen.Banner{
		Id: b.ID, Placement: apigen.BannerPlacement(b.Placement), Link: b.Link, Alt: b.Alt,
		Position: int(b.Position), Active: b.Active,
		Image: s.toImage(b.UploadID, b.ImageKey, b.Alt, b.ImageWidth, b.ImageHeight),
	}
}
