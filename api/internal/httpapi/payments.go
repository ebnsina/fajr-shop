package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/payment"
	"github.com/ebnsina/fajr-shop/api/internal/provider"
)

type paymentMethod = struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

func (s *Server) ListPaymentMethods(ctx context.Context, _ apigen.ListPaymentMethodsRequestObject) (apigen.ListPaymentMethodsResponseObject, error) {
	methods, err := s.paymentMethods(ctx)
	if err != nil {
		return nil, err
	}
	out := apigen.ListPaymentMethods200JSONResponse{Items: []paymentMethod{}}
	for _, p := range methods {
		out.Items = append(out.Items, paymentMethod{p.Code, p.Name})
	}
	return out, nil
}

// paymentMethods are the gateways that are on and that customers can pay through from here.
func (s *Server) paymentMethods(ctx context.Context) ([]provider.Provider, error) {
	rows, err := s.q.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("payment methods: %w", err)
	}
	var out []provider.Provider
	for _, r := range rows {
		if p, ok := provider.ByCode(r.Code); ok && p.Kind == provider.Payment && r.Enabled && payment.Supports(p.Code) {
			out = append(out, p)
		}
	}
	return out, nil
}

func (s *Server) StartPayment(ctx context.Context, req apigen.StartPaymentRequestObject) (apigen.StartPaymentResponseObject, error) {
	prov, a, err := s.paymentAccount(ctx, req.Body.Provider, true)
	if err != nil {
		return nil, err
	}
	var digest []byte
	if t := req.Body.Token; t != nil && *t != "" {
		digest = auth.Digest(*t)
	}
	var order dbq.Order
	var items int
	id := make([]byte, 4)
	_, _ = rand.Read(id) // crypto/rand.Read never fails
	tranID := fmt.Sprintf("FS%d-%s", req.Number, hex.EncodeToString(id))
	err = s.scopedAs(ctx, digest, func(q *dbq.Queries) error {
		if order, err = q.OrderByNumber(ctx, req.Number); err != nil {
			return err
		}
		if order.PaymentMethod != "online" || order.PaidAt.Valid || order.Status == dbq.OrderStatusCancelled {
			return &apiError{http.StatusConflict, apigen.StatusChanged, "This order doesn't need paying online.", nil}
		}
		lines, err := q.OrderItems(ctx, order.ID)
		if err != nil {
			return err
		}
		for _, l := range lines {
			items += int(l.Quantity)
		}
		_, err = q.CreatePayment(ctx, dbq.CreatePaymentParams{OrderID: order.ID, Provider: prov.Code, TranID: tranID, Amount: order.Total})
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("start payment: %w", err)
	}
	back := s.shopURL + "/pay/" + prov.Code + "?r="
	url, err := payment.Start(ctx, prov.Code, a.values, a.live, payment.Charge{
		TranID: tranID, Amount: order.Total, Name: order.CustomerName, Email: ptrOr(order.Email), Phone: strings.TrimPrefix(order.Phone, "+88"),
		Address: order.Address + ", " + order.Area, City: order.District, Items: items,
		SuccessURL: back + "success", FailURL: back + "fail", CancelURL: back + "cancel",
	})
	if err != nil {
		return nil, paymentError(prov, err)
	}
	return apigen.StartPayment200JSONResponse{Url: url}, nil
}

func (s *Server) ConfirmPayment(ctx context.Context, req apigen.ConfirmPaymentRequestObject) (apigen.ConfirmPaymentResponseObject, error) {
	prov, a, err := s.paymentAccount(ctx, req.Provider, false)
	if err != nil {
		return nil, err
	}
	paid, err := payment.Confirm(ctx, prov.Code, a.values, a.live, req.Body.ValId)
	if err != nil {
		return nil, paymentError(prov, err)
	}
	var number int64
	var moved *dbq.Order
	// The gateway vouched for this payment, so it's recorded with staff's reach, not the caller's.
	err = s.asSystem(ctx, func(q *dbq.Queries) error {
		pay, err := q.PaymentByTranID(ctx, paid.TranID)
		if err != nil {
			return err
		}
		o, err := q.OrderByID(ctx, pay.OrderID)
		if err != nil {
			return err
		}
		number = o.Number
		if pay.Status == "paid" {
			return nil // the customer's return and the gateway's notice both arrive; the second does nothing
		}
		if pay.Provider != prov.Code || paid.Amount != pay.Amount {
			slog.Warn("payment mismatch", "tran_id", pay.TranID, "provider", prov.Code, "paid", paid.Amount, "expected", pay.Amount)
			return &apiError{http.StatusUnprocessableEntity, apigen.PaymentError, "This payment doesn't match the order. Contact the shop.", nil}
		}
		ref := paid.Ref
		if err := q.MarkPaymentPaid(ctx, dbq.MarkPaymentPaidParams{ID: pay.ID, GatewayRef: &ref}); err != nil {
			return err
		}
		o, err = q.MarkOrderPaid(ctx, o.ID)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // paid through an earlier try already
		}
		if err != nil {
			return err
		}
		note := "Paid " + taka(pay.Amount) + " online with " + prov.Name
		moved = &o
		return q.AddOrderEvent(ctx, dbq.AddOrderEventParams{OrderID: o.ID, Status: o.Status, Note: &note})
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That payment")
	}
	if err != nil {
		return nil, fmt.Errorf("confirm payment: %w", err)
	}
	if moved != nil {
		slog.InfoContext(ctx, "order paid", "order", moved.Number, "provider", prov.Code)
	}
	return apigen.ConfirmPayment200JSONResponse{Number: number}, nil
}

func (s *Server) SwitchToCashOnDelivery(ctx context.Context, req apigen.SwitchToCashOnDeliveryRequestObject) (apigen.SwitchToCashOnDeliveryResponseObject, error) {
	var digest []byte
	if t := req.Body.Token; t != nil && *t != "" {
		digest = auth.Digest(*t)
	}
	// Reading it as the caller proves they may; changing it needs staff's reach, which customers lack.
	var order dbq.Order
	err := s.scopedAs(ctx, digest, func(q *dbq.Queries) error {
		var err error
		order, err = q.OrderByNumber(ctx, req.Number)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("switch to cod: %w", err)
	}
	var out apigen.Order
	err = s.asSystem(ctx, func(q *dbq.Queries) error {
		o, err := q.SwitchToCOD(ctx, order.ID)
		if errors.Is(err, pgx.ErrNoRows) {
			return &apiError{http.StatusConflict, apigen.StatusChanged, "This order can't change to cash on delivery now.", nil}
		}
		if err != nil {
			return err
		}
		note := "Changed to cash on delivery"
		if err := q.AddOrderEvent(ctx, dbq.AddOrderEventParams{OrderID: o.ID, Status: o.Status, Note: &note}); err != nil {
			return err
		}
		out, err = loadOrder(ctx, q, o)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("switch to cod: %w", err)
	}
	return apigen.SwitchToCashOnDelivery200JSONResponse(out), nil
}

// asSystem runs fn with staff's reach over orders, for changes the API itself vouches for.
func (s *Server) asSystem(ctx context.Context, fn func(q *dbq.Queries) error) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT set_config('app.orders', 'on', true)`); err != nil {
			return err
		}
		return fn(s.q.WithTx(tx))
	})
}

// paymentAccount is a gateway customers can pay through and its keys; on says it must be switched on.
func (s *Server) paymentAccount(ctx context.Context, code string, on bool) (provider.Provider, account, error) {
	prov, ok := provider.ByCode(code)
	if !ok || prov.Kind != provider.Payment || !payment.Supports(code) {
		return prov, account{}, invalid(map[string]string{"provider": "Choose a way to pay."})
	}
	row, err := s.q.ProviderByCode(ctx, code)
	if errors.Is(err, pgx.ErrNoRows) {
		return prov, account{}, invalid(map[string]string{"provider": "Paying with " + prov.Name + " isn't available."})
	}
	if err != nil {
		return prov, account{}, fmt.Errorf("payment account: %w", err)
	}
	a, err := s.openAccount(code, &row)
	if err != nil {
		return prov, a, err
	}
	if on && !a.enabled {
		return prov, a, invalid(map[string]string{"provider": "Paying with " + prov.Name + " isn't available."})
	}
	return prov, a, nil
}

func paymentError(prov provider.Provider, err error) error {
	if r, ok := errors.AsType[*payment.Refused](err); ok {
		slog.Warn("payment refused", "gateway", prov.Code, "reason", r.Message)
		return &apiError{http.StatusUnprocessableEntity, apigen.PaymentError, prov.Name + " didn't accept this payment: " + r.Message, nil}
	}
	slog.Warn("payment gateway unreachable", "gateway", prov.Code, "err", err)
	return &apiError{http.StatusBadGateway, apigen.PaymentError, "We couldn't reach " + prov.Name + ". Try again in a minute.", nil}
}
