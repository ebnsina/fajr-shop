import { createContext } from 'svelte';

export interface TabsContext {
	readonly value: string | undefined;
	readonly orientation: 'horizontal' | 'vertical';
	readonly activation: 'automatic' | 'manual';
	select(value: string): void;
	ids(value: string): { tab: string; panel: string };
}

export const [getTabs, setTabs] = createContext<TabsContext>();
