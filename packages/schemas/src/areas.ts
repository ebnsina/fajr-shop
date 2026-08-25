// Second-level delivery areas, keyed by the first-level area a customer picks.
// This is what makes the address two dependent fields instead of one free-text
// box a courier has to guess at. Districts without a list fall back to typing.
export const BD_THANAS: Record<string, string[]> = {
	Dhaka: ['Adabar', 'Badda', 'Banani', 'Bangshal', 'Cantonment', 'Chalkbazar', 'Dakshinkhan', 'Darus Salam', 'Demra', 'Dhanmondi', 'Gendaria', 'Gulshan', 'Hazaribagh', 'Jatrabari', 'Kafrul', 'Kalabagan', 'Kamrangirchar', 'Khilgaon', 'Khilkhet', 'Kotwali', 'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Mugda', 'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Sabujbagh', 'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur', 'Tejgaon', 'Turag', 'Uttara', 'Uttarkhan', 'Vatara', 'Wari'],
	Gazipur: ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'],
	Narayanganj: ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon', 'Siddhirganj'],
	Chattogram: ['Kotwali', 'Pahartali', 'Panchlaish', 'Double Mooring', 'Halishahar', 'Bayezid Bostami', 'Chandgaon', 'Patenga', 'Bakalia', 'Khulshi', 'Hathazari', 'Sitakunda', 'Patiya', 'Anwara', 'Boalkhali', 'Fatikchhari', 'Lohagara', 'Mirsharai', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania'],
	"Cox's Bazar": ["Cox's Bazar Sadar", 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Ramu', 'Teknaf', 'Ukhia', 'Pekua'],
	Cumilla: ['Cumilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Titas'],
	Sylhet: ['Sylhet Sadar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Zakiganj'],
	Khulna: ['Khulna Sadar', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada', 'Sonadanga', 'Khalishpur', 'Daulatpur'],
	Rajshahi: ['Rajshahi Sadar', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore', 'Boalia', 'Motihar', 'Shah Makhdum'],
	Barishal: ['Barishal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
	Rangpur: ['Rangpur Sadar', 'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
	Mymensingh: ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal'],
	Jashore: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
	Bogura: ['Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
	Tangail: ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur'],
	Dinajpur: ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur']
};

// The Gulf sells to a handful of dense urban areas per emirate, not hundreds.
export const AE_AREAS: Record<string, string[]> = {
	Dubai: ['Deira', 'Bur Dubai', 'Dubai Marina', 'Jumeirah', 'JLT', 'Business Bay', 'Downtown Dubai', 'Al Barsha', 'Al Quoz', 'Mirdif', 'Silicon Oasis', 'International City', 'Dubai Sports City', 'Arabian Ranches', 'Palm Jumeirah', 'Al Nahda', 'Karama', 'Satwa'],
	'Abu Dhabi': ['Al Reem Island', 'Khalifa City', 'Al Khalidiyah', 'Al Bateen', 'Musaffah', 'Yas Island', 'Saadiyat Island', 'Mohammed Bin Zayed City', 'Al Shamkha', 'Al Mushrif', 'Al Raha', 'Al Ain'],
	Sharjah: ['Al Nahda', 'Al Majaz', 'Al Qasimia', 'Muweilah', 'Al Khan', 'Al Taawun', 'Al Rolla', 'Al Layyah'],
	Ajman: ['Al Nuaimiya', 'Al Rashidiya', 'Al Jurf', 'Ajman Corniche', 'Al Mowaihat'],
	'Ras Al Khaimah': ['Al Nakheel', 'Al Dhait', 'Al Hamra', 'Mina Al Arab', 'Al Rams'],
	Fujairah: ['Fujairah City', 'Dibba', 'Al Faseel', 'Sakamkam'],
	'Umm Al Quwain': ['Umm Al Quwain City', 'Al Salamah', 'Al Raas']
};

export const SA_CITIES: Record<string, string[]> = {
	Riyadh: ['Riyadh', 'Al Kharj', 'Al Majmaah', 'Al Diriyah', 'Al Zulfi', 'Wadi Al Dawasir'],
	Makkah: ['Makkah', 'Jeddah', 'Taif', 'Rabigh', 'Al Qunfudhah'],
	Madinah: ['Madinah', 'Yanbu', 'Badr', 'Al Ula'],
	'Eastern Province': ['Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Qatif', 'Hofuf', 'Hafr Al Batin'],
	Asir: ['Abha', 'Khamis Mushait', 'Bisha', 'Al Namas'],
	Tabuk: ['Tabuk', 'Duba', 'Haql', 'Umluj'],
	Hail: ['Hail', 'Baqaa', 'Al Shinan'],
	'Northern Borders': ['Arar', 'Rafha', 'Turaif'],
	Jazan: ['Jazan', 'Sabya', 'Abu Arish'],
	Najran: ['Najran', 'Sharurah'],
	'Al Bahah': ['Al Bahah', 'Baljurashi'],
	'Al Jouf': ['Sakaka', 'Qurayyat', 'Dumat Al Jandal'],
	Qassim: ['Buraidah', 'Unaizah', 'Al Rass', 'Al Bukayriyah']
};

const BY_COUNTRY: Record<string, Record<string, string[]>> = {
	BD: BD_THANAS,
	AE: AE_AREAS,
	SA: SA_CITIES
};

// The list for the picked first-level area. Empty means "let them type it",
// which is correct for markets we have not mapped yet.
export const subAreasOf = (country: string | null | undefined, area: string | null | undefined): string[] =>
	(area && BY_COUNTRY[(country ?? 'BD').toUpperCase()]?.[area]) || [];

// Whether this market has a mapped second level at all. Asked before a first
// level is picked, so the field can prompt rather than fall back to free text.
export const hasSubAreas = (country: string | null | undefined): boolean =>
	Boolean(BY_COUNTRY[(country ?? 'BD').toUpperCase()]);
