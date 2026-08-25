import { db, session, eq, and, lt } from '@fajr/db';
import { newToken, hashToken } from './token.ts';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type UserType = 'admin' | 'customer';
export type SessionUser = { sessionId: string; userId: string; userType: UserType };

export type IssueContext = { ip?: string | null; userAgent?: string | null };

/** Returns the raw token — the only time it exists. Store the hash, hand this out. */
export async function issueSession(
	userId: string,
	userType: UserType,
	ctx: IssueContext = {}
): Promise<{ token: string; expiresAt: Date }> {
	const token = newToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.write.insert(session).values({
		id: hashToken(token),
		userId,
		userType,
		expiresAt,
		ip: ctx.ip ?? null,
		userAgent: ctx.userAgent ?? null
	});
	return { token, expiresAt };
}

// One indexed lookup per request. Sliding expiry extends only when under half the lifetime
// remains, so this isn't a write on every request.
export async function verifySession(token: string | undefined | null): Promise<SessionUser | null> {
	if (!token) return null;
	const id = hashToken(token);
	const row = await db.read.query.session.findFirst({ where: eq(session.id, id) });
	if (!row) return null;

	if (row.expiresAt.getTime() <= Date.now()) {
		await db.write.delete(session).where(eq(session.id, id));
		return null;
	}

	if (row.expiresAt.getTime() - Date.now() < SESSION_TTL_MS / 2) {
		await db.write
			.update(session)
			.set({ expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
			.where(eq(session.id, id));
	}

	return { sessionId: row.id, userId: row.userId, userType: row.userType };
}

export async function revokeSession(token: string): Promise<void> {
	await db.write.delete(session).where(eq(session.id, hashToken(token)));
}

/** "Sign out all devices", and what you run the moment you fire someone. */
export async function revokeAllSessions(userId: string, userType: UserType): Promise<void> {
	await db.write
		.delete(session)
		.where(and(eq(session.userId, userId), eq(session.userType, userType)));
}

// New token, old one dead. Run on admin login and on any privilege change — it's what stops a
// fixated session from surviving an escalation.
export async function rotateSession(
	oldToken: string,
	userId: string,
	userType: UserType,
	ctx: IssueContext = {}
) {
	await revokeSession(oldToken);
	return issueSession(userId, userType, ctx);
}

/** Housekeeping for the worker; expired rows are already rejected on read. */
export async function purgeExpiredSessions(): Promise<void> {
	await db.write.delete(session).where(lt(session.expiresAt, new Date()));
}
