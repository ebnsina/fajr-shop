package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/shipping"
)

func (s *Server) ListDistricts(context.Context, apigen.ListDistrictsRequestObject) (apigen.ListDistrictsResponseObject, error) {
	items := make([]apigen.District, len(shipping.Districts))
	for i, d := range shipping.Districts {
		items[i] = apigen.District{Name: d.Name, Division: d.Division}
	}
	return apigen.ListDistricts200JSONResponse{
		Body: struct {
			Items []apigen.District `json:"items"`
		}{items},
		Headers: apigen.ListDistricts200ResponseHeaders{CacheControl: "public, max-age=86400"},
	}, nil
}

func (s *Server) ListShippingZones(ctx context.Context, _ apigen.ListShippingZonesRequestObject) (apigen.ListShippingZonesResponseObject, error) {
	rows, err := s.q.ListShippingZones(ctx, false)
	if err != nil {
		return nil, fmt.Errorf("list zones: %w", err)
	}
	return apigen.ListShippingZones200JSONResponse{
		Body: struct {
			Items []apigen.ShippingZone `json:"items"`
		}{toZones(rows)},
		Headers: apigen.ListShippingZones200ResponseHeaders{CacheControl: "public, max-age=60"},
	}, nil
}

func (s *Server) QuoteCartShipping(ctx context.Context, req apigen.QuoteCartShippingRequestObject) (apigen.QuoteCartShippingResponseObject, error) {
	district := req.Body.District
	if !shipping.IsDistrict(district) {
		return nil, invalid(map[string]string{"district": "Choose your district from the list."})
	}
	zone, err := s.q.ZoneForDistrict(ctx, district)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &apiError{http.StatusUnprocessableEntity, apigen.NotDeliverable, "Sorry, we don't deliver to " + district + " yet.", nil}
	}
	if err != nil {
		return nil, fmt.Errorf("quote: zone: %w", err)
	}
	cart, _, found, err := cartFor(ctx, s.q, req.Params.XCartToken, false)
	if err != nil {
		return nil, err
	}
	var weight int32
	var subtotal int64
	if found {
		if weight, err = s.q.CartWeight(ctx, cart.ID); err != nil {
			return nil, fmt.Errorf("quote: weight: %w", err)
		}
		c, err := s.loadCart(ctx, s.q, cart.ID)
		if err != nil {
			return nil, err
		}
		subtotal = c.Subtotal
	}
	charge, free := zoneRate(zone).Charge(int(weight), subtotal)
	return apigen.QuoteCartShipping200JSONResponse{
		District: district, ZoneId: zone.ID, ZoneName: zone.Name, Charge: charge, Free: free,
		DeliveryDays: zone.DeliveryDays, WeightG: int(weight), Subtotal: subtotal,
	}, nil
}

func (s *Server) AdminListShippingZones(ctx context.Context, _ apigen.AdminListShippingZonesRequestObject) (apigen.AdminListShippingZonesResponseObject, error) {
	if _, err := need(ctx, auth.StoreWrite); err != nil {
		return nil, err
	}
	rows, err := s.q.ListShippingZones(ctx, true)
	if err != nil {
		return nil, fmt.Errorf("list zones: %w", err)
	}
	return apigen.AdminListShippingZones200JSONResponse{Items: toZones(rows)}, nil
}

