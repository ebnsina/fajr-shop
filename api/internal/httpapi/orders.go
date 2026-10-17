package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/shipping"
)

// The moves the shop can make from each status. Delivered and cancelled are the end.
var nextStatuses = map[dbq.OrderStatus][]dbq.OrderStatus{
	dbq.OrderStatusPending:   {dbq.OrderStatusConfirmed, dbq.OrderStatusCancelled},
	dbq.OrderStatusConfirmed: {dbq.OrderStatusPacked, dbq.OrderStatusCancelled},
	dbq.OrderStatusPacked:    {dbq.OrderStatusShipped, dbq.OrderStatusCancelled},
	dbq.OrderStatusShipped:   {dbq.OrderStatusDelivered},
}

func cartChanged(msg string) error {
	return &apiError{http.StatusConflict, apigen.CartChanged, msg, nil}
}

func (s *Server) PlaceOrder(ctx context.Context, req apigen.PlaceOrderRequestObject) (apigen.PlaceOrderResponseObject, error) {
	in := req.Body
	errs := map[string]string{}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		errs["name"] = "Write the name to deliver to."
	}
	phone, ok := auth.NormalizePhone(in.Phone)
	if !ok {
		errs["phone"] = "Write a Bangladeshi mobile number, like 01712345678."
	}
	if !shipping.IsDistrict(in.District) {
		errs["district"] = "Choose your district from the list."
	}
	area, address := strings.TrimSpace(in.Area), strings.TrimSpace(in.Address)
	if area == "" {
		errs["area"] = "Write your thana or area."
	}
	if address == "" {
		errs["address"] = "Write your house, road and a landmark."
	}
	if len(errs) > 0 {
		return nil, invalid(errs)
	}
	var email, note *string
	if in.Email != nil {
		if e := strings.ToLower(strings.TrimSpace(string(*in.Email))); e != "" {
			email = &e
		}
	}
	if in.Note != nil {
		if n := strings.TrimSpace(*in.Note); n != "" {
			note = &n
		}
	}

	cart, _, found, err := cartFor(ctx, s.q, req.Params.XCartToken, false)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, &apiError{http.StatusConflict, apigen.CartEmpty, "Your bag is empty.", nil}
	}
	token, digest := auth.NewToken(auth.PrefixOrder)
	var out apigen.Order
	err = s.scopedAs(ctx, digest, func(q *dbq.Queries) error {
		priced, err := s.loadCart(ctx, q, cart.ID)
		if err != nil {
			return err
		}
		if len(priced.Items) == 0 {
			return &apiError{http.StatusConflict, apigen.CartEmpty, "Your bag is empty.", nil}
		}
		for _, it := range priced.Items {
			if !it.Purchasable {
				return cartChanged(it.Name + " can't be bought as it is in your bag now. Check your bag and try again.")
			}
		}
		if d := priced.Discount; d != nil && !d.Applies {
			return cartChanged("Your discount code " + d.Code + " doesn't apply right now. Remove it or check your bag.")
		}

		// Lock what's being bought, then check nothing moved since the bag was priced.
		ids := make([]uuid.UUID, len(priced.Items))
		for i, it := range priced.Items {
			ids[i] = it.VariantId
		}
		locked, err := q.LockOrderVariants(ctx, ids)
		if err != nil {
			return err
		}
		byID := make(map[uuid.UUID]dbq.LockOrderVariantsRow, len(locked))
		for _, v := range locked {
			byID[v.ID] = v
		}
		var weight int
		for _, it := range priced.Items {
			v, ok := byID[it.VariantId]
			if !ok || v.Status != dbq.ProductStatusActive || v.Price != it.UnitPrice {
				return cartChanged(it.Name + " changed while you were checking out. Check your bag and try again.")
			}
			if int(v.Stock) < it.Quantity {
				msg := it.Name + " is sold out."
				if v.Stock > 0 {
					msg = fmt.Sprintf("Only %d of %s left.", v.Stock, it.Name)
				}
				return &apiError{http.StatusConflict, apigen.InsufficientStock, msg, nil}
			}
			weight += int(v.WeightG) * it.Quantity
		}

		zone, err := q.ZoneForDistrict(ctx, in.District)
		if errors.Is(err, pgx.ErrNoRows) {
			return &apiError{http.StatusUnprocessableEntity, apigen.NotDeliverable, "Sorry, we don't deliver to " + in.District + " yet.", nil}
		}
		if err != nil {
			return err
		}
		charge, _ := zoneRate(zone).Charge(weight, priced.Subtotal)

		store, err := q.GetStoreSettings(ctx)
		if err != nil {
			return err
		}
		goods := priced.Total // subtotal less the discount
		vat, total := int64(0), goods+charge
		if store.VatEnabled && store.VatRateBp > 0 {
			rate := int64(store.VatRateBp)
			if store.PricesIncludeVat {
				vat = (goods*rate + (10000+rate)/2) / (10000 + rate) // the VAT part of prices that include it
			} else {
				// ponytail: VAT on the goods only, not on delivery; check with the shop's accountant.
				vat = (goods*rate + 5000) / 10000
				total += vat
			}
		}

		var code *string
		if d := priced.Discount; d != nil {
			dc, err := q.CartDiscount(ctx, cart.ID)
			if err != nil {
				return err
			}
			if n, err := q.UseDiscount(ctx, dc.ID); err != nil {
				return err
			} else if n == 0 {
				return cartChanged("Your discount code " + d.Code + " has just been used up. Remove it to order without it.")
			}
			code = &d.Code
		}

		user := uuid.NullUUID{}
		if id := callerUserID(ctx); id != uuid.Nil {
			user = uuid.NullUUID{UUID: id, Valid: true}
		}
		order, err := q.CreateOrder(ctx, dbq.CreateOrderParams{
			UserID: user, TokenHash: digest, PaymentMethod: string(in.PaymentMethod), CustomerName: name, Phone: phone,
			Email: email, District: in.District, Area: area, Address: address, Note: note, Subtotal: priced.Subtotal,
			DiscountCode: code, DiscountTotal: priced.DiscountTotal, ZoneName: zone.Name, DeliveryDays: zone.DeliveryDays,
			DeliveryCharge: charge, VatRateBp: store.VatRateBp, VatIncluded: store.PricesIncludeVat, VatTotal: vat, Total: total,
		})
		if err != nil {
			return err
		}
		for i, it := range priced.Items {
			v := byID[it.VariantId]
			if err := q.AddOrderItem(ctx, dbq.AddOrderItemParams{
				OrderID: order.ID, Position: int32(i), VariantID: uuid.NullUUID{UUID: v.ID, Valid: true},
				ProductID: uuid.NullUUID{UUID: v.ProductID, Valid: true}, Slug: v.Slug, Name: v.Name, Options: v.Options,
				Sku: v.Sku, UnitPrice: v.Price, Quantity: int32(it.Quantity), LineTotal: it.LineTotal,
			}); err != nil {
				return err
			}
			if n, err := q.TakeStock(ctx, dbq.TakeStockParams{ID: v.ID, Quantity: int32(it.Quantity)}); err != nil || n == 0 {
				return errors.Join(err, errors.New("stock moved under a lock"))
			}
			if err := q.OrderStockMovement(ctx, dbq.OrderStockMovementParams{
				VariantID: v.ID, Delta: -int32(it.Quantity), Reason: "sold", OrderID: uuid.NullUUID{UUID: order.ID, Valid: true}, ActorUserID: user,
			}); err != nil {
				return err
			}
		}
		if err := q.AddOrderEvent(ctx, dbq.AddOrderEventParams{OrderID: order.ID, Status: dbq.OrderStatusPending}); err != nil {
			return err
		}
		if err := q.EmptyCart(ctx, cart.ID); err != nil {
			return err
		}
		out, err = loadOrder(ctx, q, order)
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("place order: %w", err)
	}
	return apigen.PlaceOrder201JSONResponse{Order: out, Token: token}, nil
}

