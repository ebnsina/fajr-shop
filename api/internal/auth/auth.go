// Package auth holds the pieces of sign-in that have no I/O: password hashing, tokens, phone numbers and permissions.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"

	"golang.org/x/crypto/argon2"
)

// RFC 9106 §4, second recommended set: t=3, m=64 MiB, p=4.
const (
	argonTime    = 3
	argonMemory  = 64 * 1024
	argonThreads = 4
	argonKeyLen  = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("auth: salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	b64 := base64.RawStdEncoding.EncodeToString
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemory, argonTime, argonThreads, b64(salt), b64(key)), nil
}

func VerifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(parts[4])
	want, err2 := base64.RawStdEncoding.DecodeString(parts[5])
	if err := errors.Join(err1, err2); err != nil {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// dummyHash lets an unknown account cost the same time as a wrong password.
var dummyHash = sync.OnceValue(func() string {
	h, err := HashPassword("not-a-real-password")
	if err != nil {
		panic(err) // crypto/rand failing is not recoverable
	}
	return h
})

// BurnPasswordCheck spends the time of a real verification, for accounts that do not exist.
func BurnPasswordCheck(password string) { VerifyPassword(password, dummyHash()) }

// Token prefixes say what a bearer value is without a database lookup.
const (
	PrefixAccess  = "fsa_"
	PrefixRefresh = "fsr_"
	PrefixAPIKey  = "fsk_"
	PrefixCart    = "fsc_"
)

// NewToken returns a random 256-bit token and the digest to store in its place.
func NewToken(prefix string) (token string, digest []byte) {
	b := make([]byte, 32)
	_, _ = rand.Read(b) // never fails on supported platforms (crypto/rand docs)
	token = prefix + base64.RawURLEncoding.EncodeToString(b)
	return token, Digest(token)
}

func Digest(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// NormalizePhone turns a Bangladeshi mobile number into E.164 (+8801XXXXXXXXX).
func NormalizePhone(s string) (string, bool) {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		if r == ' ' || r == '-' || r == '+' || r == '(' || r == ')' {
			return -1
		}
		return 'x'
	}, s)
	digits = strings.TrimPrefix(digits, "880")
	digits = strings.TrimPrefix(digits, "0")
	if len(digits) != 10 || digits[0] != '1' || digits[1] < '3' || strings.Contains(digits, "x") {
		return "", false
	}
	return "+880" + digits, true
}

type Permission string

const (
	StoreWrite     Permission = "store:write"
	CatalogWrite   Permission = "catalog:write"
	InventoryWrite Permission = "inventory:write"
	APIKeysManage  Permission = "api_keys:manage"
	AuditRead      Permission = "audit:read"
)

var allPermissions = []Permission{StoreWrite, CatalogWrite, InventoryWrite, APIKeysManage, AuditRead}

// RolePermissions says what each role may do. An unknown role may do nothing.
func RolePermissions(role string) []Permission {
	switch role {
	case "admin":
		return allPermissions
	case "staff":
		return []Permission{CatalogWrite, InventoryWrite}
	default:
		return nil
	}
}

func Has(perms []Permission, p Permission) bool { return slices.Contains(perms, p) }
