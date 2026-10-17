package auth

import (
	"strings"
	"testing"
)

func TestPassword(t *testing.T) {
	h, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyPassword("correct horse", h) {
		t.Error("right password refused")
	}
	if VerifyPassword("correct horsf", h) {
		t.Error("wrong password accepted")
	}
	if VerifyPassword("correct horse", "garbage") {
		t.Error("malformed hash accepted")
	}
}

func TestNormalizePhone(t *testing.T) {
	tests := []struct {
		in, want string
		ok       bool
	}{
		{"01712345678", "+8801712345678", true},
		{"+880 1712-345678", "+8801712345678", true},
		{"8801912345678", "+8801912345678", true},
		{"1712345678", "+8801712345678", true},
		{"01212345678", "", false}, // 012 is not a mobile prefix
		{"0171234567", "", false},
		{"017123456789", "", false},
		{"0171234567a", "", false},
		{"", "", false},
	}
	for _, tt := range tests {
		got, ok := NormalizePhone(tt.in)
		if got != tt.want || ok != tt.ok {
			t.Errorf("NormalizePhone(%q) = %q, %v; want %q, %v", tt.in, got, ok, tt.want, tt.ok)
		}
	}
}

func TestNewToken(t *testing.T) {
	tok, digest := NewToken(PrefixAccess)
	if !strings.HasPrefix(tok, PrefixAccess) || len(tok) < 40 {
		t.Errorf("token %q", tok)
	}
	if string(Digest(tok)) != string(digest) {
		t.Error("digest does not match token")
	}
}

func TestUnknownRoleDenies(t *testing.T) {
	if RolePermissions("owner") != nil || RolePermissions("customer") != nil {
		t.Error("unknown roles and customers must have no permissions")
	}
	if Has(RolePermissions("staff"), StoreWrite) || !Has(RolePermissions("staff"), CatalogWrite) {
		t.Error("staff manage the catalog, not the store settings")
	}
}
