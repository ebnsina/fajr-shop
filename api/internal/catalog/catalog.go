// Package catalog holds the rules a product must meet, with no I/O.
package catalog

import (
	"fmt"
	"maps"
	"slices"
	"strings"
	"unicode"
)

type Option struct {
	Name   string   `json:"name"`
	Values []string `json:"values"`
}

type Variant struct {
	ID        string // empty for a new variant
	SKU       string
	Price     int64
	CompareAt *int64
	Options   map[string]string
}

// Check returns a message per invalid field, keyed like the request body ("variants.1.options").
// Options and variant values come back trimmed.
func Check(options []Option, variants []Variant) map[string]string {
	errs := map[string]string{}
	names := map[string]bool{}
	for i := range options {
		o := &options[i]
		o.Name = strings.TrimSpace(o.Name)
		key := strings.ToLower(o.Name)
		switch {
		case o.Name == "":
			errs[fmt.Sprintf("options.%d.name", i)] = "Give the option a name, like Size."
		case names[key]:
			errs[fmt.Sprintf("options.%d.name", i)] = "Each option needs a different name."
		}
		names[key] = true
		seen := map[string]bool{}
		for j, v := range o.Values {
			o.Values[j] = strings.TrimSpace(v)
			if o.Values[j] == "" || seen[strings.ToLower(o.Values[j])] {
				errs[fmt.Sprintf("options.%d.values", i)] = "Each value must be filled in and different."
			}
			seen[strings.ToLower(o.Values[j])] = true
		}
	}

	combos := map[string]bool{}
	ids := map[string]bool{}
	skus := map[string]bool{}
	for i := range variants {
		v := &variants[i]
		at := func(field string) string { return fmt.Sprintf("variants.%d.%s", i, field) }
		for k, val := range v.Options {
			v.Options[k] = strings.TrimSpace(val)
		}
		if msg := checkCombination(options, v.Options); msg != "" {
			errs[at("options")] = msg
		}
		combo := comboKey(v.Options)
		if combos[combo] {
			errs[at("options")] = "Another variant already has these options."
		}
		combos[combo] = true
		if v.CompareAt != nil && *v.CompareAt <= v.Price {
			errs[at("compare_at_price")] = "The old price must be higher than the price."
		}
		if v.ID != "" && ids[v.ID] {
			errs[at("id")] = "This variant is listed twice."
		}
		ids[v.ID] = v.ID != ""
		v.SKU = strings.TrimSpace(v.SKU)
		if v.SKU != "" && skus[v.SKU] {
			errs[at("sku")] = "Each variant needs a different SKU."
		}
		skus[v.SKU] = v.SKU != ""
	}
	if len(options) == 0 && len(variants) > 1 {
		errs["variants"] = "A product without options has exactly one variant."
	}
	return errs
}

func checkCombination(options []Option, chosen map[string]string) string {
	if len(chosen) != len(options) {
		return "Choose one value for each option."
	}
	for _, o := range options {
		v, ok := chosen[o.Name]
		if !ok || !slices.Contains(o.Values, v) {
			return "Choose one value for each option."
		}
	}
	return ""
}

func comboKey(opts map[string]string) string {
	var b strings.Builder
	for _, k := range slices.Sorted(maps.Keys(opts)) {
		b.WriteString(strings.ToLower(k))
		b.WriteByte(0)
		b.WriteString(strings.ToLower(opts[k]))
		b.WriteByte(0)
	}
	return b.String()
}

// PriceRange is the cheapest and dearest variant's price.
func PriceRange(variants []Variant) (lo, hi int64) {
	for i, v := range variants {
		if i == 0 || v.Price < lo {
			lo = v.Price
		}
		if v.Price > hi {
			hi = v.Price
		}
	}
	return lo, hi
}

// Slugify turns a name into a URL part: lowercase ASCII letters and digits joined by hyphens.
// A name with none of those (e.g. written in Bangla) gives "", and the caller picks one.
func Slugify(name string) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(name) {
		if r < unicode.MaxASCII && (unicode.IsLetter(r) || unicode.IsDigit(r)) {
			if dash && b.Len() > 0 {
				b.WriteByte('-')
			}
			b.WriteRune(r)
			dash = false
		} else {
			dash = true
		}
		if b.Len() >= 80 {
			break
		}
	}
	return b.String()
}
