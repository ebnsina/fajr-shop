// Package seed fills an empty shop with a large Bangladeshi demo catalog, for trying the shop at
// a realistic size. It draws its own pictures, so nothing is downloaded or borrowed.
package seed

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"log/slog"
	"math"
	"math/rand/v2"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"

	"github.com/ebnsina/fajr-shop/api/internal/catalog"
	"github.com/ebnsina/fajr-shop/api/internal/db/dbq"
	"github.com/ebnsina/fajr-shop/api/internal/media"
	"github.com/ebnsina/fajr-shop/api/internal/shipping"
)

var editions = []string{"", "Classic", "Premium", "Plus"}

// Run seeds the catalog in one transaction. It refuses a shop that already has products.
func Run(ctx context.Context, pool *pgxpool.Pool, mediaDir string) error {
	var existing int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM products").Scan(&existing); err != nil {
		return fmt.Errorf("seed: %w", err)
	}
	if existing > 0 {
		return errors.New("seed: this shop already has products; seed only fills an empty one")
	}
	fonts, err := loadFonts()
	if err != nil {
		return err
	}
	rng := rand.New(rand.NewPCG(1447, 1971)) // the same catalog every run
	start := time.Now()
	now := time.Now()
	var products, variants int

	err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
		q := dbq.New(tx)
		upload := func(w, h int, hue float64, title, line string) (uuid.UUID, error) {
			var buf bytes.Buffer
			if err := jpeg.Encode(&buf, fonts.picture(w, h, hue, title, line), &jpeg.Options{Quality: 82}); err != nil {
				return uuid.Nil, err
			}
			st, err := media.Save(mediaDir, &buf)
			if err != nil {
				return uuid.Nil, err
			}
			u, err := q.CreateUpload(ctx, dbq.CreateUploadParams{
				Key: st.Key, ContentType: st.ContentType, Width: int32(st.Width), Height: int32(st.Height), Bytes: int32(st.Bytes),
			})
			return u.ID, err
		}
		nullID := func(id uuid.UUID) uuid.NullUUID { return uuid.NullUUID{UUID: id, Valid: true} }

		batch := &pgx.Batch{}
		for ti, t := range shelves {
			img, err := upload(480, 480, t.hue, t.name, "")
			if err != nil {
				return err
			}
			parent, err := q.CreateCategory(ctx, dbq.CreateCategoryParams{
				Name: t.name, Slug: catalog.Slugify(t.name), Position: int32(ti), ImageID: nullID(img),
			})
			if err != nil {
				return fmt.Errorf("category %s: %w", t.name, err)
			}
			for si, s := range t.subs {
				img, err := upload(480, 480, t.hue+float64(si)*12, s.name, t.name)
				if err != nil {
					return err
				}
				child, err := q.CreateCategory(ctx, dbq.CreateCategoryParams{
					ParentID: nullID(parent.ID), Name: s.name, Slug: catalog.Slugify(s.name), Position: int32(si), ImageID: nullID(img),
				})
				if err != nil {
					return fmt.Errorf("category %s: %w", s.name, err)
				}
				grams := gramsFor(s.name)
				for bi, brand := range s.brands {
					photo, err := upload(640, 640, t.hue+float64(si)*12+float64(bi)*7, brand, s.name)
					if err != nil {
						return err
					}
					for mi, model := range s.models {
						for ei, ed := range editions {
							_, v := addProduct(batch, rng, now, child.ID, photo, s, grams, brand, model, ed, fmt.Sprintf("%d-%d-%d-%d-%d", ti, si, bi, mi, ei))
							products++
							variants += v
						}
					}
				}
			}
		}
		if err := tx.SendBatch(ctx, batch).Close(); err != nil {
			return fmt.Errorf("products: %w", err)
		}

		for i, b := range banners {
			w, h := 1600, 800
			switch b.placement {
			case "side":
				w, h = 800, 600
			case "wide":
				w, h = 2000, 400
			}
			img, err := upload(w, h, b.hue, b.title, b.line)
			if err != nil {
				return err
			}
			link := "/shop"
			if b.category != "" {
				link = "/c/" + catalog.Slugify(b.category)
			}
			if _, err := q.CreateBanner(ctx, dbq.CreateBannerParams{
				Placement: dbq.BannerPlacement(b.placement), UploadID: img, Link: &link, Alt: b.title + ": " + b.line,
				Position: int32(i), Active: true,
			}); err != nil {
				return fmt.Errorf("banner: %w", err)
			}
		}

		taken := map[string]bool{}
		for i, z := range zones {
			districts := z.districts
			if districts == nil {
				for _, d := range shipping.Districts {
					if !taken[d.Name] {
						districts = append(districts, d.Name)
					}
				}
			}
			for _, d := range districts {
				taken[d] = true
			}
			var freeOver *int64
			if z.freeOver > 0 {
				v := z.freeOver * 100
				freeOver = &v
			}
			if _, err := tx.Exec(ctx, `INSERT INTO shipping_zones (name, districts, base_charge, base_weight_g, extra_per_kg, free_over, delivery_days, position)
				VALUES ($1, $2, $3, 1000, $4, $5, $6, $7)`, z.name, districts, z.base*100, z.perKg*100, freeOver, z.days, i); err != nil {
				return fmt.Errorf("zone %s: %w", z.name, err)
			}
		}

		hl := make([]map[string]string, len(highlights))
		for i, h := range highlights {
			hl[i] = map[string]string{"icon": h.icon, "title": h.title, "text": h.text}
		}
		hlJSON, err := json.Marshal(hl)
		if err != nil {
			return err
		}
		// A fresh shop gets a demo name; one the owner already named keeps it.
		_, err = tx.Exec(ctx, `UPDATE store_settings SET highlights = $1,
			name = CASE WHEN name = 'My shop' THEN 'Fajr Bazar' ELSE name END,
			contact_phone = COALESCE(contact_phone, '09610-000000'), updated_at = now() WHERE id = 1`, hlJSON)
		return err
	})
	if err != nil {
		return fmt.Errorf("seed: %w", err)
	}
	slog.Info("seeded", "products", products, "variants", variants, "took", time.Since(start).Round(time.Millisecond).String())
	return nil
}

