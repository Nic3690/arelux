<script lang="ts">
	import { cn } from '$shad/utils';
	import _ from 'lodash';
	import type { Family } from '../../app';

	type Props = {
		family: Family;
		value?: string;
		onsubmit?: (value: string, length: number) => any;
	};

	let { family, value = $bindable(), onsubmit }: Props = $props();

	let valueInvalid = $state(false);
	let valueLen = $state(family.items.map((i) => i.len).toSorted()[0]);
	let items: { code: string; len: number }[] = $state([]);

	$effect(() => {
		items = _.uniqWith(
			family.items
				.map((i) => ({ code: i.code, len: i.len }))
				.toSorted((a, b) => (a.len < b.len ? -1 : a.len > b.len ? 1 : 0)),
			(a, b) => a.len === b.len,
		);
	});

	if (value === undefined || !family.items.map((i) => i.code).includes(value))
		value = family.items[0].code;
</script>

<div class="flex items-center justify-center rounded bg-box px-6 py-1">
	<svg height="20" width="120" viewBox="0 0 100 20">
		<line x1="5" y1="10" x2="95" y2="10" stroke-width="1.5" class="stroke-primary" />
		{#each items as { code, len }, i}
			{@const lerpResult = (5 * (items.length - 1 - i) + 95 * (i - 0)) / (items.length - 1)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle
				cx={lerpResult}
				cy="10"
				r={valueLen === len ? 7 : 5}
				class={cn('fill-primary stroke-primary', valueLen === len && 'brightness-95')}
				onclick={() => {
					value = code;
					valueLen = len;
					valueInvalid = false;
					if (onsubmit) onsubmit(value, len);
				}}
			/>
		{/each}
	</svg>

	<input
		bind:value={valueLen}
		class={cn(
			'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent',
			valueInvalid && 'border-red-500',
		)}
		name="test"
		id="test"
		oninput={() => (valueInvalid = false)}
		onblur={() => {
			value = items.find((i) => i.len === valueLen)?.code;
			valueInvalid = value === undefined;
			if (onsubmit && value) onsubmit(value, valueLen);
		}}
	/>
	<span class="ml-0.5">mm</span>
</div>