func (s *Server) GetOrder(ctx context.Context, req apigen.GetOrderRequestObject) (apigen.GetOrderResponseObject, error) {
	var digest []byte
	if t := req.Params.Token; t != nil && *t != "" {
		digest = auth.Digest(*t)
	}
	var out apigen.Order
	err := s.scopedAs(ctx, digest, func(q *dbq.Queries) error {
		o, err := q.OrderByNumber(ctx, req.Number)
		if err != nil {
			return err
		}
		out, err = loadOrder(ctx, q, o)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order") // also when it exists but isn't the caller's
	}
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}
	return apigen.GetOrder200JSONResponse(out), nil
}

func (s *Server) ListMyOrders(ctx context.Context, _ apigen.ListMyOrdersRequestObject) (apigen.ListMyOrdersResponseObject, error) {
	if _, err := needUser(ctx); err != nil {
		return nil, err
	}
	items := []apigen.OrderSummary{}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.MyOrders(ctx)
		for _, r := range rows {
			items = append(items, toOrderSummary(dbq.Order{
				ID: r.ID, Number: r.Number, Status: r.Status, CustomerName: r.CustomerName, Phone: r.Phone, District: r.District,
				PaymentMethod: r.PaymentMethod, Total: r.Total, Currency: r.Currency, CreatedAt: r.CreatedAt,
			}, r.ItemCount))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("my orders: %w", err)
	}
	return apigen.ListMyOrders200JSONResponse{Items: items}, nil
}

