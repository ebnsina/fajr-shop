package seed

// The demo catalog: what a general Bangladeshi online shop sells. Prices are in taka.

type option struct {
	name   string
	values []string
	// step is added to the base price per position in values (bigger pack, bigger size).
	step int
}

type sub struct {
	name   string
	brands []string
	models []string
	low    int // base price range, taka
	high   int
	opts   []option
	about  string
}

type top struct {
	name string
	hue  float64 // picture color, degrees
	subs []sub
}

var (
	clothSizes = option{name: "Size", values: []string{"S", "M", "L", "XL", "XXL"}}
	shoeSizes  = option{name: "Size", values: []string{"39", "40", "41", "42", "43", "44"}}
	colors     = option{name: "Color", values: []string{"Black", "White", "Navy", "Maroon"}}
	shades     = option{name: "Color", values: []string{"Red", "Teal", "Mustard", "Off-white", "Purple"}}
)

var shelves = []top{
	{"Mobiles & Gadgets", 215, []sub{
		{"Smartphones", []string{"Samsung", "Xiaomi", "Realme", "Walton", "Symphony", "Tecno", "Infinix"},
			[]string{"Note 13", "A15", "C55", "Primo S8", "Z60", "Spark 20", "Hot 40", "Galaxy A25", "Redmi 13C", "Narzo N61"},
			12000, 45000, []option{{name: "Memory", values: []string{"4/64GB", "6/128GB", "8/256GB"}, step: 3000}, {name: "Color", values: []string{"Black", "Blue", "Green"}}},
			"Official warranty, PTA-approved, with a 1-year replacement guarantee on manufacturing faults."},
		{"Feature Phones", []string{"Symphony", "Walton", "Nokia", "itel"}, []string{"B12", "L110", "105", "Olvio L32", "Power 400"},
			900, 2800, []option{{name: "Color", values: []string{"Black", "Blue", "Red"}}}, "Dual SIM, long battery life, loud speaker and FM radio."},
		{"Power Banks", []string{"Xiaomi", "Anker", "Baseus", "Remax"}, []string{"10000mAh", "20000mAh Fast Charge", "PD 22.5W", "Slim 10000"},
			1100, 3800, nil, "Charges two phones at once; safe against overcharge and short circuit."},
		{"Earbuds & Headphones", []string{"QCY", "Haylou", "JBL", "Realme", "Lenovo"}, []string{"T13", "GT7", "Tune 510BT", "Buds T110", "LP40 Pro"},
			900, 6500, []option{colors}, "Bluetooth 5.3, clear calls and up to 30 hours with the case."},
		{"Smart Watches", []string{"Xiaomi", "Haylou", "Kieslect", "Amazfit", "Zeblaze"}, []string{"Watch 2", "RS5", "Calling KS", "Bip 5", "Btalk 3"},
			2200, 9500, []option{{name: "Color", values: []string{"Black", "Silver", "Pink"}}}, "Heart rate, sleep and step tracking; Bluetooth calling on supported models."},
	}},
	{"Electronics", 25, []sub{
		{"Televisions", []string{"Walton", "Vision", "Singer", "Sony", "Samsung"}, []string{"Smart Android TV", "Google TV", "Frameless LED TV", "4K UHD TV"},
			18000, 95000, []option{{name: "Screen", values: []string{"32 inch", "43 inch", "55 inch"}, step: 14000}}, "Smart TV with Netflix and YouTube, two HDMI ports and a wall mount."},
		{"Refrigerators", []string{"Walton", "Singer", "Jamuna", "Minister", "Haier"}, []string{"Frost Free", "Direct Cool", "Inverter Refrigerator", "Glass Door"},
			28000, 95000, []option{{name: "Capacity", values: []string{"252 Liter", "312 Liter", "380 Liter"}, step: 8000}}, "Low noise inverter compressor with up to 12 years compressor warranty."},
		{"Air Conditioners", []string{"Walton", "Gree", "General", "Midea", "Singer"}, []string{"Inverter Split AC", "Non-Inverter AC", "Smart Wi-Fi AC"},
			45000, 115000, []option{{name: "Capacity", values: []string{"1 Ton", "1.5 Ton", "2 Ton"}, step: 12000}}, "Cools fast, saves power, and includes standard installation inside Dhaka."},
		{"Fans", []string{"Walton", "Vision", "Click", "Jamuna", "Super Star"}, []string{"Ceiling Fan 56\"", "Table Fan 16\"", "Rechargeable Fan", "Stand Fan", "Wall Fan"},
			1800, 7500, nil, "Copper winding motor, low power use, three speeds."},
		{"Kitchen Appliances", []string{"Miyako", "Vision", "Walton", "Panasonic", "Philips"}, []string{"Rice Cooker 2.8L", "Blender 3-in-1", "Infrared Cooker", "Electric Kettle 1.8L", "Air Fryer 4.5L"},
			1500, 12000, nil, "Easy to clean, with an auto shut-off for safety."},
	}},
	{"Men's Fashion", 140, []sub{
		{"Panjabi", []string{"Aarong", "Yellow", "Richman", "Lubnan", "Infinity"}, []string{"Cotton Panjabi", "Embroidered Panjabi", "Slim Fit Panjabi", "Linen Panjabi", "Eid Special Panjabi"},
			1200, 5500, []option{clothSizes, colors}, "Breathable cotton, hand-finished neckline, regular fit."},
		{"Shirts", []string{"Ecstasy", "Richman", "Cats Eye", "Yellow"}, []string{"Formal Shirt", "Casual Check Shirt", "Oxford Shirt", "Denim Shirt"},
			900, 3200, []option{clothSizes, colors}, "Easy-iron fabric, two-button cuff."},
		{"T-Shirts & Polos", []string{"Ecstasy", "Infinity", "Twelve", "Sailor"}, []string{"Polo Shirt", "Round Neck Tee", "Graphic Tee", "Henley Tee"},
			450, 1600, []option{clothSizes, colors}, "100% combed cotton, colorfast after wash."},
		{"Lungi & Gamcha", []string{"Standard", "Amanat Shah", "Pakiza", "Rupchanda"}, []string{"Check Lungi", "Batik Lungi", "Cotton Gamcha", "Premium Lungi"},
			250, 1100, nil, "Soft, durable weave made in Bangladesh."},
		{"Men's Footwear", []string{"Bata", "Apex", "Lotto", "Bay"}, []string{"Leather Loafer", "Sandal", "Sports Shoe", "Formal Shoe", "Slipper"},
			600, 6500, []option{shoeSizes}, "Cushioned insole and a non-slip sole."},
	}},
	{"Women's Fashion", 330, []sub{
		{"Saree", []string{"Aarong", "Tangail Tant", "Jamdani House", "Kay Kraft"}, []string{"Jamdani Saree", "Tangail Tant Saree", "Katan Saree", "Cotton Saree", "Muslin Saree", "Silk Saree"},
			1500, 25000, []option{shades}, "Handwoven by Bangladeshi weavers, with blouse piece."},
		{"Salwar Kameez", []string{"Aarong", "Anjan's", "Kay Kraft", "Sailor"}, []string{"Three-Piece", "Printed Two-Piece", "Embroidered Three-Piece", "Lawn Three-Piece"},
			1200, 6500, []option{{name: "Size", values: []string{"36", "38", "40", "42"}}, shades}, "Unstitched or ready-made; soft lawn and cotton."},
		{"Hijab & Abaya", []string{"Modest", "Sailor", "Shoshi", "Hijab House"}, []string{"Jersey Hijab", "Chiffon Hijab", "Abaya", "Borka with Niqab", "Prayer Set"},
			350, 4500, []option{shades}, "Breathable, opaque fabric for everyday wear."},
		{"Women's Footwear", []string{"Bata", "Apex", "Lotto", "Bay"}, []string{"Flat Sandal", "Heel Sandal", "Ballerina", "Sneaker"},
			700, 4500, []option{{name: "Size", values: []string{"36", "37", "38", "39", "40"}}}, "Lightweight with a padded footbed."},
	}},
	{"Daily Bazar", 95, []sub{
		{"Rice", []string{"PRAN", "ACI", "Chashi", "Teer", "Rupchanda"}, []string{"Miniket Rice", "Nazirshail Rice", "Chinigura Rice", "Basmati Rice", "Atop Rice"},
			90, 700, []option{{name: "Pack", values: []string{"1 kg", "5 kg", "10 kg"}, step: 450}}, "Clean, aged rice, sorted and packed hygienically."},
		{"Oil & Ghee", []string{"Teer", "Rupchanda", "Fresh", "Bashundhara", "Radhuni"}, []string{"Soybean Oil", "Mustard Oil", "Rice Bran Oil", "Pure Ghee"},
			190, 1200, []option{{name: "Pack", values: []string{"1 L", "2 L", "5 L"}, step: 320}}, "Fortified with vitamin A, sealed for freshness."},
		{"Spices", []string{"Radhuni", "PRAN", "ACI", "BD Foods"}, []string{"Turmeric Powder", "Chilli Powder", "Cumin Powder", "Biryani Masala", "Meat Curry Masala", "Garam Masala"},
			40, 380, []option{{name: "Pack", values: []string{"100 g", "200 g", "500 g"}, step: 60}}, "Ground from carefully selected spices, no added color."},
		{"Lentils & Flour", []string{"Teer", "ACI", "Fresh", "PRAN"}, []string{"Masoor Dal", "Moong Dal", "Atta", "Maida", "Suji"},
			70, 480, []option{{name: "Pack", values: []string{"1 kg", "2 kg"}, step: 90}}, "Cleaned and packed without hand contact."},
		{"Snacks & Biscuits", []string{"PRAN", "Olympic", "Danish", "Bombay Sweets", "Kishwan"}, []string{"Chanachur", "Energy Plus Biscuit", "Potato Crackers", "Cookies", "Toast Biscuit", "Dry Cake"},
			20, 320, nil, "Crispy and fresh, in a resealable pack."},
		{"Tea & Beverages", []string{"Ispahani", "Seylon", "Finlay", "Kazi & Kazi", "Nescafe"}, []string{"Mirzapore Tea", "Green Tea", "Premium Blend Tea", "Instant Coffee", "Organic Tea"},
			120, 950, []option{{name: "Pack", values: []string{"200 g", "400 g"}, step: 160}}, "Strong, bright liquor from Bangladeshi gardens."},
	}},
	{"Baby Care", 50, []sub{
		{"Diapers", []string{"Supermom", "Pampers", "Molfix", "Neocare"}, []string{"Baby Pant Diaper", "Belt Diaper", "Premium Diaper"},
			650, 2400, []option{{name: "Size", values: []string{"S", "M", "L", "XL"}, step: 120}}, "Up to 12 hours dry, with a wetness indicator."},
		{"Baby Food", []string{"Nestle", "Lactogen", "Cerelac", "Dano"}, []string{"Infant Formula", "Rice Cereal", "Wheat Cereal", "Growing Up Milk"},
			450, 2200, nil, "For babies from 6 months, with iron and vitamins."},
		{"Toys", []string{"Playtime", "Toy Bazar", "Funskool"}, []string{"Building Blocks", "Remote Car", "Doll House", "Rocking Horse", "Puzzle Set"},
			350, 4800, nil, "Non-toxic materials, rounded edges."},
	}},
	{"Health & Beauty", 300, []sub{
		{"Skin Care", []string{"Ponds", "Fair & Lovely", "Neutrogena", "Cosrx", "Simple"}, []string{"Face Wash", "Moisturiser", "Sunscreen SPF 50", "Night Cream", "Toner"},
			220, 2200, nil, "Gentle on skin, dermatologically tested."},
		{"Hair Care", []string{"Sunsilk", "Dove", "Parachute", "Meril", "Head & Shoulders"}, []string{"Shampoo", "Conditioner", "Coconut Oil", "Hair Serum"},
			150, 950, []option{{name: "Pack", values: []string{"180 ml", "340 ml"}, step: 180}}, "For soft, manageable hair."},
		{"Attar & Perfume", []string{"Al Rehab", "Ajmal", "Swiss Arabian", "Arabian Oud"}, []string{"Oud Attar", "Musk Attar", "Rose Attar", "Sandal Attar", "Amber Attar"},
			250, 6500, []option{{name: "Pack", values: []string{"3 ml", "6 ml", "12 ml"}, step: 350}}, "Alcohol-free, long-lasting concentrated oil."},
	}},
	{"Home & Living", 160, []sub{
		{"Bedsheets", []string{"Aarong", "Bed Bath", "Living", "Akij"}, []string{"Cotton Bedsheet Set", "Printed Bedsheet", "King Size Bedsheet", "Nakshi Kantha"},
			850, 5500, []option{shades}, "Includes two pillow covers; colorfast cotton."},
		{"Kitchenware", []string{"Kiam", "RFL", "Diamond", "Prestige"}, []string{"Non-stick Fry Pan", "Pressure Cooker 5L", "Dinner Set 32 Pcs", "Glass Jar Set", "Knife Set"},
			400, 7500, nil, "Food-grade materials, easy to clean."},
		{"Home Decor", []string{"Aarong", "Otobi", "Kay Kraft", "Hatil"}, []string{"Jute Basket", "Wall Clock", "Table Lamp", "Photo Frame", "Terracotta Vase"},
			300, 6500, nil, "Crafted to add warmth to any room."},
	}},
	{"Books & Stationery", 45, []sub{
		{"Islamic Books", []string{"Sharia", "Darussalam", "Somokalin", "Rahnuma"}, []string{"Tafsir Ibn Kathir Vol 1", "Riyadus Salihin", "Sirat Ibn Hisham", "Fortress of the Muslim", "Stories of the Prophets"},
			250, 1800, nil, "Clear print on quality paper, Bangla translation."},
		{"Bangla Books", []string{"Prothoma", "Anyaprokash", "Kakoli", "Adorn"}, []string{"Novel Collection", "Children's Rhymes", "Poetry Collection", "History of Bengal", "Science Fiction"},
			180, 1200, nil, "From Bangladesh's best-known publishers."},
		{"Stationery", []string{"Matador", "Deli", "Faber-Castell", "Navana"}, []string{"Ball Pen Box", "Exercise Book Pack", "Geometry Box", "Color Pencil Set", "School Bag"},
			60, 2200, nil, "Everything for school and office."},
	}},
	{"Sports & Outdoors", 0, []sub{
		{"Cricket", []string{"SS", "SG", "Kookaburra", "CA"}, []string{"English Willow Bat", "Kashmir Willow Bat", "Tennis Ball Pack", "Batting Gloves", "Leather Ball"},
			450, 12000, nil, "Match-grade gear for club and street cricket."},
		{"Football", []string{"Nivia", "Adidas", "Nike", "Vector X"}, []string{"Football Size 5", "Jersey", "Shin Guard", "Goalkeeper Gloves"},
			650, 4500, nil, "Durable stitching for turf and field."},
		{"Fitness", []string{"Fitness World", "Decathlon", "Spartan"}, []string{"Dumbbell Set", "Yoga Mat", "Skipping Rope", "Resistance Bands", "Exercise Cycle"},
			300, 28000, nil, "Train at home with gear built to last."},
	}},
}

