package secret

import (
	"bytes"
	"testing"
)

func TestSealOpen(t *testing.T) {
	b, err := New(bytes.Repeat([]byte{7}, 32))
	if err != nil {
		t.Fatal(err)
	}
	sealed := b.Seal([]byte("api-key"), "steadfast")
	if bytes.Contains(sealed, []byte("api-key")) {
		t.Fatal("sealed value holds the plain text")
	}
	if got, err := b.Open(sealed, "steadfast"); err != nil || string(got) != "api-key" {
		t.Fatalf("open: %q %v", got, err)
	}
	if _, err := b.Open(sealed, "pathao"); err == nil {
		t.Fatal("a value sealed for one label opened under another")
	}
	if _, err := New([]byte("short")); err == nil {
		t.Fatal("a short key was accepted")
	}
}
