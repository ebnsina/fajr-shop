package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/courier"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/provider"
)

func (s *Server) AdminListCouriers(ctx context.Context, _ apigen.AdminListCouriersRequestObject) (apigen.AdminListCouriersResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	rows, err := s.q.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("list couriers: %w", err)
	}
	out := apigen.AdminListCouriers200JSONResponse{}
	out.Items = []struct {
		Code string `json:"code"`
		Name string `json:"name"`
	}{}
	for _, r := range rows {
		if p, ok := provider.ByCode(r.Code); ok && p.Kind == provider.Courier && r.Enabled && courier.Supports(p.Code) {
			out.Items = append(out.Items, struct {
				Code string `json:"code"`
				Name string `json:"name"`
			}{p.Code, p.Name})
		}
	}
	return out, nil
}

func (s *Server) BookShipment(ctx context.Context, req apigen.BookShipmentRequestObject) (apigen.BookShipmentResponseObject, error) {
	p, err := need(ctx, auth.OrdersWrite)
	if err != nil {
		return nil, err
	}
	prov, keys, err := s.courierAccount(ctx, req.Body.Provider)
	if err != nil {
		return nil, err
	}

	// Claim the order first, so a second click finds it taken instead of booking twice.
	var order dbq.Order
	var cod int64
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		if order, err = q.OrderByNumber(ctx, req.Number); err != nil {
			return err
		}
		if order.Status != dbq.OrderStatusConfirmed && order.Status != dbq.OrderStatusPacked {
			return &apiError{http.StatusConflict, apigen.StatusChanged, "Only confirmed or packed orders can be sent with a courier.", nil}
		}
		if order.PaidAt.Valid {
			cod = 0 // paid online: the rider collects nothing
		} else {
			cod = order.Total
		}
		_, err := q.ReserveShipment(ctx, dbq.ReserveShipmentParams{OrderID: order.ID, Provider: prov.Code, CodAmount: cod})
		if errors.Is(err, pgx.ErrNoRows) {
			return &apiError{http.StatusConflict, apigen.AlreadyBooked, "This order is already booked with a courier.", nil}
		}
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("book: reserve: %w", err)
	}

	booking, err := courier.Book(ctx, prov.Code, keys, courier.Parcel{
		Invoice: strconv.FormatInt(order.Number, 10),
		Name:    order.CustomerName,
		Phone:   strings.TrimPrefix(order.Phone, "+88"),
		Address: order.Address + ", " + order.Area + ", " + order.District,
		Note:    ptrOr(order.Note),
		COD:     cod,
	})
	if err != nil {
		if dropErr := s.scoped(ctx, func(q *dbq.Queries) error { return q.DropShipment(ctx, order.ID) }); dropErr != nil {
			return nil, fmt.Errorf("book: release after %v: %w", err, dropErr)
		}
		return nil, courierError(prov, err)
	}

	var out apigen.Order
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		if _, err := q.BookedShipment(ctx, dbq.BookedShipmentParams{
			OrderID: order.ID, ConsignmentID: &booking.ConsignmentID, TrackingCode: &booking.TrackingCode, CourierStatus: booking.Status,
		}); err != nil {
			return err
		}
		note := "Sent with " + prov.Name
		if booking.TrackingCode != "" {
			note += " · tracking " + booking.TrackingCode
		}
		o, err := s.moveOrder(ctx, q, p, order, dbq.OrderStatusShipped, note)
		if err != nil {
			return err
		}
		order = o
		if out, err = loadOrder(ctx, q, o); err != nil {
			return err
		}
		return s.audit(ctx, q, p, "shipment.book", "order", strconv.FormatInt(o.Number, 10), nil, out.Shipment)
	})
	if err != nil {
		return nil, fmt.Errorf("book: save: %w", err)
	}
	s.textCustomer(ctx, order, prov.Name, &booking.TrackingCode)
	return apigen.BookShipment200JSONResponse(out), nil
}

