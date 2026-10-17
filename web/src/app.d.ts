import type { Client } from 'openapi-fetch';
import type { paths } from '#lib/api.js';

declare global {
	namespace App {
		interface Locals {
			/** The API, as whoever is signed in (or nobody). */
			api: Client<paths>;
		}
	}
}

export {};
