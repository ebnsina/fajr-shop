package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/provider"
)

// account is one provider's saved state, its secrets opened.
type account struct {
	enabled, live bool
	values        map[string]string
	row           *dbq.Provider
}

func (s *Server) AdminListProviders(ctx context.Context, _ apigen.AdminListProvidersRequestObject) (apigen.AdminListProvidersResponseObject, error) {
	if _, err := needUserWith(ctx, auth.StoreWrite); err != nil {
		return nil, err
	}
	rows, err := s.q.ListProviders(ctx)
	if err != nil {
		return nil, fmt.Errorf("list providers: %w", err)
	}
	saved := map[string]dbq.Provider{}
	for _, r := range rows {
		saved[r.Code] = r
	}
	items := make([]apigen.Provider, 0, len(provider.All))
	for _, p := range provider.All {
		var row *dbq.Provider
		if r, ok := saved[p.Code]; ok {
			row = &r
		}
		a, err := s.openAccount(p.Code, row)
		if err != nil {
			return nil, err
		}
		items = append(items, toProvider(p, a))
	}
	return apigen.AdminListProviders200JSONResponse{Items: items}, nil
}

func (s *Server) UpdateProvider(ctx context.Context, req apigen.UpdateProviderRequestObject) (apigen.UpdateProviderResponseObject, error) {
	who, err := needUserWith(ctx, auth.StoreWrite)
	if err != nil {
		return nil, err
	}
	p, ok := provider.ByCode(req.Code)
	if !ok {
		return nil, notFound("That provider")
	}
	var out apigen.Provider
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if err := q.LockProvider(ctx, p.Code); err != nil {
			return err
		}
		var row *dbq.Provider
		if r, err := q.ProviderByCode(ctx, p.Code); err == nil {
			row = &r
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		before, err := s.openAccount(p.Code, row)
		if err != nil {
			return err
		}
		after, errs := applyProviderInput(p, before, *req.Body)
		if len(errs) > 0 {
			return invalid(errs)
		}
		settings, secrets := map[string]string{}, map[string]string{}
		for _, f := range p.Fields {
			if v := after.values[f.Key]; v != "" && f.Secret {
				secrets[f.Key] = v
			} else if v != "" {
				settings[f.Key] = v
			}
		}
		sj, _ := json.Marshal(settings) // maps of strings always marshal
		params := dbq.UpsertProviderParams{Code: p.Code, Enabled: after.enabled, Live: after.live, Settings: sj}
		if len(secrets) > 0 {
			plain, _ := json.Marshal(secrets)
			params.Secrets = s.box.Seal(plain, "provider:"+p.Code)
		}
		saved, err := q.UpsertProvider(ctx, params)
		if err != nil {
			return err
		}
		if p.Kind == provider.SMS && saved.Enabled {
			if err := q.DisableProvidersExcept(ctx, dbq.DisableProvidersExceptParams{Keep: p.Code, Codes: provider.Codes(provider.SMS)}); err != nil {
				return err
			}
		}
		after.row = &saved
		out = toProvider(p, after)
		var b any
		if row != nil {
			b = toProvider(p, before)
		}
		return s.audit(ctx, q, who, "provider.update", "provider", p.Code, b, out)
	})
	if err != nil {
		return nil, fmt.Errorf("update provider: %w", err)
	}
	return apigen.UpdateProvider200JSONResponse(out), nil
}

// applyProviderInput merges a save into the saved account; an empty secret keeps the saved one.
func applyProviderInput(p provider.Provider, a account, in apigen.ProviderInput) (account, map[string]string) {
	values := map[string]string{}
	for k, v := range a.values {
		values[k] = v
	}
	errs := map[string]string{}
	known := map[string]provider.Field{}
	for _, f := range p.Fields {
		known[f.Key] = f
	}
	if in.Values != nil {
		for k, v := range *in.Values {
			f, ok := known[k]
			if !ok {
				errs["values"] = p.Name + " doesn't use " + k + "."
				continue
			}
			if v = strings.TrimSpace(v); v != "" || !f.Secret {
				values[k] = v
			}
		}
	}
	if in.Enabled {
		for _, f := range p.Fields {
			if !f.Optional && values[f.Key] == "" {
				errs[f.Key] = "Fill this in to switch " + p.Name + " on."
			}
		}
	}
	return account{enabled: in.Enabled, live: in.Live, values: values, row: a.row}, errs
}

// openAccount reads a saved row, opening its secrets; no row is a provider not set up yet.
func (s *Server) openAccount(code string, row *dbq.Provider) (account, error) {
	a := account{values: map[string]string{}, row: row}
	if row == nil {
		return a, nil
	}
	a.enabled, a.live = row.Enabled, row.Live
	if err := json.Unmarshal(row.Settings, &a.values); err != nil {
		return a, fmt.Errorf("provider %s settings: %w", code, err)
	}
	if len(row.Secrets) > 0 {
		plain, err := s.box.Open(row.Secrets, "provider:"+code)
		if err != nil {
			return a, fmt.Errorf("provider %s secrets (was FAJR_SECRET_KEY changed?): %w", code, err)
		}
		if err := json.Unmarshal(plain, &a.values); err != nil {
			return a, fmt.Errorf("provider %s secrets: %w", code, err)
		}
	}
	return a, nil
}

func toProvider(p provider.Provider, a account) apigen.Provider {
	out := apigen.Provider{
		Code: p.Code, Kind: apigen.ProviderKind(p.Kind), Name: p.Name,
		Enabled: a.enabled, Live: a.live, Configured: true, Fields: make([]apigen.ProviderField, len(p.Fields)),
	}
	if a.row != nil {
		out.UpdatedAt = &a.row.UpdatedAt.Time
	}
	for i, f := range p.Fields {
		v := a.values[f.Key]
		pf := apigen.ProviderField{Key: f.Key, Label: f.Label, Secret: f.Secret, Optional: f.Optional, Set: v != ""}
		if !f.Secret && v != "" {
			pf.Value = &v
		}
		if !f.Optional && v == "" {
			out.Configured = false
		}
		out.Fields[i] = pf
	}
	return out
}
