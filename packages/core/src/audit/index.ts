import { db, auditLog, newId } from '@fajr/db';

export type AuditEntry = {
	actorType: 'admin' | 'customer' | 'system' | 'agent';
	actorId?: string | null;
	action: string;
	entity: string;
	entityId?: string | null;
	meta?: Record<string, unknown>;
	ip?: string | null;
	requestId?: string | null;
};

// "Who changed this price?" is the most common question in a shop with staff, so this is a
// feature, not compliance.
export async function audit(entry: AuditEntry): Promise<void> {
	try {
		await db.write.insert(auditLog).values({
			id: newId('log'),
			actorType: entry.actorType,
			actorId: entry.actorId ?? null,
			action: entry.action,
			entity: entry.entity,
			entityId: entry.entityId ?? null,
			meta: entry.meta ?? null,
			ip: entry.ip ?? null,
			requestId: entry.requestId ?? null
		});
	} catch (err) {
		console.error(JSON.stringify({ t: new Date().toISOString(), auditFailed: String(err) }));
	}
}
