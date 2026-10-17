package httpapi

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func (s *Server) AdminListCustomers(ctx context.Context, req apigen.AdminListCustomersRequestObject) (apigen.AdminListCustomersResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	limit := limitOr(req.Params.Limit)
	params := dbq.AdminCustomersParams{Lim: int32(limit + 1)}
	params.Q, params.Pattern, params.Digits = searchTerms(ptrOr(req.Params.Q))
	if c := req.Params.Cursor; c != nil {
		at, id, ok := decodeReviewCursor(*c)
		if !ok {
			return nil, errBadCursor
		}
		params.BeforeAt, params.BeforeID = ts(at), uuid.NullUUID{UUID: id, Valid: true}
	}
	out := apigen.AdminListCustomers200JSONResponse{Items: []apigen.CustomerSummary{}}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.AdminCustomers(ctx, params)
		for i, r := range rows {
			if i == limit {
				next := encodeReviewCursor(rows[i-1].CreatedAt.Time, rows[i-1].ID)
				out.NextCursor = &next
				break
			}
			out.Items = append(out.Items, toCustomer(r.ID, r.Name, r.Email, r.Phone, r.CreatedAt, r.DisabledAt, r.OrderCount, r.Spent, r.LastOrderAt))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("customers: %w", err)
	}
	return out, nil
}

func (s *Server) AdminGetCustomer(ctx context.Context, req apigen.AdminGetCustomerRequestObject) (apigen.AdminGetCustomerResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	var out apigen.Customer
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		r, err := q.AdminCustomer(ctx, req.Id)
		if err != nil {
			return err
		}
		sum := toCustomer(r.ID, r.Name, r.Email, r.Phone, r.CreatedAt, r.DisabledAt, r.OrderCount, r.Spent, r.LastOrderAt)
		out = apigen.Customer{
			Id: sum.Id, Name: sum.Name, Email: sum.Email, Phone: sum.Phone, CreatedAt: sum.CreatedAt, Disabled: sum.Disabled,
			OrderCount: sum.OrderCount, Spent: sum.Spent, LastOrderAt: sum.LastOrderAt, Orders: []apigen.OrderSummary{},
		}
		orders, err := q.CustomerOrders(ctx, uuid.NullUUID{UUID: r.ID, Valid: true})
		for _, o := range orders {
			out.Orders = append(out.Orders, toOrderSummary(dbq.Order{
				ID: o.ID, Number: o.Number, Status: o.Status, CustomerName: o.CustomerName, Phone: o.Phone, District: o.District,
				PaymentMethod: o.PaymentMethod, Total: o.Total, Currency: o.Currency, CreatedAt: o.CreatedAt,
			}, o.ItemCount))
		}
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That customer")
	}
	if err != nil {
		return nil, fmt.Errorf("customer: %w", err)
	}
	return apigen.AdminGetCustomer200JSONResponse(out), nil
}

func toCustomer(id uuid.UUID, name string, email, phone *string, created, disabled pgtype.Timestamptz, orders int32, spent int64, last pgtype.Timestamptz) apigen.CustomerSummary {
	out := apigen.CustomerSummary{
		Id: id, Name: name, Email: email, Phone: phone, CreatedAt: created.Time,
		OrderCount: int(orders), Spent: spent,
	}
	if disabled.Valid {
		yes := true
		out.Disabled = &yes
	}
	if last.Valid {
		out.LastOrderAt = &last.Time
	}
	return out
}