func (s *Server) AdminListOrders(ctx context.Context, req apigen.AdminListOrdersRequestObject) (apigen.AdminListOrdersResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	limit := limitOr(req.Params.Limit)
	params := dbq.AdminOrdersParams{Lim: int32(limit + 1)}
	if st := req.Params.Status; st != nil {
		params.Status = dbq.NullOrderStatus{OrderStatus: dbq.OrderStatus(*st), Valid: true}
	}
	params.Q, params.NameLike, params.Digits = searchTerms(ptrOr(req.Params.Q))
	if c := req.Params.Cursor; c != nil {
		n, err := strconv.ParseInt(*c, 10, 64)
		if err != nil {
			return nil, errBadCursor
		}
		params.Before = pgtype.Int8{Int64: n, Valid: true}
	}
	out := apigen.AdminListOrders200JSONResponse{Items: []apigen.OrderSummary{}}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		rows, err := q.AdminOrders(ctx, params)
		for i, r := range rows {
			if i == limit {
				next := strconv.FormatInt(rows[i-1].Number, 10)
				out.NextCursor = &next
				break
			}
			out.Items = append(out.Items, toOrderSummary(dbq.Order{
				ID: r.ID, Number: r.Number, Status: r.Status, CustomerName: r.CustomerName, Phone: r.Phone, District: r.District,
				PaymentMethod: r.PaymentMethod, Total: r.Total, Currency: r.Currency, CreatedAt: r.CreatedAt,
			}, r.ItemCount))
		}
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("admin orders: %w", err)
	}
	return out, nil
}

func (s *Server) AdminGetOrder(ctx context.Context, req apigen.AdminGetOrderRequestObject) (apigen.AdminGetOrderResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	var out apigen.Order
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		o, err := q.OrderByNumber(ctx, req.Number)
		if err != nil {
			return err
		}
		out, err = loadOrder(ctx, q, o)
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("admin order: %w", err)
	}
	return apigen.AdminGetOrder200JSONResponse(out), nil
}

