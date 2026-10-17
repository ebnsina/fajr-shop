package httpapi

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/discount"
)

// Said to a shopper whose code is refused; an unknown code and a switched-off one read the same.
var refusals = map[string]string{
	"inactive":    "That code isn't valid. Check it and try again.",
	"not_started": "That code isn't on yet.",
	"ended":       "That code has ended.",
	"used_up":     "That code has been used up.",
}

func (s *Server) ApplyCartDiscount(ctx context.Context, req apigen.ApplyCartDiscountRequestObject) (apigen.ApplyCartDiscountResponseObject, error) {
	d, err := s.q.DiscountByCode(ctx, strings.TrimSpace(req.Body.Code))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, invalid(map[string]string{"code": refusals["inactive"]})
	}
	if err != nil {
		return nil, fmt.Errorf("apply discount: %w", err)
	}
	if why := codeOf(d).Unusable(time.Now()); why != "" {
		return nil, invalid(map[string]string{"code": refusals[why]})
	}
	var out apigen.Cart
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		cart, token, _, err := cartFor(ctx, q, req.Params.XCartToken, true)
		if err != nil {
			return err
		}
		if err := q.SetCartDiscount(ctx, dbq.SetCartDiscountParams{ID: cart.ID, DiscountID: uuid.NullUUID{UUID: d.ID, Valid: true}}); err != nil {
			return err
		}
		if out, err = s.loadCart(ctx, q, cart.ID); err != nil {
			return err
		}
		if token != "" {
			out.Token = &token
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("apply discount: %w", err)
	}
	return apigen.ApplyCartDiscount200JSONResponse(out), nil
}

func (s *Server) RemoveCartDiscount(ctx context.Context, req apigen.RemoveCartDiscountRequestObject) (apigen.RemoveCartDiscountResponseObject, error) {
	cart, _, found, err := cartFor(ctx, s.q, req.Params.XCartToken, false)
	if err != nil {
		return nil, err
	}
	if !found {
		return apigen.RemoveCartDiscount200JSONResponse(emptyCart()), nil
	}
	if err := s.q.SetCartDiscount(ctx, dbq.SetCartDiscountParams{ID: cart.ID}); err != nil {
		return nil, fmt.Errorf("remove discount: %w", err)
	}
	out, err := s.loadCart(ctx, s.q, cart.ID)
	if err != nil {
		return nil, err
	}
	return apigen.RemoveCartDiscount200JSONResponse(out), nil
}

// priceDiscount fills in out's discount from the cart's code, if it has one.
func priceDiscount(ctx context.Context, q *dbq.Queries, cartID uuid.UUID, out *apigen.Cart) error {
	d, err := q.CartDiscount(ctx, cartID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("cart discount: %w", err)
	}
	c := codeOf(d)
	cd := apigen.CartDiscount{Code: d.Code, Description: d.Description, MinSubtotal: d.MinSubtotal}
	why := c.Unusable(time.Now())
	if why == "" {
		var ok bool
		if cd.Amount, ok = c.Amount(out.Subtotal); !ok {
			why = "below_minimum"
		}
	}
	if why != "" {
		r := apigen.CartDiscountReason(why)
		cd.Reason = &r
	}
	cd.Applies = why == ""
	out.Discount = &cd
	out.DiscountTotal = cd.Amount
	out.Total = out.Subtotal - cd.Amount
	return nil
}

func (s *Server) AdminListDiscounts(ctx context.Context, _ apigen.AdminListDiscountsRequestObject) (apigen.AdminListDiscountsResponseObject, error) {
	if _, err := need(ctx, auth.StoreWrite); err != nil {
		return nil, err
	}
	rows, err := s.q.ListDiscounts(ctx)
	if err != nil {
		return nil, fmt.Errorf("list discounts: %w", err)
	}
	items := make([]apigen.Discount, len(rows))
	for i, d := range rows {
		items[i] = toDiscount(d)
	}
	return apigen.AdminListDiscounts200JSONResponse{Items: items}, nil
}

