// Package shipping prices delivery: which zone a district falls in, and what a parcel costs there.
package shipping

// District is one of Bangladesh's 64 districts.
type District struct{ Name, Division string }

// Districts lists every district, grouped by division in the order shoppers expect.
var Districts = func() []District {
	var out []District
	for _, d := range divisions {
		for _, n := range d.districts {
			out = append(out, District{n, d.name})
		}
	}
	return out
}()

var divisions = []struct {
	name      string
	districts []string
}{
	{"Dhaka", []string{"Dhaka", "Gazipur", "Narayanganj", "Narsingdi", "Munshiganj", "Manikganj", "Tangail", "Kishoreganj", "Faridpur", "Madaripur", "Shariatpur", "Rajbari", "Gopalganj"}},
	{"Chattogram", []string{"Chattogram", "Cox's Bazar", "Cumilla", "Brahmanbaria", "Chandpur", "Feni", "Noakhali", "Lakshmipur", "Khagrachhari", "Rangamati", "Bandarban"}},
	{"Rajshahi", []string{"Rajshahi", "Bogura", "Pabna", "Sirajganj", "Natore", "Naogaon", "Chapai Nawabganj", "Joypurhat"}},
	{"Khulna", []string{"Khulna", "Jashore", "Satkhira", "Bagerhat", "Kushtia", "Jhenaidah", "Magura", "Narail", "Chuadanga", "Meherpur"}},
	{"Barishal", []string{"Barishal", "Bhola", "Patuakhali", "Pirojpur", "Jhalokati", "Barguna"}},
	{"Sylhet", []string{"Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"}},
	{"Rangpur", []string{"Rangpur", "Dinajpur", "Kurigram", "Gaibandha", "Nilphamari", "Lalmonirhat", "Thakurgaon", "Panchagarh"}},
	{"Mymensingh", []string{"Mymensingh", "Jamalpur", "Netrokona", "Sherpur"}},
}

var known = func() map[string]bool {
	m := map[string]bool{}
	for _, d := range Districts {
		m[d.Name] = true
	}
	return m
}()

// IsDistrict reports whether name is one of the 64 districts, spelled as in Districts.
func IsDistrict(name string) bool { return known[name] }

// Rate is what a zone charges. Amounts are in poisha.
type Rate struct {
	BaseCharge  int64
	BaseWeightG int
	ExtraPerKg  int64
	FreeOver    *int64
}

// Charge is the delivery charge for a parcel: the base charge, plus ExtraPerKg for every
// kilogram or part of one over the base weight; nothing once the subtotal reaches FreeOver.
func (r Rate) Charge(weightG int, subtotal int64) (charge int64, free bool) {
	if r.FreeOver != nil && subtotal >= *r.FreeOver {
		return 0, true
	}
	charge = r.BaseCharge
	if over := weightG - r.BaseWeightG; over > 0 {
		charge += int64((over+999)/1000) * r.ExtraPerKg
	}
	return charge, false
}
