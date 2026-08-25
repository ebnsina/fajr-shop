// BD administrative geography, division → district. Upazila/thana stays free text: the full
// list is ~500 rows and no merchant prices below district level on day one.
export const BD_DISTRICTS: Record<string, string[]> = {
	Dhaka: ['Dhaka', 'Gazipur', 'Kishoreganj', 'Manikganj', 'Munshiganj', 'Narayanganj', 'Narsingdi', 'Tangail', 'Faridpur', 'Gopalganj', 'Madaripur', 'Rajbari', 'Shariatpur'],
	Chattogram: ['Chattogram', "Cox's Bazar", 'Cumilla', 'Brahmanbaria', 'Chandpur', 'Feni', 'Lakshmipur', 'Noakhali', 'Bandarban', 'Khagrachhari', 'Rangamati'],
	Khulna: ['Khulna', 'Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
	Rajshahi: ['Rajshahi', 'Bogura', 'Joypurhat', 'Naogaon', 'Natore', 'Chapainawabganj', 'Pabna', 'Sirajganj'],
	Barishal: ['Barishal', 'Barguna', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
	Sylhet: ['Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj'],
	Rangpur: ['Rangpur', 'Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Thakurgaon'],
	Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur']
};

export const BD_DIVISIONS = Object.keys(BD_DISTRICTS);

export const districtsOf = (division: string | null | undefined): string[] =>
	(division && BD_DISTRICTS[division]) || Object.values(BD_DISTRICTS).flat().sort();

export const divisionOf = (district: string): string | null =>
	BD_DIVISIONS.find((d) => BD_DISTRICTS[d]!.includes(district)) ?? null;
