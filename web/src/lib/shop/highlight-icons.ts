import Banknote from '@lucide/svelte/icons/banknote';
import Gift from '@lucide/svelte/icons/gift';
import Headset from '@lucide/svelte/icons/headset';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Truck from '@lucide/svelte/icons/truck';
import Undo2 from '@lucide/svelte/icons/undo-2';

/** The icon for each kind of promise the owner can pick in store settings. */
export const highlightIcons = {
	truck: Truck,
	cash: Banknote,
	return: Undo2,
	shield: ShieldCheck,
	phone: Headset,
	gift: Gift
};
