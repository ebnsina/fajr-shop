<script lang="ts">
	import { tick } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
	import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import Icon from './Icon.svelte';
	import Input from './Input.svelte';
	import InputButton from './InputButton.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'children'> {
		label: string;
		value?: string;
		/** Choosing a new password: asks password managers to suggest one, and shows its strength. */
		isNew?: boolean;
		hint?: string;
		error?: string;
		/** Requirements shown as a checklist that ticks off as they're met. */
		rules?: { label: string; test: (value: string) => boolean }[];
	}

	let {
		label,
		value = $bindable(''),
		isNew = false,
		hint,
		error,
		rules,
		...rest
	}: Props = $props();

	const id = $props.id();
	const met = $derived(rules?.map((r) => r.test(value)) ?? []);
	const allMet = $derived(!!rules?.length && met.every(Boolean));

	let element = $state<HTMLInputElement>();
	let shown = $state(false);
	let capsLock = $state(false);

	/** Shows or hides the password, keeping the caret where it was. */
	async function toggle() {
		const [from, to] = [element?.selectionStart, element?.selectionEnd];
		shown = !shown;
		await tick();
		if (element && from != null && to != null) element.setSelectionRange(from, to);
	}

	// ponytail: a length-and-variety guess, not a crack-time estimate; swap in zxcvbn if it matters.
	const strength = $derived.by(() => {
		if (value.length < 8) return 0;
		const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
		return Math.min(
			4,
			1 + (value.length >= 12 ? 1 : 0) + (kinds >= 3 ? 1 : 0) + (kinds === 4 ? 1 : 0)
		);
	});
	const words = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
</script>

<div class="password">
	<Input
		{label}
		bind:value
		bind:element
		type={shown ? 'text' : 'password'}
		autocomplete={isNew ? 'new-password' : 'current-password'}
		autocapitalize="off"
		spellcheck="false"
		{hint}
		{error}
		aria-describedby={rules ? `${id}-rules` : undefined}
		{...rest}
		onkeydown={(e) => {
			capsLock = e.getModifierState?.('CapsLock') ?? false;
			rest.onkeydown?.(e);
		}}
		onkeyup={(e) => {
			capsLock = e.getModifierState?.('CapsLock') ?? false;
			rest.onkeyup?.(e);
		}}
		onblur={(e) => {
			capsLock = false;
			rest.onblur?.(e);
		}}
	>
		{#snippet end()}
			<InputButton
				icon={shown ? ViewOffSlashIcon : ViewIcon}
				aria-label="Show password"
				aria-pressed={shown}
				onclick={toggle}
			/>
		{/snippet}
	</Input>
	<!-- Said once when it turns on; typing a password blind with Caps Lock on is a classic lockout. -->
	<p class="caps" role="status">{capsLock ? 'Caps Lock is on' : ''}</p>
	{#if rules}
		<!-- Read with the field; ticks off live as each rule is met. -->
		<ul id="{id}-rules" class="rules" aria-label="Password requirements">
			{#each rules as rule, i (rule.label)}
				<li class={{ met: met[i] }}>
					<span class="mark" aria-hidden="true">
						{#if met[i]}<span class="tick"
								><Icon icon={Tick02Icon} size={14} strokeWidth={2.5} /></span
							>{:else}<Icon icon={Cancel01Icon} size={12} />{/if}
					</span>
					{rule.label}<span class="sr-only">{met[i] ? ', met' : ', not yet met'}</span>
				</li>
			{/each}
		</ul>
		<p class="sr-only" role="status">{allMet ? 'All requirements met.' : ''}</p>
	{/if}
	{#if isNew && value}
		<div class="strength" data-level={strength}>
			<span class="bars" aria-hidden="true">
				{#each [1, 2, 3, 4] as n (n)}<span class={['bar', strength >= n && 'on']}></span>{/each}
			</span>
			<span class="word" role="status">Strength: {words[strength]}</span>
		</div>
	{/if}
</div>

<style>
	.password {
		display: grid;
	}
	.caps {
		margin: 0;
		color: var(--ui-warning);
		font: 500 0.8125rem/1.5 var(--ui-font);
	}
	.caps:empty {
		display: none;
	}
	.rules {
		display: grid;
		gap: 0.25rem;
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
		font: 0.8125rem/1.4 var(--ui-font);
	}
	.rules li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--ui-muted);
		transition: color var(--ui-dur) ease;
	}
	.rules li.met {
		color: color-mix(in srgb, var(--ui-accent) 80%, var(--ui-fg));
	}
	.mark {
		display: grid;
		place-items: center;
		inline-size: 1.125rem;
		block-size: 1.125rem;
		border-radius: 50%;
		background: var(--ui-subtle);
		transition: background-color var(--ui-dur) ease;
	}
	.met .mark {
		background: color-mix(in srgb, var(--ui-accent) 15%, transparent);
	}
	/* The tick pops in as a rule is met. */
	.tick {
		display: grid;
		transition: scale var(--ui-dur-overlay) var(--ui-ease-out);
	}
	@starting-style {
		.tick {
			scale: 0.3;
		}
	}
	.sr-only {
		position: absolute;
		inline-size: 1px;
		block-size: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.strength {
		--level: var(--ui-danger);
		display: grid;
		gap: 0.25rem;
		margin-block-start: 0.375rem;
		font: 0.8125rem/1.4 var(--ui-font);
	}
	.strength[data-level='2'] {
		--level: var(--ui-warning);
	}
	.strength[data-level='3'],
	.strength[data-level='4'] {
		--level: var(--ui-accent);
	}
	.bars {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.25rem;
	}
	/* Each bar fills from the start as the password gets stronger (transform, not width). */
	.bar {
		position: relative;
		block-size: 4px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--ui-hover);
	}
	.bar::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--level);
		transform: scaleX(0);
		transform-origin: left;
		transition:
			transform 300ms var(--ui-ease-out),
			background-color var(--ui-dur) ease;
	}
	.bar:dir(rtl)::after {
		transform-origin: right;
	}
	.bar.on::after {
		transform: scaleX(1);
	}
	.word {
		color: color-mix(in srgb, var(--level) 80%, var(--ui-fg));
		font-weight: 500;
	}
	@media (prefers-reduced-motion: reduce) {
		.bar::after {
			transition: none;
		}
	}
</style>
