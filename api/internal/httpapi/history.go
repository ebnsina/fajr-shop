package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/courier"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/provider"
)

func (s *Server) OrderDeliveryHistory(ctx context.Context, req apigen.OrderDeliveryHistoryRequestObject) (apigen.OrderDeliveryHistoryResponseObject, error) {
	if _, err := need(ctx, auth.OrdersWrite); err != nil {
		return nil, err
	}
	var out apigen.DeliveryHistory
	var phone string
	cached := map[string]dbq.PhoneCheck{}
	err := s.scoped(ctx, func(q *dbq.Queries) error {
		o, err := q.OrderByNumber(ctx, req.Number)
		if err != nil {
			return err
		}
		phone = strings.TrimPrefix(o.Phone, "+88")
		own, err := q.PhoneHistory(ctx, dbq.PhoneHistoryParams{Phone: o.Phone, ExceptID: o.ID})
		if err != nil {
			return err
		}
		out.Shop.Delivered, out.Shop.Cancelled, out.Shop.Open = int(own.Delivered), int(own.Cancelled), int(own.Open)
		checks, err := q.RecentPhoneChecks(ctx, phone)
		for _, c := range checks {
			cached[c.Provider] = c
		}
		return err
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That order")
	}
	if err != nil {
		return nil, fmt.Errorf("history: %w", err)
	}

	rows, err := s.q.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("history: couriers: %w", err)
	}
	// Couriers are asked side by side, and none may hold the page up for long.
	lookupCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()
	var wg sync.WaitGroup
	var mu sync.Mutex
	var fresh []dbq.SavePhoneCheckParams
	type job struct {
		i    int
		p    provider.Provider
		keys map[string]string
	}
	var jobs []job
	for _, r := range rows {
		p, ok := provider.ByCode(r.Code)
		if !ok || p.Kind != provider.Courier || !r.Enabled {
			continue
		}
		if _, ok := courier.HistoryKeys[p.Code]; !ok {
			continue
		}
		rec := apigen.CourierRecord{Code: p.Code, Name: p.Name}
		if c, ok := cached[p.Code]; ok {
			d, x := int(c.Delivered), int(c.Cancelled)
			rec.Delivered, rec.Cancelled, rec.CheckedAt = &d, &x, &c.CheckedAt.Time
			out.Couriers = append(out.Couriers, rec)
			continue
		}
		a, err := s.openAccount(p.Code, &r)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, job{len(out.Couriers), p, a.values})
		out.Couriers = append(out.Couriers, rec)
	}
	// Started once the list is complete, so the slice they write into never moves.
	for _, j := range jobs {
		i, p := j.i, j.p
		wg.Go(func() {
			d, x, err := courier.History(lookupCtx, p.Code, j.keys, phone)
			mu.Lock()
			defer mu.Unlock()
			rec := &out.Couriers[i]
			switch {
			case errors.Is(err, courier.ErrUnsupported):
				msg := "Add your " + p.Name + " merchant panel sign-in in Integrations to see this."
				rec.Error = &msg
			case err != nil:
				msg := "Couldn't check " + p.Name + " right now."
				if r, ok := errors.AsType[*courier.Refused](err); ok {
					msg = p.Name + " said: " + r.Message
				} else {
					slog.Warn("courier history failed", "courier", p.Code, "err", err)
				}
				rec.Error = &msg
			default:
				now := time.Now()
				rec.Delivered, rec.Cancelled, rec.CheckedAt = &d, &x, &now
				fresh = append(fresh, dbq.SavePhoneCheckParams{Phone: phone, Provider: p.Code, Delivered: int32(d), Cancelled: int32(x)})
			}
		})
	}
	wg.Wait()
	if len(fresh) > 0 {
		if err := s.scoped(ctx, func(q *dbq.Queries) error {
			for _, f := range fresh {
				if err := q.SavePhoneCheck(ctx, f); err != nil {
					return err
				}
			}
			return nil
		}); err != nil {
			return nil, fmt.Errorf("history: save: %w", err)
		}
	}
	if out.Couriers == nil {
		out.Couriers = []apigen.CourierRecord{}
	}

	out.Delivered, out.Cancelled = out.Shop.Delivered, out.Shop.Cancelled
	for _, c := range out.Couriers {
		if c.Delivered != nil {
			out.Delivered += *c.Delivered
			out.Cancelled += *c.Cancelled
		}
	}
	out.Verdict = verdict(out.Delivered, out.Cancelled)
	return apigen.OrderDeliveryHistory200JSONResponse(out), nil
}

// verdict reads a delivered/cancelled record: 80% or more delivered is good, under half is risky.
func verdict(delivered, cancelled int) apigen.DeliveryHistoryVerdict {
	total := delivered + cancelled
	switch {
	case total == 0:
		return apigen.New
	case delivered*5 >= total*4:
		return apigen.Good
	case delivered*2 >= total:
		return apigen.Mixed
	default:
		return apigen.Risky
	}
}
