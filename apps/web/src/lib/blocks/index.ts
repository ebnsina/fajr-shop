import type { Component } from 'svelte';
import type { BlockType } from '@fajr/schemas';
import Hero from './Hero.svelte';
import RichText from './RichText.svelte';
import ProductGrid from './ProductGrid.svelte';
import CategoryTiles from './CategoryTiles.svelte';
import Countdown from './Countdown.svelte';
import UspBar from './UspBar.svelte';
import Faq from './Faq.svelte';
import Testimonials from './Testimonials.svelte';
import Video from './Video.svelte';
import CtaBanner from './CtaBanner.svelte';

// The registry: a plain map from block type to component.
export const BLOCK_COMPONENTS: Record<BlockType, Component<any>> = {
	hero: Hero,
	'rich-text': RichText,
	'product-grid': ProductGrid,
	'category-tiles': CategoryTiles,
	countdown: Countdown,
	'usp-bar': UspBar,
	faq: Faq,
	testimonials: Testimonials,
	video: Video,
	'cta-banner': CtaBanner
};