func (s *Server) CreateDiscount(ctx context.Context, req apigen.CreateDiscountRequestObject) (apigen.CreateDiscountResponseObject, error) {
	d, err := s.saveDiscount(ctx, uuid.Nil, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.CreateDiscount201JSONResponse(d), nil
}

func (s *Server) UpdateDiscount(ctx context.Context, req apigen.UpdateDiscountRequestObject) (apigen.UpdateDiscountResponseObject, error) {
	d, err := s.saveDiscount(ctx, req.Id, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.UpdateDiscount200JSONResponse(d), nil
}

// saveDiscount creates a discount (id is Nil) or replaces one, keeping its used count.
func (s *Server) saveDiscount(ctx context.Context, id uuid.UUID, in apigen.DiscountInput) (apigen.Discount, error) {
	p, err := need(ctx, auth.StoreWrite)
	if err != nil {
		return apigen.Discount{}, err
	}
	errs := map[string]string{}
	if in.Kind == apigen.Percent && in.Value > 100 {
		errs["value"] = "A percentage can be at most 100."
	}
	if in.StartsAt != nil && in.EndsAt != nil && !in.EndsAt.After(*in.StartsAt) {
		errs["ends_at"] = "The end must come after the start."
	}
	if len(errs) > 0 {
		return apigen.Discount{}, invalid(errs)
	}
	params := dbq.CreateDiscountParams{
		Code: strings.ToUpper(in.Code), Kind: string(in.Kind), Value: in.Value,
		Active: in.Active == nil || *in.Active,
	}
	if in.Description != nil {
		if d := strings.TrimSpace(*in.Description); d != "" {
			params.Description = &d
		}
	}
	if in.MaxDiscount != nil && in.Kind == apigen.Percent { // a fixed amount is its own cap
		params.MaxDiscount = pgtype.Int8{Int64: *in.MaxDiscount, Valid: true}
	}
	if in.MinSubtotal != nil {
		params.MinSubtotal = *in.MinSubtotal
	}
	if in.StartsAt != nil {
		params.StartsAt = ts(*in.StartsAt)
	}
	if in.EndsAt != nil {
		params.EndsAt = ts(*in.EndsAt)
	}
	if in.UsageLimit != nil {
		params.UsageLimit = pgtype.Int4{Int32: int32(*in.UsageLimit), Valid: true}
	}

	var saved dbq.Discount
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		var before any
		if id == uuid.Nil {
			saved, err = q.CreateDiscount(ctx, params)
		} else {
			old, err := q.DiscountByID(ctx, id)
			if errors.Is(err, pgx.ErrNoRows) {
				return notFound("That discount")
			}
			if err != nil {
				return err
			}
			before = toDiscount(old)
			saved, err = q.UpdateDiscount(ctx, dbq.UpdateDiscountParams{
				ID: id, Code: params.Code, Description: params.Description, Kind: params.Kind, Value: params.Value,
				MaxDiscount: params.MaxDiscount, MinSubtotal: params.MinSubtotal, StartsAt: params.StartsAt,
				EndsAt: params.EndsAt, UsageLimit: params.UsageLimit, Active: params.Active,
			})
			if err != nil {
				return err
			}
		}
		if err != nil {
			return err
		}
		action := "discount.create"
		if before != nil {
			action = "discount.update"
		}
		return s.audit(ctx, q, p, action, "discount", saved.ID.String(), before, toDiscount(saved))
	})
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.Code == "23505" {
		return apigen.Discount{}, invalid(map[string]string{"code": "Another discount already uses this code."})
	}
	if err != nil {
		return apigen.Discount{}, fmt.Errorf("save discount: %w", err)
	}
	return toDiscount(saved), nil
}

func (s *Server) DeleteDiscount(ctx context.Context, req apigen.DeleteDiscountRequestObject) (apigen.DeleteDiscountResponseObject, error) {
	p, err := need(ctx, auth.StoreWrite)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		d, err := q.DeleteDiscount(ctx, req.Id)
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "discount.delete", "discount", d.ID.String(), toDiscount(d), nil)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That discount")
	}
	if err != nil {
		return nil, fmt.Errorf("delete discount: %w", err)
	}
	return apigen.DeleteDiscount204Response{}, nil
}

func codeOf(d dbq.Discount) discount.Code {
	c := discount.Code{
		Percent: d.Kind == string(apigen.Percent), Value: d.Value, MinSubtotal: d.MinSubtotal,
		UsedCount: d.UsedCount, Active: d.Active,
	}
	if d.MaxDiscount.Valid {
		c.MaxDiscount = &d.MaxDiscount.Int64
	}
	if d.StartsAt.Valid {
		c.StartsAt = &d.StartsAt.Time
	}
	if d.EndsAt.Valid {
		c.EndsAt = &d.EndsAt.Time
	}
	if d.UsageLimit.Valid {
		c.UsageLimit = &d.UsageLimit.Int32
	}
	return c
}

func toDiscount(d dbq.Discount) apigen.Discount {
	out := apigen.Discount{
		Id: d.ID, Code: d.Code, Description: d.Description, Kind: apigen.DiscountKind(d.Kind), Value: d.Value,
		MinSubtotal: d.MinSubtotal, UsedCount: int(d.UsedCount), Active: d.Active, CreatedAt: d.CreatedAt.Time,
	}
	if d.MaxDiscount.Valid {
		out.MaxDiscount = &d.MaxDiscount.Int64
	}
	if d.StartsAt.Valid {
		out.StartsAt = &d.StartsAt.Time
	}
	if d.EndsAt.Valid {
		out.EndsAt = &d.EndsAt.Time
	}
	if d.UsageLimit.Valid {
		n := int(d.UsageLimit.Int32)
		out.UsageLimit = &n
	}
	return out
}