var highlights = []struct{ icon, title, text string }{
	{"cash", "Cash on delivery", "Pay when your order arrives"},
	{"truck", "Delivery all over Bangladesh", "Inside Dhaka in 1–2 days"},
	{"return", "7-day easy return", "Changed your mind? Send it back"},
	{"phone", "Hotline support", "Every day, 9 am to 10 pm"},
}

var banners = []struct {
	placement, title, line string
	category               string // links to this top-level category; empty links to the whole shop
	hue                    float64
}{
	{"hero", "Eid Collection", "New panjabis and sarees, up to 25% off", "Men's Fashion", 140},
	{"hero", "Gadget Week", "Smartphones and earbuds at their best prices", "Mobiles & Gadgets", 215},
	{"hero", "Daily Bazar", "Rice, oil and spices delivered to your door", "Daily Bazar", 95},
	{"side", "Beat the Heat", "Fans and air conditioners", "Electronics", 25},
	{"side", "Baby Care", "Diapers and baby food", "Baby Care", 50},
	{"wide", "Free delivery inside Dhaka", "On orders over 2,000 taka", "", 160},
	{"wide", "Attar & Perfume", "Alcohol-free, long-lasting", "Health & Beauty", 300},
}

// grams looks up a subcategory's packed weight; anything unlisted ships as half a kilo.
func gramsFor(name string) int {
	if g, ok := weights[name]; ok {
		return g
	}
	return 500
}

