import { listing } from '#lib/server/listing.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => listing(locals.api, url);
