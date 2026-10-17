package httpapi

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

func (s *Server) UpdateStore(ctx context.Context, req apigen.UpdateStoreRequestObject) (apigen.UpdateStoreResponseObject, error) {
	p, err := need(ctx, auth.StoreWrite)
	if err != nil {
		return nil, err
	}
	b := req.Body
	if strings.TrimSpace(b.Name) == "" {
		return nil, invalid(map[string]string{"name": "Enter the shop's name."})
	}
	if b.Currency != "BDT" {
		return nil, invalid(map[string]string{"currency": "Only Bangladeshi taka (BDT) is supported for now."})
	}
	var email *string
	if b.ContactEmail != nil {
		e := strings.ToLower(string(*b.ContactEmail))
		email = &e
	}
	highlights := []apigen.Highlight{}
	if b.Highlights != nil {
		highlights = *b.Highlights
	}
	highlightsJSON, err := json.Marshal(highlights)
	if err != nil {
		return nil, err
	}
	var saved dbq.StoreSetting
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		before, err := q.GetStoreSettings(ctx)
		if err != nil {
			return err
		}
		saved, err = q.UpdateStoreSettings(ctx, dbq.UpdateStoreSettingsParams{
			Name: strings.TrimSpace(b.Name), LogoUrl: blank(b.LogoUrl), AccentColor: blank(b.AccentColor),
			Currency: b.Currency, ContactPhone: blank(b.ContactPhone), ContactEmail: email,
			VatEnabled: b.Vat.Enabled, VatRateBp: int32(b.Vat.RateBp), PricesIncludeVat: b.Vat.PricesIncludeVat,
			VatBin: blank(b.Vat.Bin), Highlights: highlightsJSON,
		})
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "store.update", "store", "", toStore(before), toStore(saved))
	})
	if err != nil {
		return nil, fmt.Errorf("update store: %w", err)
	}
	return apigen.UpdateStore200JSONResponse(toStore(saved)), nil
}

func (s *Server) ListApiKeys(ctx context.Context, _ apigen.ListApiKeysRequestObject) (apigen.ListApiKeysResponseObject, error) {
	if _, err := needUserWith(ctx, auth.APIKeysManage); err != nil {
		return nil, err
	}
	keys, err := s.q.ListApiKeys(ctx)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	items := make([]apigen.ApiKey, len(keys))
	for i, k := range keys {
		items[i] = toAPIKey(k)
	}
	return apigen.ListApiKeys200JSONResponse{Items: items}, nil
}

func (s *Server) CreateApiKey(ctx context.Context, req apigen.CreateApiKeyRequestObject) (apigen.CreateApiKeyResponseObject, error) {
	p, err := needUserWith(ctx, auth.APIKeysManage)
	if err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Body.Name)
	if name == "" {
		return nil, invalid(map[string]string{"name": "Give the key a name, like the app that will use it."})
	}
	scopes := make([]string, len(req.Body.Scopes))
	for i, sc := range req.Body.Scopes {
		scopes[i] = string(sc)
	}
	token, digest := auth.NewToken(auth.PrefixAPIKey)
	var key dbq.ApiKey
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		key, err = q.CreateApiKey(ctx, dbq.CreateApiKeyParams{
			Name: name, KeyHash: digest, Hint: token[len(token)-4:], Scopes: scopes, CreatedBy: p.userID,
		})
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "api_key.create", "api_key", key.ID.String(), nil, toAPIKey(key))
	})
	if err != nil {
		return nil, fmt.Errorf("create api key: %w", err)
	}
	k := toAPIKey(key)
	return apigen.CreateApiKey201JSONResponse{
		Id: k.Id, Name: k.Name, Hint: k.Hint, Scopes: k.Scopes, CreatedAt: k.CreatedAt, Key: token,
	}, nil
}

