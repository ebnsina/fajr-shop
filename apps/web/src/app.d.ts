import type { Staff } from '@fajr/core/staff';

declare global {
	namespace App {
		interface Locals {
			/** Resolved once per request in hooks.server.ts. */
			staff: Staff | null;
			requestId: string;
		}
	}
}

export {};
