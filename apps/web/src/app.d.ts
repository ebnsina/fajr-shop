import type { Staff } from '@fajr/core/staff';
import type { PageMeta } from '$lib/meta';

declare global {
	namespace App {
		interface Locals {
			/** Resolved once per request in hooks.server.ts. */
			staff: Staff | null;
			requestId: string;
		}

		// Any route may contribute head tags; the storefront layout renders them.
		interface PageData {
			meta?: PageMeta;
			// Set by the admin layout, read by adminMoney.
			currency?: string;
			numberLocale?: string;
			storeName?: string;
		}
	}
}

export {};
