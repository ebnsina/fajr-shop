// Package discount works out what a discount code takes off a cart.
package discount

import "time"

// Code is a discount as stored; amounts are in poisha.
type Code struct {
	Percent     bool
	Value       int64
	MaxDiscount *int64
	MinSubtotal int64
	StartsAt    *time.Time
	EndsAt      *time.Time
	UsageLimit  *int32
	UsedCount   int32
	Active      bool
}

// Unusable says why c can't be used at now, or "" when it can. The words match the API's reasons.
func (c Code) Unusable(now time.Time) string {
	switch {
	case !c.Active:
		return "inactive"
	case c.StartsAt != nil && now.Before(*c.StartsAt):
		return "not_started"
	case c.EndsAt != nil && !now.Before(*c.EndsAt):
		return "ended"
	case c.UsageLimit != nil && c.UsedCount >= *c.UsageLimit:
		return "used_up"
	}
	return ""
}

// Amount is what c takes off subtotal, and false when the subtotal is under its minimum.
// A percentage is rounded down to whole taka; nothing takes off more than the subtotal.
func (c Code) Amount(subtotal int64) (int64, bool) {
	if subtotal < c.MinSubtotal {
		return 0, false
	}
	off := c.Value
	if c.Percent {
		off = subtotal * c.Value / 100 / 100 * 100
	}
	if c.MaxDiscount != nil {
		off = min(off, *c.MaxDiscount)
	}
	return max(0, min(off, subtotal)), true
}
