package catalog

import "testing"

func price(n int64) *int64 { return new(n) }

func TestCheck(t *testing.T) {
	sizeColor := func() []Option {
		return []Option{{Name: "Size", Values: []string{"S", "M"}}, {Name: " Color ", Values: []string{"Red"}}}
	}
	tests := []struct {
		name     string
		options  []Option
		variants []Variant
		want     []string // fields expected to fail
	}{
		{"one plain variant", nil, []Variant{{Price: 100}}, nil},
		{"two plain variants", nil, []Variant{{Price: 100}, {Price: 200}}, []string{"variants"}},
		{"full combinations", sizeColor(), []Variant{
			{Price: 100, Options: map[string]string{"Size": "S", "Color": "Red"}},
			{Price: 120, Options: map[string]string{"Size": "M", "Color": " Red"}},
		}, nil},
		{"missing an option", sizeColor(), []Variant{{Price: 100, Options: map[string]string{"Size": "S"}}}, []string{"variants.0.options"}},
		{"unknown value", sizeColor(), []Variant{{Price: 100, Options: map[string]string{"Size": "XL", "Color": "Red"}}}, []string{"variants.0.options"}},
		{"duplicate combination", sizeColor(), []Variant{
			{Price: 100, Options: map[string]string{"Size": "S", "Color": "Red"}},
			{Price: 100, Options: map[string]string{"Size": "s", "Color": "red"}},
		}, []string{"variants.1.options", "variants.1.options"}},
		{"old price not higher", nil, []Variant{{Price: 100, CompareAt: price(100)}}, []string{"variants.0.compare_at_price"}},
		{"duplicate option name", []Option{{Name: "Size", Values: []string{"S"}}, {Name: "size", Values: []string{"M"}}}, nil, []string{"options.1.name"}},
		{"blank value", []Option{{Name: "Size", Values: []string{"S", " "}}}, nil, []string{"options.0.values"}},
		{"sku on a plain variant", nil, []Variant{{Price: 1, SKU: "A"}}, nil},
	}
	for _, tt := range tests {
		errs := Check(tt.options, tt.variants)
		for _, f := range tt.want {
			if errs[f] == "" {
				t.Errorf("%s: want an error on %s, got %v", tt.name, f, errs)
			}
		}
		if len(tt.want) == 0 && len(errs) > 0 {
			t.Errorf("%s: want no errors, got %v", tt.name, errs)
		}
	}
}

func TestPriceRange(t *testing.T) {
	lo, hi := PriceRange([]Variant{{Price: 500}, {Price: 120}, {Price: 900}})
	if lo != 120 || hi != 900 {
		t.Errorf("got %d..%d", lo, hi)
	}
}

func TestSlugify(t *testing.T) {
	for in, want := range map[string]string{
		"Cotton Panjabi — Navy (XL)": "cotton-panjabi-navy-xl",
		"  Jamdani  Saree ":          "jamdani-saree",
		"শাড়ি":                      "",
		"Attar 12ml":                 "attar-12ml",
	} {
		if got := Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
}
