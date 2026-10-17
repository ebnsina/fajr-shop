package httpapi

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"

	"github.com/riverqueue/river"

	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/provider"
	"github.com/ebnsina/fajr-shop/api/internal/sms"
)

// smsArgs is one text to one customer, written when the order changed and sent in the background.
type smsArgs struct {
	Phone string `json:"phone"`
	Text  string `json:"text"`
}

func (smsArgs) Kind() string { return "sms" }

type smsWorker struct {
	river.WorkerDefaults[smsArgs]
	s *Server
}

func (w *smsWorker) Work(ctx context.Context, job *river.Job[smsArgs]) error {
	code, keys, err := w.s.smsGateway(ctx)
	if err != nil {
		return err
	}
	if code == "" {
		return nil // switched off since this was queued
	}
	err = sms.Send(ctx, code, keys, job.Args.Phone, job.Args.Text)
	if r, ok := errors.AsType[*sms.Refused](err); ok {
		slog.Warn("sms refused", "gateway", code, "reason", r.Message)
		return river.JobCancel(err) // a wrong key won't come right by retrying
	}
	return err
}

// smsGateway is the SMS gateway that's switched on, if any; one is on at a time.
func (s *Server) smsGateway(ctx context.Context) (string, map[string]string, error) {
	rows, err := s.q.ListProviders(ctx)
	if err != nil {
		return "", nil, fmt.Errorf("sms gateway: %w", err)
	}
	for _, r := range rows {
		if p, ok := provider.ByCode(r.Code); ok && p.Kind == provider.SMS && r.Enabled {
			a, err := s.openAccount(r.Code, &r)
			return r.Code, a.values, err
		}
	}
	return "", nil, nil
}

// textCustomer queues a text about where the order is now. It runs after the change is saved; a
// text that can't be queued is logged and never undoes the change.
func (s *Server) textCustomer(ctx context.Context, o dbq.Order, courier string, tracking *string) {
	code, _, err := s.smsGateway(ctx)
	if err != nil || code == "" {
		if err != nil {
			slog.ErrorContext(ctx, "sms: gateway", "err", err)
		}
		return
	}
	store, err := s.q.GetStoreSettings(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "sms: store", "err", err)
		return
	}
	text := orderText(store, o, courier, tracking)
	if text == "" {
		return
	}
	phone := strings.TrimPrefix(o.Phone, "+88")
	if _, err := s.jobs.Insert(ctx, smsArgs{Phone: phone, Text: text}, &river.InsertOpts{MaxAttempts: 5}); err != nil {
		slog.ErrorContext(ctx, "sms: queue", "order", o.Number, "err", err)
	}
}

// orderText is the text for an order's new status; packed orders aren't worth a text.
func orderText(store dbq.StoreSetting, o dbq.Order, courier string, tracking *string) string {
	n := "#" + strconv.FormatInt(o.Number, 10)
	switch o.Status {
	case dbq.OrderStatusPending:
		if o.PaymentMethod == "online" {
			return fmt.Sprintf("%s: We got your order %s for %s. We'll confirm it once it's paid.", store.Name, n, taka(o.Total))
		}
		return fmt.Sprintf("%s: We got your order %s for %s, cash on delivery. We'll call you to confirm.", store.Name, n, taka(o.Total))
	case dbq.OrderStatusConfirmed:
		return fmt.Sprintf("%s: Order %s is confirmed. We'll send it soon.", store.Name, n)
	case dbq.OrderStatusShipped:
		t := fmt.Sprintf("%s: Order %s is on the way", store.Name, n)
		if courier != "" {
			t += " with " + courier
		}
		if tracking != nil && *tracking != "" {
			t += ", tracking " + *tracking
		}
		if o.PaidAt.Valid {
			return t + "."
		}
		return t + ". Please keep " + taka(o.Total) + " ready."
	case dbq.OrderStatusDelivered:
		return fmt.Sprintf("%s: Order %s is delivered. Thank you for shopping with us!", store.Name, n)
	case dbq.OrderStatusCancelled:
		t := fmt.Sprintf("%s: Order %s is cancelled.", store.Name, n)
		if store.ContactPhone != nil {
			t += " Questions? Call " + *store.ContactPhone + "."
		}
		return t
	}
	return ""
}

// taka writes poisha as ৳1,700 or ৳1,700.50.
func taka(poisha int64) string {
	whole, frac := strconv.FormatInt(poisha/100, 10), poisha%100
	for i := len(whole) - 3; i > 0; i -= 3 {
		whole = whole[:i] + "," + whole[i:]
	}
	if frac != 0 {
		return fmt.Sprintf("৳%s.%02d", whole, frac)
	}
	return "৳" + whole
}
