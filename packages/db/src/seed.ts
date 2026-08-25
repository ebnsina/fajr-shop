// Idempotent first-run seed: owner role, first admin, settings row. Fills in only what is missing.
// ADMIN_EMAIL / ADMIN_PASSWORD override the defaults; without them a password is generated.
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { countryOf } from '@fajr/schemas';
import { db, role, adminUser, setting, shippingZone, newId, eq } from './index.ts';

const email = (process.env.ADMIN_EMAIL ?? 'admin@fajr.shop').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString('base64url');
const generated = !process.env.ADMIN_PASSWORD;

const ROLES = [
	{ id: 'owner', name: 'Owner', permissions: ['*'] },
	{
		id: 'manager',
		name: 'Manager',
		permissions: [
			'catalog.read', 'catalog.write',
			'order.read', 'order.write',
			'customer.read', 'customer.write',
			'cms.read', 'cms.write',
			'report.read'
		]
	},
	{ id: 'staff', name: 'Staff', permissions: ['catalog.read', 'order.read', 'order.write', 'customer.read'] }
];

for (const r of ROLES) {
	await db.write.insert(role).values(r).onConflictDoUpdate({
		target: role.id,
		set: { name: r.name, permissions: r.permissions }
	});
}

await db.write.insert(setting).values({ id: 'default' }).onConflictDoNothing();

// Two zones is what a BD shop actually needs on day one. The advance is the delivery charge —
// collecting it up front is what cuts fake COD orders.
await db.write
	.insert(shippingZone)
	.values(
		countryOf(process.env.STORE_COUNTRY ?? 'BD').zones.map((zone, i) => ({
			id: `zone_${i}`,
			name: zone.name,
			districts: zone.areas,
			chargeMinor: zone.chargeMinor,
			advanceMinor: zone.advanceMinor,
			freeOverMinor: zone.freeOverMinor,
			sort: i
		}))
	)
	.onConflictDoNothing();

const existing = await db.read.query.adminUser.findFirst({ where: eq(adminUser.email, email) });
if (existing) {
	console.log(`admin ${email} already exists — left untouched`);
} else {
	await db.write.insert(adminUser).values({
		id: newId('adm'),
		email,
		passwordHash: await hash(password),
		name: 'Owner',
		roleId: 'owner'
	});
	console.log(`\n  admin created\n  email:    ${email}`);
	console.log(generated ? `  password: ${password}   (generated — save it now)\n` : '  password: (from ADMIN_PASSWORD)\n');
}

await db.close();
