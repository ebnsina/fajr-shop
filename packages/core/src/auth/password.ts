import { hash, verify } from '@node-rs/argon2';

/** argon2id is the library default. Admin passwords only — customers have no password. */
export const hashPassword = (plain: string) => hash(plain);

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
	try {
		return await verify(storedHash, plain);
	} catch {
		return false;
	}
}
