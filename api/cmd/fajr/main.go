// Command fajr runs the shop API: `fajr serve`, `fajr migrate`, `fajr create-admin`, or `fajr seed`.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/ebnsina/fajr-shop/api/internal/auth"
	"github.com/ebnsina/fajr-shop/api/internal/config"
	"github.com/ebnsina/fajr-shop/api/internal/db"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/httpapi"
	"github.com/ebnsina/fajr-shop/api/internal/seed"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))
	if err := run(); err != nil {
		slog.Error("fajr", "err", err)
		os.Exit(1)
	}
}

func run() error {
	if len(os.Args) != 2 || (os.Args[1] != "serve" && os.Args[1] != "migrate" && os.Args[1] != "create-admin" && os.Args[1] != "seed") {
		return errors.New("usage: fajr serve|migrate|create-admin|seed")
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	switch os.Args[1] {
	case "migrate":
		return db.Migrate(ctx, pool)
	case "create-admin":
		return createAdmin(ctx, dbq.New(pool))
	case "seed":
		return seed.Run(ctx, pool, cfg.MediaDir)
	}

	app, err := httpapi.New(pool, cfg)
	if err != nil {
		return err
	}
	if err := app.Start(ctx); err != nil {
		return fmt.Errorf("jobs: %w", err)
	}
	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           app,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	errc := make(chan error, 1)
	go func() { errc <- srv.ListenAndServe() }()
	slog.Info("listening", "addr", cfg.HTTPAddr)

	select {
	case err := <-errc:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}
	shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	// Stop taking requests first, then let jobs that are running finish.
	return errors.Join(srv.Shutdown(shutdown), app.Stop(shutdown))
}

// createAdmin makes the shop owner's account from FAJR_ADMIN_* variables, so the password never sits in shell history.
func createAdmin(ctx context.Context, q *dbq.Queries) error {
	name, password := os.Getenv("FAJR_ADMIN_NAME"), os.Getenv("FAJR_ADMIN_PASSWORD")
	email, phone := os.Getenv("FAJR_ADMIN_EMAIL"), os.Getenv("FAJR_ADMIN_PHONE")
	// The dashboard signs in by email, so the owner needs one; a phone is optional.
	if name == "" || email == "" {
		return errors.New("create-admin: set FAJR_ADMIN_NAME and FAJR_ADMIN_EMAIL")
	}
	if len(password) < 12 {
		return errors.New("create-admin: FAJR_ADMIN_PASSWORD must be at least 12 characters")
	}
	e := strings.ToLower(email)
	params := dbq.CreateUserParams{Role: dbq.UserRoleAdmin, Name: name, Email: &e}
	if phone != "" {
		p, ok := auth.NormalizePhone(phone)
		if !ok {
			return fmt.Errorf("create-admin: %q is not a Bangladeshi mobile number", phone)
		}
		params.Phone = &p
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	params.PasswordHash = hash
	u, err := q.CreateUser(ctx, params)
	if err != nil {
		return fmt.Errorf("create-admin: %w", err)
	}
	slog.Info("admin created", "id", u.ID)
	return nil
}