func (s *Server) RevokeApiKey(ctx context.Context, req apigen.RevokeApiKeyRequestObject) (apigen.RevokeApiKeyResponseObject, error) {
	p, err := needUserWith(ctx, auth.APIKeysManage)
	if err != nil {
		return nil, err
	}
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		key, err := q.RevokeApiKey(ctx, req.Id)
		if err != nil {
			return err
		}
		return s.audit(ctx, q, p, "api_key.revoke", "api_key", key.ID.String(), toAPIKey(key), nil)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, &apiError{http.StatusNotFound, apigen.NotFound, "That key doesn't exist or is already revoked.", nil}
	}
	if err != nil {
		return nil, fmt.Errorf("revoke api key: %w", err)
	}
	return apigen.RevokeApiKey204Response{}, nil
}

func (s *Server) ListAuditLog(ctx context.Context, req apigen.ListAuditLogRequestObject) (apigen.ListAuditLogResponseObject, error) {
	if _, err := need(ctx, auth.AuditRead); err != nil {
		return nil, err
	}
	limit := 50
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}
	before := int64(math.MaxInt64)
	if req.Params.Cursor != nil {
		id, err := decodeCursor(*req.Params.Cursor)
		if err != nil {
			return nil, invalid(map[string]string{"cursor": "This page link has expired. Start from the first page."})
		}
		before = id
	}
	rows, err := s.q.ListAudit(ctx, dbq.ListAuditParams{BeforeID: before, RowLimit: int32(limit + 1)})
	if err != nil {
		return nil, fmt.Errorf("list audit: %w", err)
	}
	page := apigen.AuditPage{Items: []apigen.AuditEntry{}}
	for i, r := range rows {
		if i == limit {
			next := encodeCursor(rows[i-1].ID)
			page.NextCursor = &next
			break
		}
		e := apigen.AuditEntry{Id: r.ID, Action: r.Action, Entity: r.Entity, EntityId: r.EntityID, CreatedAt: r.CreatedAt.Time}
		if r.ActorName != "" {
			e.Actor = &r.ActorName
		}
		if r.Before != nil {
			e.Before = json.RawMessage(r.Before)
		}
		if r.After != nil {
			e.After = json.RawMessage(r.After)
		}
		page.Items = append(page.Items, e)
	}
	return apigen.ListAuditLog200JSONResponse(page), nil
}

// audit records a change in the transaction that made it, so the two can never disagree.
func (s *Server) audit(ctx context.Context, q *dbq.Queries, p *principal, action, entity, entityID string, before, after any) error {
	b, err := jsonOrNil(before)
	if err != nil {
		return err
	}
	a, err := jsonOrNil(after)
	if err != nil {
		return err
	}
	params := dbq.InsertAuditParams{Action: action, Entity: entity, Before: b, After: a, Ip: ipFrom(ctx)}
	if entityID != "" {
		params.EntityID = &entityID
	}
	if p.sessionID != uuid.Nil {
		params.ActorUserID = uuid.NullUUID{UUID: p.userID, Valid: true}
	} else {
		params.ActorApiKeyID = uuid.NullUUID{UUID: p.apiKeyID, Valid: true}
	}
	return q.InsertAudit(ctx, params)
}

func needUserWith(ctx context.Context, perm auth.Permission) (*principal, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	if !auth.Has(p.perms, perm) {
		return nil, errForbidden
	}
	return p, nil
}

func jsonOrNil(v any) ([]byte, error) {
	if v == nil {
		return nil, nil
	}
	return json.Marshal(v)
}

func toAPIKey(k dbq.ApiKey) apigen.ApiKey {
	scopes := make([]apigen.ApiKeyScope, len(k.Scopes))
	for i, sc := range k.Scopes {
		scopes[i] = apigen.ApiKeyScope(sc)
	}
	return apigen.ApiKey{Id: k.ID, Name: k.Name, Hint: k.Hint, Scopes: scopes, CreatedAt: k.CreatedAt.Time}
}

// blank stores an empty string as NULL, so "cleared" has one meaning.
func blank(s *string) *string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	t := strings.TrimSpace(*s)
	return &t
}

func encodeCursor(id int64) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.FormatInt(id, 10)))
}

func decodeCursor(c string) (int64, error) {
	b, err := base64.RawURLEncoding.DecodeString(c)
	if err != nil {
		return 0, err
	}
	return strconv.ParseInt(string(b), 10, 64)
}