func (s *Server) CreateShippingZone(ctx context.Context, req apigen.CreateShippingZoneRequestObject) (apigen.CreateShippingZoneResponseObject, error) {
	z, err := s.saveZone(ctx, uuid.Nil, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.CreateShippingZone201JSONResponse(z), nil
}

func (s *Server) UpdateShippingZone(ctx context.Context, req apigen.UpdateShippingZoneRequestObject) (apigen.UpdateShippingZoneResponseObject, error) {
	z, err := s.saveZone(ctx, req.Id, *req.Body)
	if err != nil {
		return nil, err
	}
	return apigen.UpdateShippingZone200JSONResponse(z), nil
}

// saveZone creates a zone (id is Nil) or replaces one, refusing districts another active zone has.
func (s *Server) saveZone(ctx context.Context, id uuid.UUID, in apigen.ShippingZoneInput) (apigen.ShippingZone, error) {
	p, err := need(ctx, auth.StoreWrite)
	if err != nil {
		return apigen.ShippingZone{}, err
	}
	name := strings.TrimSpace(in.Name)
	days := strings.TrimSpace(in.DeliveryDays)
	errs := map[string]string{}
	if name == "" {
		errs["name"] = "Give the zone a name, like Inside Dhaka."
	}
	if days == "" {
		errs["delivery_days"] = "Say how long delivery takes, like 1–2 days."
	}
	for _, d := range in.Districts {
		if !shipping.IsDistrict(d) {
			errs["districts"] = d + " isn't a district we know."
		}
	}
	if len(errs) > 0 {
		return apigen.ShippingZone{}, invalid(errs)
	}
	active := in.Active == nil || *in.Active
	params := dbq.CreateShippingZoneParams{
		Name: name, Districts: slices.Sorted(slices.Values(in.Districts)), BaseCharge: in.BaseCharge,
		BaseWeightG: 1000, DeliveryDays: days, Active: active,
	}
	if in.BaseWeightG != nil {
		params.BaseWeightG = int32(*in.BaseWeightG)
	}
	if in.ExtraPerKg != nil {
		params.ExtraPerKg = *in.ExtraPerKg
	}
	if in.FreeOver != nil {
		params.FreeOver = pgtype.Int8{Int64: *in.FreeOver, Valid: true}
	}
	if in.Position != nil {
		params.Position = int32(*in.Position)
	}

	var saved dbq.ShippingZone
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if err := q.LockShippingZones(ctx); err != nil {
			return err
		}
		if active {
			taken, err := q.DistrictsTakenElsewhere(ctx, dbq.DistrictsTakenElsewhereParams{ID: id, Districts: params.Districts})
			if err != nil {
				return err
			}
			if len(taken) > 0 {
				return invalid(map[string]string{"districts": fmt.Sprintf("%s is already in %s. A district can be in one zone only.", taken[0].District, taken[0].Name)})
			}
		}
		var before any
		if id == uuid.Nil {
			saved, err = q.CreateShippingZone(ctx, params)
		} else {
			old, err := q.ShippingZoneByID(ctx, id)
			if errors.Is(err, pgx.ErrNoRows) {
				return notFound("That zone")
			}
			if err != nil {
				return err
			}
			before = toZone(old)
			saved, err = q.UpdateShippingZone(ctx, dbq.UpdateShippingZoneParams{
				ID: id, Name: params.Name, Districts: params.Districts, BaseCharge: params.BaseCharge, BaseWeightG: params.BaseWeightG,
				ExtraPerKg: params.ExtraPerKg, FreeOver: params.FreeOver, DeliveryDays: params.DeliveryDays, Position: params.Position, Active: params.Active,
			})
			if err != nil {
				return err
			}
		}
		if err != nil {
			return err
		}
		action := "shipping_zone.create"
		if before != nil {
			action = "shipping_zone.update"
		}
		return s.audit(ctx, q, p, action, "shipping_zone", saved.ID.String(), before, toZone(saved))
	})
	if err != nil {
		return apigen.ShippingZone{}, fmt.Errorf("save zone: %w", err)
	}
	return toZone(saved), nil
}

func (s *Server) DeleteShippingZone(ctx context.Context, req apigen.DeleteShippingZoneRequestObject) (apigen.DeleteShippingZoneResponseObject, error) {
	p, err := need(ctx, auth.StoreWrite)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		z, err := q.DeleteShippingZone(ctx, req.Id)
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "shipping_zone.delete", "shipping_zone", z.ID.String(), toZone(z), nil)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That zone")
	}
	if err != nil {
		return nil, fmt.Errorf("delete zone: %w", err)
	}
	return apigen.DeleteShippingZone204Response{}, nil
}

func zoneRate(z dbq.ShippingZone) shipping.Rate {
	r := shipping.Rate{BaseCharge: z.BaseCharge, BaseWeightG: int(z.BaseWeightG), ExtraPerKg: z.ExtraPerKg}
	if z.FreeOver.Valid {
		r.FreeOver = &z.FreeOver.Int64
	}
	return r
}

func toZone(z dbq.ShippingZone) apigen.ShippingZone {
	out := apigen.ShippingZone{
		Id: z.ID, Name: z.Name, Districts: z.Districts, BaseCharge: z.BaseCharge, BaseWeightG: int(z.BaseWeightG),
		ExtraPerKg: z.ExtraPerKg, DeliveryDays: z.DeliveryDays, Position: int(z.Position), Active: z.Active,
	}
	if z.FreeOver.Valid {
		out.FreeOver = &z.FreeOver.Int64
	}
	return out
}

func toZones(rows []dbq.ShippingZone) []apigen.ShippingZone {
	out := make([]apigen.ShippingZone, len(rows))
	for i, z := range rows {
		out[i] = toZone(z)
	}
	return out
}
