package discount

import (
	"testing"
	"time"
)

func TestAmount(t *testing.T) {
	cap := int64(15000)
	tests := []struct {
		name     string
		c        Code
		subtotal int64
		want     int64
		ok       bool
	}{
		{"10% rounds down to whole taka", Code{Percent: true, Value: 10}, 123456, 12300, true},
		{"percent capped", Code{Percent: true, Value: 20, MaxDiscount: &cap}, 200000, 15000, true},
		{"fixed", Code{Value: 20000}, 150000, 20000, true},
		{"fixed never beyond subtotal", Code{Value: 20000}, 5000, 5000, true},
		{"under minimum", Code{Value: 20000, MinSubtotal: 100000}, 99999, 0, false},
		{"exactly the minimum", Code{Value: 20000, MinSubtotal: 100000}, 100000, 20000, true},
		{"100% of an empty bag", Code{Percent: true, Value: 100}, 0, 0, true},
	}
	for _, tt := range tests {
		got, ok := tt.c.Amount(tt.subtotal)
		if got != tt.want || ok != tt.ok {
			t.Errorf("%s: got %d %v, want %d %v", tt.name, got, ok, tt.want, tt.ok)
		}
	}
}

func TestUnusable(t *testing.T) {
	now := time.Date(2026, 4, 1, 12, 0, 0, 0, time.UTC)
	later, earlier := now.Add(time.Hour), now.Add(-time.Hour)
	limit := int32(5)
	tests := []struct {
		c    Code
		want string
	}{
		{Code{Active: true}, ""},
		{Code{Active: false}, "inactive"},
		{Code{Active: true, StartsAt: &later}, "not_started"},
		{Code{Active: true, StartsAt: &now, EndsAt: &later}, ""},
		{Code{Active: true, EndsAt: &now}, "ended"},
		{Code{Active: true, EndsAt: &earlier}, "ended"},
		{Code{Active: true, UsageLimit: &limit, UsedCount: 4}, ""},
		{Code{Active: true, UsageLimit: &limit, UsedCount: 5}, "used_up"},
	}
	for i, tt := range tests {
		if got := tt.c.Unusable(now); got != tt.want {
			t.Errorf("%d: got %q, want %q", i, got, tt.want)
		}
	}
}
