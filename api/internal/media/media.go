// Package media stores uploaded images on disk under random names.
package media

import (
	"bufio"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg" // registers the decoders image.DecodeConfig uses
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	_ "golang.org/x/image/webp"
)

const MaxBytes = 10 << 20

var (
	ErrTooLarge    = errors.New("media: file too large")
	ErrUnsupported = errors.New("media: not a JPEG, PNG or WebP image")
)

var extensions = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

type Stored struct {
	Key           string
	ContentType   string
	Width, Height int
	Bytes         int
}

// Save writes an image from r into dir. The type is read from the bytes, never from a name or header.
func Save(dir string, r io.Reader) (Stored, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return Stored{}, fmt.Errorf("media: %w", err)
	}
	tmp, err := os.CreateTemp(dir, ".upload-*")
	if err != nil {
		return Stored{}, fmt.Errorf("media: %w", err)
	}
	defer os.Remove(tmp.Name()) // a no-op once renamed
	defer tmp.Close()

	n, err := io.Copy(tmp, io.LimitReader(r, MaxBytes+1))
	if err != nil {
		return Stored{}, fmt.Errorf("media: write: %w", err)
	}
	if n > MaxBytes {
		return Stored{}, ErrTooLarge
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		return Stored{}, fmt.Errorf("media: %w", err)
	}
	br := bufio.NewReader(tmp)
	head, _ := br.Peek(512) // a short file just gives a shorter sniff
	contentType := http.DetectContentType(head)
	ext, ok := extensions[contentType]
	if !ok {
		return Stored{}, ErrUnsupported
	}
	cfg, _, err := image.DecodeConfig(br)
	if err != nil {
		return Stored{}, ErrUnsupported
	}
	if err := tmp.Close(); err != nil {
		return Stored{}, fmt.Errorf("media: %w", err)
	}
	key := uuid.NewString() + ext
	if err := os.Rename(tmp.Name(), filepath.Join(dir, key)); err != nil {
		return Stored{}, fmt.Errorf("media: %w", err)
	}
	return Stored{Key: key, ContentType: contentType, Width: cfg.Width, Height: cfg.Height, Bytes: int(n)}, nil
}

// Handler serves stored files. Names are random and never reused, so they cache for a year.
func Handler(dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := filepath.Base(r.URL.Path)
		if name == "/" || name == "." || name[0] == '.' {
			http.NotFound(w, r) // no directory listings, no temp files
			return
		}
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		files.ServeHTTP(w, r)
	})
}