func (s *Server) RefreshShipment(ctx context.Context, req apigen.RefreshShipmentRequestObject) (apigen.RefreshShipmentResponseObject, error) {
	p, err := need(ctx, auth.OrdersWrite)
	if err != nil {
		return nil, err
	}
	var order dbq.Order
	var sh dbq.Shipment
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		if order, err = q.OrderByNumber(ctx, req.Number); err != nil {
			return err
		}
		sh, err = q.ShipmentForOrder(ctx, order.ID)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That parcel")
	}
	if err != nil {
		return nil, fmt.Errorf("refresh: %w", err)
	}
	if sh.ConsignmentID == nil {
		return nil, &apiError{http.StatusConflict, apigen.StatusChanged, "This parcel is still being booked. Try again in a moment.", nil}
	}
	prov, keys, err := s.courierAccount(ctx, sh.Provider)
	if err != nil {
		return nil, err
	}
	status, err := courier.Status(ctx, prov.Code, keys, *sh.ConsignmentID)
	if err != nil {
		return nil, courierError(prov, err)
	}

	var out apigen.Order
	var delivered *dbq.Order
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		if _, err := q.SetShipmentStatus(ctx, dbq.SetShipmentStatusParams{OrderID: order.ID, CourierStatus: status}); err != nil {
			return err
		}
		o, err := q.OrderByNumber(ctx, req.Number)
		if err != nil {
			return err
		}
		if courier.Delivered(status) && o.Status == dbq.OrderStatusShipped {
			if o, err = s.moveOrder(ctx, q, p, o, dbq.OrderStatusDelivered, prov.Name+" delivered it"); err != nil {
				return err
			}
			delivered = &o
		}
		out, err = loadOrder(ctx, q, o)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("refresh: save: %w", err)
	}
	if delivered != nil {
		s.textCustomer(ctx, *delivered, prov.Name, nil)
	}
	return apigen.RefreshShipment200JSONResponse(out), nil
}

// moveOrder moves an order on from where it is, with a timeline entry and an audit record.
func (s *Server) moveOrder(ctx context.Context, q *dbq.Queries, p *principal, o dbq.Order, to dbq.OrderStatus, note string) (dbq.Order, error) {
	from := o.Status
	moved, err := q.SetOrderStatus(ctx, dbq.SetOrderStatusParams{ID: o.ID, Status: to, Was: from})
	if errors.Is(err, pgx.ErrNoRows) {
		return o, &apiError{http.StatusConflict, apigen.StatusChanged, "Someone else changed this order first. Look at it again.", nil}
	}
	if err != nil {
		return o, err
	}
	actor := uuid.NullUUID{}
	if p.sessionID != uuid.Nil {
		actor = uuid.NullUUID{UUID: p.userID, Valid: true}
	}
	if err := q.AddOrderEvent(ctx, dbq.AddOrderEventParams{OrderID: o.ID, Status: to, Note: &note, ActorUserID: actor}); err != nil {
		return o, err
	}
	number := strconv.FormatInt(o.Number, 10)
	return moved, s.audit(ctx, q, p, "order."+string(to), "order", number, map[string]any{"status": from}, map[string]any{"status": to})
}

// courierAccount is a switched-on courier and its keys.
func (s *Server) courierAccount(ctx context.Context, code string) (provider.Provider, map[string]string, error) {
	prov, ok := provider.ByCode(code)
	if !ok || prov.Kind != provider.Courier {
		return prov, nil, invalid(map[string]string{"provider": "Choose a courier."})
	}
	row, err := s.q.ProviderByCode(ctx, code)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return prov, nil, fmt.Errorf("courier account: %w", err)
	}
	var r *dbq.Provider
	if err == nil {
		r = &row
	}
	a, err := s.openAccount(code, r)
	if err != nil {
		return prov, nil, err
	}
	if !a.enabled {
		return prov, nil, invalid(map[string]string{"provider": "Switch " + prov.Name + " on in Integrations first."})
	}
	return prov, a.values, nil
}

func courierError(prov provider.Provider, err error) error {
	if r, ok := errors.AsType[*courier.Refused](err); ok {
		return &apiError{http.StatusUnprocessableEntity, apigen.CourierError, prov.Name + " said: " + r.Message, nil}
	}
	if errors.Is(err, courier.ErrUnsupported) {
		return &apiError{http.StatusUnprocessableEntity, apigen.CourierError, "Booking with " + prov.Name + " isn't available yet.", nil}
	}
	slog.Warn("courier call failed", "courier", prov.Code, "err", err)
	return &apiError{http.StatusBadGateway, apigen.CourierError, "We couldn't reach " + prov.Name + ". Try again in a minute.", nil}
}

func toShipment(sh dbq.Shipment) *apigen.Shipment {
	name := sh.Provider
	if p, ok := provider.ByCode(sh.Provider); ok {
		name = p.Name
	}
	return &apigen.Shipment{
		Provider: sh.Provider, ProviderName: name, ConsignmentId: sh.ConsignmentID, TrackingCode: sh.TrackingCode,
		Status: sh.CourierStatus, CodAmount: sh.CodAmount, CreatedAt: sh.CreatedAt.Time,
	}
}
