import { createContext } from 'svelte';

export const [getDropdown, setDropdown] = createContext<{ close(): void }>();
