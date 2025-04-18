<script lang="ts">
	import _ from 'lodash';
	import { flyAndScale } from '$shad/utils';
	import { Popover } from 'bits-ui';

	let {
		items,
		onsubmit,
		disabled,
		value = $bindable(),
	}: {
		items: string[];
		onsubmit?: (color: string) => void;
		value?: string;
		disabled?: boolean;
	} = $props();
	value = items[0];

	let open = $state(false);
	let colors = $derived(_.uniqWith(items, _.isEqual));
</script>

<div class="flex items-center justify-center gap-3 rounded bg-box p-3">
	Colore

	{#if items.length > 1}
		<Popover.Root bind:open>
			<Popover.Trigger {disabled} class="disabled:cursor-not-allowed">
				<div
					class="h-8 w-8 rounded-[8px] border-2 border-gray-500"
					style="background-color: {value};"
				></div>
			</Popover.Trigger>
			<Popover.Content
				class="border-dark-10 z-30 flex gap-1 rounded border bg-background p-2 shadow-popover"
				transition={flyAndScale}
				sideOffset={8}
				side="top"
			>
				{#each colors.values() as color}
					<button
						type="button"
						class="h-8 w-8 cursor-pointer rounded-[8px] border-2 border-gray-500"
						style="background-color: {color};"
						aria-label="Color"
						onclick={() => {
							open = false;
							value = color;
							if (onsubmit) onsubmit(color);
						}}
					></button>
				{/each}
			</Popover.Content>
		</Popover.Root>
	{:else}
		<div
			class="h-8 w-8 cursor-not-allowed rounded-[8px] border-2 border-gray-500"
			style="background-color: {value};"
		></div>
	{/if}
</div>
