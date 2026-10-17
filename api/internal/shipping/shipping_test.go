package shipping

import "testing"

func TestDistricts(t *testing.T) {
	if len(Districts) != 64 {
		t.Fatalf("want 64 districts, have %d", len(Districts))
	}
	seen := map[string]bool{}
	for _, d := range Districts {
		if seen[d.Name] {
			t.Errorf("%s listed twice", d.Name)
		}
		seen[d.Name] = true
	}
	if !IsDistrict("Cox's Bazar") || IsDistrict("Dhaka City") {
		t.Error("IsDistrict wrong")
	}
}

func TestCharge(t *testing.T) {
	free := int64(300000)
	r := Rate{BaseCharge: 7000, BaseWeightG: 1000, ExtraPerKg: 2000, FreeOver: &free}
	tests := []struct {
		weight   int
		subtotal int64
		want     int64
		wantFree bool
	}{
		{500, 100000, 7000, false},
		{1000, 100000, 7000, false},  // exactly the base weight
		{1001, 100000, 9000, false},  // any part of a kilo counts as one
		{3500, 100000, 13000, false}, // 2.5 kg over: three more kilos
		{8000, 300000, 0, true},      // free over 3,000 taka, whatever it weighs
	}
	for _, tt := range tests {
		got, gotFree := r.Charge(tt.weight, tt.subtotal)
		if got != tt.want || gotFree != tt.wantFree {
			t.Errorf("Charge(%d g, %d) = %d, %v; want %d, %v", tt.weight, tt.subtotal, got, gotFree, tt.want, tt.wantFree)
		}
	}
	noFree := Rate{BaseCharge: 13000, BaseWeightG: 1000}
	if got, _ := noFree.Charge(5000, 99999999); got != 13000 {
		t.Errorf("no per-kg charge and no free threshold: %d", got)
	}
}
