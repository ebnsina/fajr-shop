import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
	FAJR_API_URL: {
		description: 'Where the web server reaches the API, e.g. http://api:8080',
		schema: v.pipe(v.string(), v.url())
	}
});