// addProduct queues one product with its variants, photo and starting stock. It returns the
// product's name and how many variants it has.
func addProduct(b *pgx.Batch, rng *rand.Rand, now time.Time, category, photo uuid.UUID, s sub, grams int, brand, model, edition, key string) (string, int) {
	name := brand + " " + model
	if edition != "" {
		name += " " + edition
	}
	id := uuid.New()
	base := roundPrice(s.low + rng.IntN(s.high-s.low+1))
	if edition == "Premium" {
		base = roundPrice(base * 6 / 5)
	}

	// One variant per combination of option values, priced up by each step.
	combos := []map[string]string{{}}
	prices := []int{base}
	for _, o := range s.opts {
		var nc []map[string]string
		var np []int
		for ci, c := range combos {
			for vi, v := range o.values {
				m := map[string]string{o.name: v}
				for k, x := range c {
					m[k] = x
				}
				nc = append(nc, m)
				np = append(np, prices[ci]+o.step*vi)
			}
		}
		combos, prices = nc, np
	}
	optsJSON, _ := json.Marshal(s.opts2json()) // plain strings and slices always marshal
	lo, hi := prices[0], prices[0]
	for _, p := range prices {
		lo, hi = min(lo, p), max(hi, p)
	}

	status := "active"
	switch r := rng.IntN(100); {
	case r < 3:
		status = "draft"
	case r < 5:
		status = "archived"
	}
	created := now.Add(-time.Duration(rng.IntN(120*24*60)) * time.Minute)
	slug := catalog.Slugify(name) + "-" + key
	desc := s.about + "\n\n" + name + " is sold with a valid invoice. Check the size or model before you order."
	b.Queue(`INSERT INTO products (id, slug, name, description, status, category_id, options, price_min, price_max, featured, brand, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5::product_status, $6, $7, $8, $9, $10, $11, $12, $12)`,
		id, slug, name, desc, status, category, optsJSON, int64(lo)*100, int64(hi)*100, rng.IntN(100) < 3, brand, created)
	b.Queue(`INSERT INTO product_images (product_id, upload_id, position) VALUES ($1, $2, 0)`, id, photo)

	onSale := rng.IntN(100) < 25
	for i, c := range combos {
		price := int64(prices[i]) * 100
		var compare *int64
		if onSale {
			v := int64(roundPrice(prices[i]*(110+rng.IntN(30))/100)) * 100
			if v > price {
				compare = &v
			}
		}
		stock := rng.IntN(60)
		if rng.IntN(100) < 12 {
			stock = 0
		}
		cj, _ := json.Marshal(c) // a map of strings always marshals
		vid := uuid.New()
		// Bigger options (larger packs, screens, capacities) weigh more, in step with the price.
		weight := grams + grams*(prices[i]-prices[0])/max(prices[0], 1)/2
		b.Queue(`INSERT INTO variants (id, product_id, sku, price, compare_at_price, stock, options, position, weight_g) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			vid, id, fmt.Sprintf("SKU-%s-%d", key, i), price, compare, stock, cj, i, weight)
		if stock > 0 {
			b.Queue(`INSERT INTO stock_movements (variant_id, delta, reason, note) VALUES ($1, $2, 'initial', 'Demo data')`, vid, stock)
		}
	}
	return name, len(combos)
}

func (s sub) opts2json() []catalog.Option {
	out := make([]catalog.Option, len(s.opts))
	for i, o := range s.opts {
		out[i] = catalog.Option{Name: o.name, Values: o.values}
	}
	return out
}

// roundPrice makes a price look like a shop's: to 10 taka, or 5 under 100.
func roundPrice(t int) int {
	if t < 100 {
		return max(5, t/5*5)
	}
	return t / 10 * 10
}

type fonts struct{ bold, regular *opentype.Font }

func loadFonts() (fonts, error) {
	b, err1 := opentype.Parse(gobold.TTF)
	r, err2 := opentype.Parse(goregular.TTF)
	if err := errors.Join(err1, err2); err != nil {
		return fonts{}, fmt.Errorf("seed: fonts: %w", err)
	}
	return fonts{b, r}, nil
}

// picture draws a two-tone gradient with soft circles and the title (and line) in white.
func (f fonts) picture(w, h int, hue float64, title, line string) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	a, b := hsl(hue, 0.55, 0.46), hsl(hue+28, 0.62, 0.28)
	for y := range h {
		for x := range w {
			t := (float64(x)/float64(w) + float64(y)/float64(h)) / 2
			c := mix(a, b, t)
			// Two large soft circles, lighter, for depth.
			for _, ci := range [][3]float64{{0.82, 0.18, 0.45}, {0.15, 0.95, 0.35}} {
				dx, dy := float64(x)/float64(w)-ci[0], (float64(y)/float64(h)-ci[1])*float64(h)/float64(w)
				if d := math.Hypot(dx, dy); d < ci[2] {
					c = mix(c, color.RGBA{255, 255, 255, 255}, 0.07*(1-d/ci[2]))
				}
			}
			img.SetRGBA(x, y, c)
		}
	}
	// Left-aligned only on banners at least twice as wide as tall; squarer pictures center it.
	wide := w >= 2*h
	x := w / 2
	if wide {
		x = w / 14
	}
	titleSize := float64(h) / 7
	if wide {
		titleSize = float64(h) / 6
	}
	f.text(img, f.bold, title, titleSize, x, h/2, !wide, w-w/7)
	if line != "" {
		f.text(img, f.regular, line, titleSize*0.45, x, h/2+int(titleSize*0.95), !wide, w-w/7)
	}
	return img
}

// text draws s with its baseline at y, shrinking it until it fits in maxW.
func (f fonts) text(dst *image.RGBA, ft *opentype.Font, s string, size float64, x, y int, center bool, maxW int) {
	for ; size > 8; size *= 0.9 {
		face, err := opentype.NewFace(ft, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingFull})
		if err != nil {
			return // the bundled Go fonts always load
		}
		d := &font.Drawer{Dst: dst, Src: image.NewUniform(color.White), Face: face}
		width := d.MeasureString(s).Round()
		if width > maxW {
			face.Close()
			continue
		}
		left := x
		if center {
			left = x - width/2
		}
		d.Dot = fixed.P(left, y)
		d.DrawString(s)
		face.Close()
		return
	}
}

func hsl(h, s, l float64) color.RGBA {
	h = math.Mod(math.Mod(h, 360)+360, 360) / 360
	hue := func(p, q, t float64) float64 {
		t = math.Mod(t+1, 1)
		switch {
		case t < 1.0/6:
			return p + (q-p)*6*t
		case t < 0.5:
			return q
		case t < 2.0/3:
			return p + (q-p)*(2.0/3-t)*6
		}
		return p
	}
	q := l * (1 + s)
	if l >= 0.5 {
		q = l + s - l*s
	}
	p := 2*l - q
	return color.RGBA{uint8(255 * hue(p, q, h+1.0/3)), uint8(255 * hue(p, q, h)), uint8(255 * hue(p, q, h-1.0/3)), 255}
}

func mix(a, b color.RGBA, t float64) color.RGBA {
	m := func(x, y uint8) uint8 { return uint8(float64(x)*(1-t) + float64(y)*t) }
	return color.RGBA{m(a.R, b.R), m(a.G, b.G), m(a.B, b.B), 255}
}
