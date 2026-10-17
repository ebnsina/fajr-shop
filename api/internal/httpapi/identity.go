package httpapi

import (
	"context"
	"errors"
	"net/http"
	"net/netip"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/time/rate"

	"github.com/ebnsina/fajr-shop/api/internal/apigen"
	"github.com/ebnsina/fajr-shop/api/internal/auth"
)

// principal is who is calling: a signed-in user (sessionID set) or an API key (apiKeyID set).
type principal struct {
	userID    uuid.UUID
	sessionID uuid.UUID
	apiKeyID  uuid.UUID
	perms     []auth.Permission
}

type ctxKey int

const (
	principalKey ctxKey = iota
	tokenRejectedKey
	clientIPKey
)

// identify establishes who is calling. It never refuses a request; handlers decide what is allowed.
func (s *Server) identify(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), clientIPKey, clientIP(r, s.trustedProxies))
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if ok {
			p, err := s.lookup(ctx, token)
			switch {
			case errors.Is(err, pgx.ErrNoRows):
				ctx = context.WithValue(ctx, tokenRejectedKey, true)
			case err != nil:
				internalError(w, r, err)
				return
			default:
				ctx = context.WithValue(ctx, principalKey, p)
			}
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Server) lookup(ctx context.Context, token string) (*principal, error) {
	switch {
	case strings.HasPrefix(token, auth.PrefixAccess):
		row, err := s.q.SessionByAccess(ctx, auth.Digest(token))
		if err != nil {
			return nil, err
		}
		return &principal{userID: row.UserID, sessionID: row.SessionID, perms: auth.RolePermissions(string(row.Role))}, nil
	case strings.HasPrefix(token, auth.PrefixAPIKey):
		key, err := s.q.ApiKeyByHash(ctx, auth.Digest(token))
		if err != nil {
			return nil, err
		}
		p := &principal{apiKeyID: key.ID}
		for _, sc := range key.Scopes {
			p.perms = append(p.perms, auth.Permission(sc))
		}
		return p, nil
	}
	return nil, pgx.ErrNoRows
}

func caller(ctx context.Context) *principal {
	p, _ := ctx.Value(principalKey).(*principal)
	return p
}

func unauthenticated(ctx context.Context) error {
	if rejected, _ := ctx.Value(tokenRejectedKey).(bool); rejected {
		return &apiError{http.StatusUnauthorized, apigen.SessionExpired, "Your session has ended. Please sign in again.", nil}
	}
	return &apiError{http.StatusUnauthorized, apigen.Unauthenticated, "Please sign in.", nil}
}

var errForbidden = &apiError{http.StatusForbidden, apigen.Forbidden, "You don't have permission to do this.", nil}

// need returns the caller if they hold perm.
func need(ctx context.Context, perm auth.Permission) (*principal, error) {
	p := caller(ctx)
	if p == nil {
		return nil, unauthenticated(ctx)
	}
	if !auth.Has(p.perms, perm) {
		return nil, errForbidden
	}
	return p, nil
}

// needUser returns the caller if they are a signed-in person, not an API key.
func needUser(ctx context.Context) (*principal, error) {
	p := caller(ctx)
	if p == nil {
		return nil, unauthenticated(ctx)
	}
	if p.sessionID == uuid.Nil {
		return nil, errForbidden
	}
	return p, nil
}

// clientIP is the peer address, or the nearest address a trusted proxy reported for it.
func clientIP(r *http.Request, trusted []netip.Prefix) netip.Addr {
	ap, err := netip.ParseAddrPort(r.RemoteAddr)
	if err != nil {
		return netip.Addr{}
	}
	addr := ap.Addr().Unmap()
	hops := strings.Split(strings.Join(r.Header.Values("X-Forwarded-For"), ","), ",")
	for i := len(hops) - 1; i >= 0 && isTrusted(addr, trusted); i-- {
		next, err := netip.ParseAddr(strings.TrimSpace(hops[i]))
		if err != nil {
			break
		}
		addr = next.Unmap()
	}
	return addr
}

func isTrusted(a netip.Addr, trusted []netip.Prefix) bool {
	for _, p := range trusted {
		if p.Contains(a) {
			return true
		}
	}
	return false
}

func ipFrom(ctx context.Context) *netip.Addr {
	if a, ok := ctx.Value(clientIPKey).(netip.Addr); ok && a.IsValid() {
		return &a
	}
	return nil
}

// limiter allows each address a few attempts per minute at each sign-in endpoint.
// ponytail: in-process, so it assumes one API instance per shop; move to Postgres if that changes.
type limiter struct {
	mu      sync.Mutex
	buckets map[string]*rate.Limiter
	reset   time.Time
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	// Dropping every bucket every 10 minutes bounds memory; at worst it hands out one fresh burst.
	if time.Now().After(l.reset) {
		l.buckets, l.reset = map[string]*rate.Limiter{}, time.Now().Add(10*time.Minute)
	}
	b, ok := l.buckets[key]
	if !ok {
		b = rate.NewLimiter(rate.Every(6*time.Second), 10)
		l.buckets[key] = b
	}
	return b.Allow()
}

func (s *Server) throttle(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && (strings.HasPrefix(r.URL.Path, "/v1/auth/") || r.URL.Path == "/v1/newsletter") {
			ip := ""
			if a := ipFrom(r.Context()); a != nil {
				ip = a.String()
			}
			if !s.limits.allow(ip + " " + r.URL.Path) {
				w.Header().Set("Retry-After", "60")
				writeError(w, http.StatusTooManyRequests, apigen.RateLimited, "Too many attempts. Please wait a minute and try again.", nil)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
