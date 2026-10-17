// Package secret seals values for storage with AES-256-GCM, so a database dump alone reveals nothing.
package secret

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
)

type Box struct{ aead cipher.AEAD }

func New(key []byte) (*Box, error) {
	if len(key) != 32 {
		return nil, fmt.Errorf("secret: key must be 32 bytes, got %d", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Box{aead}, nil
}

// Seal binds the value to label, so a sealed value copied onto another row won't open there.
func (b *Box) Seal(plain []byte, label string) []byte {
	nonce := make([]byte, b.aead.NonceSize())
	_, _ = rand.Read(nonce) // crypto/rand.Read never fails
	return b.aead.Seal(nonce, nonce, plain, []byte(label))
}

func (b *Box) Open(sealed []byte, label string) ([]byte, error) {
	n := b.aead.NonceSize()
	if len(sealed) < n {
		return nil, errors.New("secret: sealed value too short")
	}
	return b.aead.Open(nil, sealed[:n], sealed[n:], []byte(label))
}
