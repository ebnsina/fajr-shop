import { createContext } from 'svelte';

export const [getAccordion, setAccordion] = createContext<{ readonly name: string | undefined }>();
