package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// cartFor finds the caller's cart: a customer's by their session, a guest's by token. With create,
// a missing cart is made, and a new guest cart's token is returned once.
func cartFor(ctx context.Context, q *dbq.Queries, token *string, create bool) (cart dbq.Cart, newToken string, found bool, err error) {
	if rejected, _ := ctx.Value(tokenRejectedKey).(bool); rejected {
		return cart, "", false, unauthenticated(ctx) // refresh rather than quietly shop as a guest
	}
	if p := caller(ctx); p != nil {
		if p.sessionID == uuid.Nil {
			return cart, "", false, errForbidden // API keys don't shop
		}
		cart, err = q.CartByUser(ctx, uuid.NullUUID{UUID: p.userID, Valid: true})
		if errors.Is(err, pgx.ErrNoRows) && create {
			cart, err = q.CreateUserCart(ctx, uuid.NullUUID{UUID: p.userID, Valid: true})
		}
	} else {
		err = pgx.ErrNoRows
		if token != nil && *token != "" {
			cart, err = q.CartByToken(ctx, auth.Digest(*token))
		}
		if errors.Is(err, pgx.ErrNoRows) && create {
			var digest []byte
			newToken, digest = auth.NewToken(auth.PrefixCart)
			cart, err = q.CreateGuestCart(ctx, digest)
		}
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return cart, "", false, nil
	}
	if err != nil {
		return cart, "", false, fmt.Errorf("cart: %w", err)
	}
	return cart, newToken, true, nil
}

func (s *Server) GetCart(ctx context.Context, req apigen.GetCartRequestObject) (apigen.GetCartResponseObject, error) {
	cart, _, found, err := cartFor(ctx, s.q, req.Params.XCartToken, false)
	if err != nil {
		return nil, err
	}
	if !found {
		return apigen.GetCart200JSONResponse(emptyCart()), nil
	}
	out, err := s.loadCart(ctx, s.q, cart.ID)
	if err != nil {
		return nil, err
	}
	return apigen.GetCart200JSONResponse(out), nil
}

func (s *Server) SetCartItem(ctx context.Context, req apigen.SetCartItemRequestObject) (apigen.SetCartItemResponseObject, error) {
	qty := req.Body.Quantity
	var out apigen.Cart
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if qty > 0 {
			v, err := q.VariantForSale(ctx, req.VariantId)
			if errors.Is(err, pgx.ErrNoRows) || (err == nil && v.Status != dbq.ProductStatusActive) {
				return notFound("That product")
			}
			if err != nil {
				return err
			}
			if int(v.Stock) < qty {
				msg := "This is sold out."
				if v.Stock > 0 {
					msg = fmt.Sprintf("Only %d left.", v.Stock)
				}
				return &apiError{http.StatusConflict, apigen.InsufficientStock, msg, map[string]string{"quantity": msg}}
			}
		}
		cart, token, found, err := cartFor(ctx, q, req.Params.XCartToken, qty > 0)
		if err != nil {
			return err
		}
		if !found { // removing from a cart that doesn't exist
			out = emptyCart()
			return nil
		}
		if qty == 0 {
			err = q.RemoveCartItem(ctx, dbq.RemoveCartItemParams{CartID: cart.ID, VariantID: req.VariantId})
		} else {
			err = q.SetCartItem(ctx, dbq.SetCartItemParams{CartID: cart.ID, VariantID: req.VariantId, Quantity: int32(qty)})
		}
		if err != nil {
			return err
		}
		if err := q.TouchCart(ctx, cart.ID); err != nil {
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
		return nil, fmt.Errorf("set cart item: %w", err)
	}
	return apigen.SetCartItem200JSONResponse(out), nil
}

func (s *Server) MergeCart(ctx context.Context, req apigen.MergeCartRequestObject) (apigen.MergeCartResponseObject, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	var out apigen.Cart
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		mine, err := q.CreateUserCart(ctx, uuid.NullUUID{UUID: p.userID, Valid: true})
		if err != nil {
			return err
		}
		guest, err := q.CartByToken(ctx, auth.Digest(req.Body.CartToken))
		if err == nil {
			if err := q.MergeCartItems(ctx, dbq.MergeCartItemsParams{IntoCart: mine.ID, FromCart: guest.ID}); err != nil {
				return err
			}
			if err := q.MergeCartDiscount(ctx, dbq.MergeCartDiscountParams{IntoCart: mine.ID, FromCart: guest.ID}); err != nil {
				return err
			}
			if err := q.DeleteCart(ctx, guest.ID); err != nil {
				return err
			}
		} else if !errors.Is(err, pgx.ErrNoRows) { // an expired guest cart just has nothing to add
			return err
		}
		out, err = s.loadCart(ctx, q, mine.ID)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("merge cart: %w", err)
	}
	return apigen.MergeCart200JSONResponse(out), nil
}

// loadCart prices a cart at today's prices in one query.
func (s *Server) loadCart(ctx context.Context, q *dbq.Queries, cartID uuid.UUID) (apigen.Cart, error) {
	rows, err := q.CartLines(ctx, cartID)
	if err != nil {
		return apigen.Cart{}, fmt.Errorf("cart lines: %w", err)
	}
	out := emptyCart()
	for _, r := range rows {
		item := apigen.CartItem{
			VariantId: r.VariantID, ProductId: r.ProductID, Slug: r.Slug, Name: r.Name,
			UnitPrice: r.Price, Quantity: int(r.Quantity), LineTotal: r.Price * int64(r.Quantity),
			Stock: int(r.Stock), Purchasable: r.Status == dbq.ProductStatusActive && r.Stock >= r.Quantity,
			Options: map[string]string{},
		}
		if err := json.Unmarshal(r.Options, &item.Options); err != nil {
			return out, fmt.Errorf("cart options: %w", err)
		}
		if r.CompareAtPrice.Valid {
			item.CompareAtPrice = &r.CompareAtPrice.Int64
		}
		if r.ImageKey != "" {
			img := s.toImage(r.ImageID, r.ImageKey, "", r.ImageWidth, r.ImageHeight)
			item.Image = &img
		}
		out.Items = append(out.Items, item)
		out.ItemCount += item.Quantity
		if item.Purchasable {
			out.Subtotal += item.LineTotal
		}
	}
	out.Total = out.Subtotal
	return out, priceDiscount(ctx, q, cartID, &out)
}

func emptyCart() apigen.Cart {
	return apigen.Cart{Items: []apigen.CartItem{}, Currency: "BDT"}
}