func (s *Server) SetOrderStatus(ctx context.Context, req apigen.SetOrderStatusRequestObject) (apigen.SetOrderStatusResponseObject, error) {
	p, err := need(ctx, auth.OrdersWrite)
	if err != nil {
		return nil, err
	}
	from, to := dbq.OrderStatus(req.Body.From), dbq.OrderStatus(req.Body.To)
	if !slices.Contains(nextStatuses[from], to) {
		return nil, invalid(map[string]string{"to": fmt.Sprintf("An order that is %s can't be moved to %s.", from, to)})
	}
	var note *string
	if req.Body.Note != nil {
		if n := strings.TrimSpace(*req.Body.Note); n != "" {
			note = &n
		}
	}
	actor := uuid.NullUUID{}
	if p.sessionID != uuid.Nil {
		actor = uuid.NullUUID{UUID: p.userID, Valid: true}
	}
	var out apigen.Order
	err = s.scoped(ctx, func(q *dbq.Queries) error {
		o, err := q.OrderByNumber(ctx, req.Number)
		if err != nil {
			return err
		}
		o, err = q.SetOrderStatus(ctx, dbq.SetOrderStatusParams{ID: o.ID, Status: to, Was: from})
		if errors.Is(err, pgx.ErrNoRows) {
			return &apiError{http.StatusConflict, apigen.StatusChanged, "Someone else changed this order first. Look at it again.", nil}
		}
		if err != nil {
			return err
		}
		if to == dbq.OrderStatusCancelled {
			items, err := q.OrderItems(ctx, o.ID)
			if err != nil {
				return err
			}
			for _, it := range items {
				if !it.VariantID.Valid {
					continue // the variant was deleted since; nothing to put back
				}
				if err := q.ReturnStock(ctx, dbq.ReturnStockParams{ID: it.VariantID.UUID, Quantity: it.Quantity}); err != nil {
					return err
				}
				if err := q.OrderStockMovement(ctx, dbq.OrderStockMovementParams{
					VariantID: it.VariantID.UUID, Delta: it.Quantity, Reason: "cancelled", OrderID: uuid.NullUUID{UUID: o.ID, Valid: true}, ActorUserID: actor,
				}); err != nil {
					return err
				}
			}
		}
		if err := q.AddOrderEvent(ctx, dbq.AddOrderEventParams{OrderID: o.ID, Status: to, Note: note, ActorUserID: actor}); err != nil {
			return err
		}
		if out, err = loadOrder(ctx, q, o); err != nil {
			return err
		}
		return s.audit(ctx, q, p, "order."+string(to), "order", strconv.FormatInt(o.Number, 10), map[string]any{"status": from}, map[string]any{"status": to})
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("set order status: %w", err)
	}
	return apigen.SetOrderStatus200JSONResponse(out), nil
}

func toOrderSummary(o dbq.Order, itemCount int32) apigen.OrderSummary {
	return apigen.OrderSummary{
		Id: o.ID, Number: o.Number, Status: apigen.OrderStatus(o.Status), CustomerName: o.CustomerName, Phone: o.Phone,
		District: o.District, PaymentMethod: apigen.PaymentMethod(o.PaymentMethod), ItemCount: int(itemCount), Total: o.Total,
		Currency: o.Currency, CreatedAt: o.CreatedAt.Time,
	}
}

// loadOrder is an order with its lines and timeline, as the caller may see it.
func loadOrder(ctx context.Context, q *dbq.Queries, o dbq.Order) (apigen.Order, error) {
	items, err := q.OrderItems(ctx, o.ID)
	if err != nil {
		return apigen.Order{}, fmt.Errorf("order items: %w", err)
	}
	events, err := q.OrderEvents(ctx, o.ID)
	if err != nil {
		return apigen.Order{}, fmt.Errorf("order events: %w", err)
	}
	out := apigen.Order{
		Id: o.ID, Number: o.Number, Status: apigen.OrderStatus(o.Status), CustomerName: o.CustomerName, Phone: o.Phone,
		Email: o.Email, District: o.District, Area: o.Area, Address: o.Address, Note: o.Note,
		PaymentMethod: apigen.PaymentMethod(o.PaymentMethod), Subtotal: o.Subtotal, DiscountCode: o.DiscountCode,
		DiscountTotal: o.DiscountTotal, ZoneName: o.ZoneName, DeliveryDays: o.DeliveryDays, DeliveryCharge: o.DeliveryCharge,
		VatRateBp: int(o.VatRateBp), VatIncluded: o.VatIncluded, VatTotal: o.VatTotal, Total: o.Total, Currency: o.Currency,
		CreatedAt: o.CreatedAt.Time, Items: []apigen.OrderItem{}, Events: []apigen.OrderEvent{}, NextStatuses: []apigen.OrderStatus{},
	}
	for _, it := range items {
		x := apigen.OrderItem{
			Slug: it.Slug, Name: it.Name, Sku: it.Sku, UnitPrice: it.UnitPrice, Quantity: int(it.Quantity),
			LineTotal: it.LineTotal, Options: map[string]string{},
		}
		if it.ProductID.Valid {
			x.ProductId = &it.ProductID.UUID
		}
		if err := json.Unmarshal(it.Options, &x.Options); err != nil {
			return out, fmt.Errorf("order item options: %w", err)
		}
		out.Items = append(out.Items, x)
		out.ItemCount += x.Quantity
	}
	for _, e := range events {
		out.Events = append(out.Events, apigen.OrderEvent{Status: apigen.OrderStatus(e.Status), Note: e.Note, Actor: e.Actor, CreatedAt: e.CreatedAt.Time})
	}
	for _, n := range nextStatuses[o.Status] {
		out.NextStatuses = append(out.NextStatuses, apigen.OrderStatus(n))
	}
	return out, nil
}

func ptrOr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// searchTerms reads a dashboard search box: nil when empty; else the text, a LIKE pattern with its
// own wildcards escaped, and a phone number's digits (4+, country code and leading 0 dropped).
func searchTerms(raw string) (q, pattern, digits *string) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return nil, nil, nil
	}
	like := strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(text)
	d := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, text)
	d = strings.TrimPrefix(strings.TrimPrefix(d, "88"), "0")
	if len(d) >= 4 {
		digits = &d
	}
	return &text, &like, digits
}
