package httpapi

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
)

// needTeamManager is a signed-in admin: keys never manage people.
func needTeamManager(ctx context.Context) (*principal, error) {
	p, err := needUser(ctx)
	if err != nil {
		return nil, err
	}
	if !auth.Has(p.perms, auth.StoreWrite) {
		return nil, errForbidden
	}
	return p, nil
}

func (s *Server) AdminListStaff(ctx context.Context, _ apigen.AdminListStaffRequestObject) (apigen.AdminListStaffResponseObject, error) {
	p, err := needTeamManager(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := s.q.ListStaff(ctx)
	if err != nil {
		return nil, fmt.Errorf("staff: %w", err)
	}
	items := make([]apigen.StaffMember, len(rows))
	for i, u := range rows {
		items[i] = toStaff(u, p.userID)
	}
	return apigen.AdminListStaff200JSONResponse{Items: items}, nil
}

func (s *Server) AddStaff(ctx context.Context, req apigen.AddStaffRequestObject) (apigen.AddStaffResponseObject, error) {
	p, err := needTeamManager(ctx)
	if err != nil {
		return nil, err
	}
	b := req.Body
	name := strings.TrimSpace(b.Name)
	email := strings.ToLower(strings.TrimSpace(string(b.Email)))
	errs := map[string]string{}
	if name == "" {
		errs["name"] = "Write their name."
	}
	var phone *string
	if b.Phone != nil && strings.TrimSpace(*b.Phone) != "" {
		if ph, ok := auth.NormalizePhone(*b.Phone); ok {
			phone = &ph
		} else {
			errs["phone"] = "Write a Bangladeshi mobile number, like 01712345678."
		}
	}
	if len(errs) > 0 {
		return nil, invalid(errs)
	}
	hash, err := auth.HashPassword(b.Password)
	if err != nil {
		return nil, err
	}
	var out apigen.StaffMember
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		u, err := q.CreateUser(ctx, dbq.CreateUserParams{Role: dbq.UserRole(b.Role), Name: name, Email: &email, Phone: phone, PasswordHash: hash})
		if err != nil {
			return err
		}
		out = toStaff(u, p.userID)
		return s.audit(ctx, q, p, "staff.add", "user", u.ID.String(), nil, out)
	})
	if pgErr, ok := errors.AsType[*pgconn.PgError](err); ok && pgErr.Code == "23505" {
		return nil, &apiError{http.StatusConflict, apigen.AccountExists, "Someone already has an account with this email or phone.", nil}
	}
	if err != nil {
		return nil, fmt.Errorf("add staff: %w", err)
	}
	return apigen.AddStaff201JSONResponse(out), nil
}

func (s *Server) UpdateStaff(ctx context.Context, req apigen.UpdateStaffRequestObject) (apigen.UpdateStaffResponseObject, error) {
	p, err := needTeamManager(ctx)
	if err != nil {
		return nil, err
	}
	if req.Id == p.userID {
		return nil, invalid(map[string]string{"role": "You can't change your own access. Ask another admin."})
	}
	var out apigen.StaffMember
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		if err := q.LockAdmins(ctx); err != nil {
			return err
		}
		before, err := q.StaffByID(ctx, req.Id)
		if err != nil {
			return err
		}
		u, err := q.UpdateStaff(ctx, dbq.UpdateStaffParams{ID: req.Id, Role: dbq.UserRole(req.Body.Role), Disabled: req.Body.Disabled})
		if err != nil {
			return err
		}
		if n, err := q.ActiveAdmins(ctx); err != nil {
			return err
		} else if n == 0 {
			return invalid(map[string]string{"role": "The shop needs at least one admin who can sign in."})
		}
		out = toStaff(u, p.userID)
		return s.audit(ctx, q, p, "staff.update", "user", u.ID.String(), toStaff(before, p.userID), out)
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, notFound("That person")
	}
	if err != nil {
		return nil, fmt.Errorf("update staff: %w", err)
	}
	return apigen.UpdateStaff200JSONResponse(out), nil
}

func toStaff(u dbq.User, me uuid.UUID) apigen.StaffMember {
	out := apigen.StaffMember{
		Id: u.ID, Name: u.Name, Phone: u.Phone, Role: apigen.StaffRole(u.Role),
		Disabled: u.DisabledAt.Valid, CreatedAt: u.CreatedAt.Time, You: u.ID == me,
	}
	if u.Email != nil {
		out.Email = *u.Email
	}
	return out
}