var weights = map[string]int{
	"Smartphones":          400,
	"Feature Phones":       250,
	"Power Banks":          400,
	"Earbuds & Headphones": 200,
	"Smart Watches":        200,
	"Televisions":          12000,
	"Refrigerators":        55000,
	"Air Conditioners":     45000,
	"Fans":                 6000,
	"Kitchen Appliances":   3500,
	"Panjabi":              500,
	"Shirts":               400,
	"T-Shirts & Polos":     300,
	"Lungi & Gamcha":       400,
	"Men's Footwear":       1000,
	"Saree":                800,
	"Salwar Kameez":        600,
	"Hijab & Abaya":        400,
	"Women's Footwear":     800,
	"Rice":                 1000,
	"Oil & Ghee":           1000,
	"Spices":               200,
	"Lentils & Flour":      1000,
	"Snacks & Biscuits":    300,
	"Tea & Beverages":      400,
	"Diapers":              1500,
	"Baby Food":            500,
	"Toys":                 1500,
	"Skin Care":            250,
	"Hair Care":            400,
	"Attar & Perfume":      150,
	"Bedsheets":            1500,
	"Kitchenware":          2500,
	"Home Decor":           1200,
	"Islamic Books":        700,
	"Bangla Books":         500,
	"Stationery":           400,
	"Cricket":              1500,
	"Football":             800,
	"Fitness":              5000,
}

var zones = []struct {
	name, days            string
	districts             []string // nil: every district not in an earlier zone
	base, perKg, freeOver int64    // taka; freeOver 0 means never free
}{
	{"Inside Dhaka", "1–2 days", []string{"Dhaka"}, 70, 20, 3000},
	{"Dhaka suburbs", "2–3 days", []string{"Gazipur", "Narayanganj", "Narsingdi", "Munshiganj", "Manikganj"}, 100, 25, 0},
	{"Outside Dhaka", "3–5 days", nil, 130, 30, 0},
}
