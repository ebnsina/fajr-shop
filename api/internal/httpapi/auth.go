package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

const (
	accessTTL  = 15 * time.Minute
	refreshTTL = 30 * 24 * time.Hour
)

var errInvalidCredentials = &apiError{http.StatusUnauthorized, apigen.InvalidCredentials, "That email or phone and password don't match.", nil}

func (s *Server) Register(ctx context.Context, req apigen.RegisterRequestObject) (apigen.RegisterResponseObject, error) {
	b := req.Body
	var email, phone *string
	if b.Email != nil {
		e := strings.ToLower(strings.TrimSpace(string(*b.Email)))
		email = &e
	}
	if b.Phone != nil && *b.Phone != "" {
		p, ok := auth.NormalizePhone(*b.Phone)
		if !ok {
			return nil, invalid(map[string]string{"phone": "Enter a Bangladeshi mobile number, like 01712345678."})
		}
		phone = &p
	}
	if email == nil && phone == nil {
		return nil, invalid(map[string]string{"email": "Enter an email or a phone number.", "phone": "Enter an email or a phone number."})
	}
	name := strings.TrimSpace(b.Name)
	if name == "" {
		return nil, invalid(map[string]string{"name": "Enter your name."})
	}
	hash, err := auth.HashPassword(b.Password)
	if err != nil {
		return nil, err
	}
	user, err := s.q.CreateUser(ctx, dbq.CreateUserParams{
		Role: dbq.UserRoleCustomer, Name: name, Email: email, Phone: phone, PasswordHash: hash,
	})
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.Code == "23505" {
		return nil, &apiError{http.StatusConflict, apigen.AccountExists, "An account with this email or phone already exists. Try signing in.", nil}
	}
	if err != nil {
		return nil, fmt.Errorf("register: %w", err)
	}
	sess, err := s.issue(ctx, user)
	if err != nil {
		return nil, err
	}
	return apigen.Register201JSONResponse(sess), nil
}

func (s *Server) Login(ctx context.Context, req apigen.LoginRequestObject) (apigen.LoginResponseObject, error) {
	login := strings.TrimSpace(req.Body.Login)
	var user dbq.User
	var err error
	if strings.Contains(login, "@") {
		email := strings.ToLower(login)
		user, err = s.q.UserByEmail(ctx, &email)
	} else if phone, ok := auth.NormalizePhone(login); ok {
		user, err = s.q.UserByPhone(ctx, &phone)
	} else {
		err = pgx.ErrNoRows
	}
	if errors.Is(err, pgx.ErrNoRows) {
		auth.BurnPasswordCheck(req.Body.Password)
		return nil, errInvalidCredentials
	}
	if err != nil {
		return nil, fmt.Errorf("login: %w", err)
	}
	if !auth.VerifyPassword(req.Body.Password, user.PasswordHash) || user.DisabledAt.Valid {
		return nil, errInvalidCredentials
	}
	sess, err := s.issue(ctx, user)
	if err != nil {
		return nil, err
	}
	return apigen.Login200JSONResponse(sess), nil
}

func (s *Server) Refresh(ctx context.Context, req apigen.RefreshRequestObject) (apigen.RefreshResponseObject, error) {
	old := auth.Digest(req.Body.RefreshToken)
	access, accessHash := auth.NewToken(auth.PrefixAccess)
	refresh, refreshHash := auth.NewToken(auth.PrefixRefresh)
	accessExp := time.Now().Add(accessTTL)
	row, err := s.q.RotateSession(ctx, dbq.RotateSessionParams{
		RefreshHash: old, NewRefreshHash: refreshHash, NewAccessHash: accessHash, AccessExpiresAt: ts(accessExp),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		// A token that was already swapped reached someone it shouldn't have; end that session for everyone.
		if _, err := s.q.RevokeReusedSession(ctx, old); err != nil {
			return nil, fmt.Errorf("refresh: revoke reused: %w", err)
		}
		return nil, &apiError{http.StatusUnauthorized, apigen.SessionExpired, "Your session has ended. Please sign in again.", nil}
	}
	if err != nil {
		return nil, fmt.Errorf("refresh: %w", err)
	}
	user, err := s.q.UserByID(ctx, row.UserID)
	if err != nil {
		return nil, fmt.Errorf("refresh: load user: %w", err)
	}
	return apigen.Refresh200JSONResponse{
		AccessToken: access, AccessExpiresAt: accessExp,
		RefreshToken: refresh, RefreshExpiresAt: row.RefreshExpiresAt.Time,
		User: toUser(user),
	}, nil
}

func (s *Server) Logout(ctx context.Context, _ apigen.LogoutRequestObject) (apigen.LogoutResponseObject, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	if err := s.q.RevokeSession(ctx, p.sessionID); err != nil {
		return nil, fmt.Errorf("logout: %w", err)
	}
	return apigen.Logout204Response{}, nil
}

func (s *Server) GetMe(ctx context.Context, _ apigen.GetMeRequestObject) (apigen.GetMeResponseObject, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	user, err := s.q.UserByID(ctx, p.userID)
	if err != nil {
		return nil, fmt.Errorf("me: %w", err)
	}
	return apigen.GetMe200JSONResponse(toUser(user)), nil
}

func (s *Server) issue(ctx context.Context, user dbq.User) (apigen.Session, error) {
	access, accessHash := auth.NewToken(auth.PrefixAccess)
	refresh, refreshHash := auth.NewToken(auth.PrefixRefresh)
	now := time.Now()
	_, err := s.q.CreateSession(ctx, dbq.CreateSessionParams{
		UserID: user.ID, AccessHash: accessHash, AccessExpiresAt: ts(now.Add(accessTTL)),
		RefreshHash: refreshHash, RefreshExpiresAt: ts(now.Add(refreshTTL)),
	})
	if err != nil {
		return apigen.Session{}, fmt.Errorf("create session: %w", err)
	}
	return apigen.Session{
		AccessToken: access, AccessExpiresAt: now.Add(accessTTL),
		RefreshToken: refresh, RefreshExpiresAt: now.Add(refreshTTL),
		User: toUser(user),
	}, nil
}

func toUser(u dbq.User) apigen.User {
	perms := []apigen.Permission{}
	for _, p := range auth.RolePermissions(string(u.Role)) {
		perms = append(perms, apigen.Permission(p))
	}
	return apigen.User{
		Id: u.ID, Role: apigen.Role(u.Role), Name: u.Name, Email: u.Email, Phone: u.Phone,
		Permissions: perms, CreatedAt: u.CreatedAt.Time,
	}
}

func ts(t time.Time) pgtype.Timestamptz { return pgtype.Timestamptz{Time: t, Valid: true} }
