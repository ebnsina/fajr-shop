import { db, adminUser, role, newId, eq } from '@fajr/db';
import { hashPassword, verifyPassword } from '../auth/password.ts';
import { issueSession, revokeAllSessions } from '../auth/session.ts';
import { consume } from '../auth/ratelimit.ts';
import { audit } from '../audit/index.ts';

export const LOGIN_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export type Staff = {
	id: string;
	email: string;
	name: string;
	roleId: string;
	permissions: string[];
};

export type LoginContext = { ip?: string | null; userAgent?: string | null; requestId?: string | null };

export type LoginResult =
	| { ok: true; token: string; expiresAt: Date; staff: Staff }
	| { ok: false; reason: 'invalid' | 'disabled' | 'rate_limited' };

/** Load a staff member with their role's permissions flattened in. */
export async function getStaff(id: string): Promise<Staff | null> {
	const row = await db.read
		.select({
			id: adminUser.id,
			email: adminUser.email,
			name: adminUser.name,
			roleId: adminUser.roleId,
			isActive: adminUser.isActive,
			permissions: role.permissions
		})
		.from(adminUser)
		.innerJoin(role, eq(role.id, adminUser.roleId))
		.where(eq(adminUser.id, id))
		.limit(1);

	const staff = row[0];
	if (!staff || !staff.isActive) return null;
	return {
		id: staff.id,
		email: staff.email,
		name: staff.name,
		roleId: staff.roleId,
		permissions: staff.permissions
	};
}

export async function login(
	email: string,
	password: string,
	ctx: LoginContext = {}
): Promise<LoginResult> {
	// Per-IP, because per-email lets an attacker lock a known admin out.
	if (ctx.ip) {
		const limit = await consume(`login:admin:ip:${ctx.ip}`, LOGIN_LIMIT.limit, LOGIN_LIMIT.windowMs);
		if (!limit.allowed) return { ok: false, reason: 'rate_limited' };
	}

	const row = await db.read.query.adminUser.findFirst({
		where: eq(adminUser.email, email.trim().toLowerCase())
	});

	// Hash anyway when the user is missing, so a wrong email and a wrong
	// password take the same time and the endpoint isn't an account oracle.
	if (!row) {
		await verifyPassword(
			'$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$5vQyO0nJYCZBqvVEQFvJvOaHqU0kzDGjEQhTVdWpKGY',
			password
		);
		return { ok: false, reason: 'invalid' };
	}

	if (!(await verifyPassword(row.passwordHash, password))) {
		await audit({
			actorType: 'admin',
			actorId: row.id,
			action: 'login.failed',
			entity: 'admin_user',
			entityId: row.id,
			ip: ctx.ip,
			requestId: ctx.requestId
		});
		return { ok: false, reason: 'invalid' };
	}

	if (!row.isActive) return { ok: false, reason: 'disabled' };

	const staff = await getStaff(row.id);
	if (!staff) return { ok: false, reason: 'disabled' };

	const { token, expiresAt } = await issueSession(row.id, 'admin', ctx);
	await db.write.update(adminUser).set({ lastLoginAt: new Date() }).where(eq(adminUser.id, row.id));
	await audit({
		actorType: 'admin',
		actorId: row.id,
		action: 'login.success',
		entity: 'admin_user',
		entityId: row.id,
		ip: ctx.ip,
		requestId: ctx.requestId
	});

	return { ok: true, token, expiresAt, staff };
}

export async function createStaff(input: {
	email: string;
	password: string;
	name: string;
	roleId: string;
}): Promise<Staff> {
	const id = newId('adm');
	await db.write.insert(adminUser).values({
		id,
		email: input.email.trim().toLowerCase(),
		passwordHash: await hashPassword(input.password),
		name: input.name,
		roleId: input.roleId
	});
	const staff = await getStaff(id);
	if (!staff) throw new Error('staff created but not readable');
	return staff;
}

/** Privilege change kills every existing session — that's the point of DB sessions. */
export async function setStaffRole(id: string, roleId: string): Promise<void> {
	await db.write.update(adminUser).set({ roleId }).where(eq(adminUser.id, id));
	await revokeAllSessions(id, 'admin');
	await audit({ actorType: 'system', action: 'role.changed', entity: 'admin_user', entityId: id, meta: { roleId } });
}

export async function deactivateStaff(id: string): Promise<void> {
	await db.write.update(adminUser).set({ isActive: false }).where(eq(adminUser.id, id));
	await revokeAllSessions(id, 'admin');
}

export const can = (staff: Staff, permission: string): boolean =>
	staff.permissions.includes('*') || staff.permissions.includes(permission);
