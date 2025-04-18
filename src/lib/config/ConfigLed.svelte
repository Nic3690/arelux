<script lang="ts">
	import { Button, Dialog, ScrollArea, Separator } from 'bits-ui';
	import type { Family, FamilyEntry } from '../../app';
	import { button } from '$lib';
	import { fade } from 'svelte/transition';
	import { cn, flyAndScale } from '$shad/utils';
	import X from 'phosphor-svelte/lib/X';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/dbschema';
	type Props = {
		family: Family;
		/** If length is undefined, disables opening the popup */
		length: number | undefined;
		tenant: string;
		supabase: SupabaseClient<Database>;
		onsubmit?: (ledCode: string, length: number) => any;
	};

	let { family, length, tenant, supabase, onsubmit }: Props = $props();
	let items: FamilyEntry[] = $state([]);
	let selectedLed: FamilyEntry | undefined = $state();
	let selectedLength: number | undefined = $state();
	let step = $state(0);
	let open = $state(false);

	let prevSelectedLed: FamilyEntry | undefined = $state();
	let prevSelectedLength: number | undefined = $state();
	let prevStep = $state(0);

	$effect(() => {
		items = family.items.toSorted((a, b) => a.code.localeCompare(b.code));
	});

	function reset() {
		selectedLed = prevSelectedLed;
		selectedLength = prevSelectedLength;
		step = prevStep;
	}

	function submit() {
		if (selectedLed !== undefined) {
			prevSelectedLed = selectedLed;
			prevSelectedLength = selectedLength;
			prevStep = step;

			const ratio = ((length as number) - selectedLed.radius) / selectedLed.len;
			let value;
			if (selectedLength === 1) {
				value = Math.floor(Math.floor(ratio) * selectedLed.len + selectedLed.radius);
			} else if (selectedLength === 2) {
				value = length as number;
			} else if (selectedLength === 3) {
				value = Math.floor(Math.ceil(ratio) * selectedLed.len + selectedLed.radius);
			} else {
				value = -1;
			}

			if (onsubmit) onsubmit(selectedLed.code, value);
			open = false;
		}
	}
</script>

<Dialog.Root onOutsideClick={reset} bind:open>
	<Dialog.Trigger class={button()} disabled={length === undefined || length === -1}
		>Configura LED</Dialog.Trigger
	>
	<Dialog.Portal>
		<Dialog.Overlay
			transition={fade}
			transitionConfig={{ duration: 150 }}
			class="fixed inset-0 z-50 bg-black/80"
		/>
		<Dialog.Content
			transition={flyAndScale}
			class="fixed left-[50%] top-[50%] z-50 w-full max-w-full translate-x-[-50%] translate-y-[-50%] rounded border bg-background p-5 shadow-popover outline-none sm:max-w-[600px]"
		>
			<Dialog.Title class="flex w-full items-center justify-center text-lg font-semibold">
				Configura striscia LED
			</Dialog.Title>
			<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

			{#if step === 0}
				<ScrollArea.Root class="relative h-[70dvh]">
					<ScrollArea.Viewport class="h-full">
						<ScrollArea.Content>
							<div class="flex flex-col items-center gap-6">
								{#each items as item}
									{@const src = supabase.storage
										.from(tenant)
										.getPublicUrl(`images/${item.code}.webp`).data.publicUrl}
									<button
										class={cn(
											'flex w-full flex-col items-center rounded-md border-2',
											selectedLed === item && 'border-primary',
										)}
										onclick={() => (selectedLed = item)}
									>
										{item.code}
										<img {src} alt="" class="h-[60px]" />
										{item.desc1}
										{item.desc2}
									</button>
								{/each}
							</div>
						</ScrollArea.Content>
					</ScrollArea.Viewport>
					<ScrollArea.Scrollbar
						orientation="vertical"
						class="flex h-full w-2.5 touch-none select-none rounded-full border-l border-l-transparent p-px transition-all hover:w-3 hover:bg-black/10"
					>
						<ScrollArea.Thumb
							class="relative flex-1 rounded-full bg-muted-foreground opacity-40 transition-opacity hover:opacity-100"
						/>
					</ScrollArea.Scrollbar>
					<ScrollArea.Corner />
				</ScrollArea.Root>
			{:else if selectedLed !== undefined && step === 1}
				{@const ratio = ((length as number) - selectedLed.radius) / selectedLed.len}
				<button
					class={cn(
						'mb-3 w-full rounded-md border-2 transition-colors',
						selectedLength === 1 && 'border-primary',
					)}
					onclick={() => (selectedLength = 1)}
				>
					{Math.floor(Math.floor(ratio) * selectedLed.len)}mm misura taglio strip
					<span class="text-sm">(+{selectedLed.radius}mm misura tappi e saldatura)</span>
					<br />
					Misura finale profilo {Math.floor(
						Math.floor(ratio) * selectedLed.len + selectedLed.radius,
					)}mm
				</button>

				<button
					class={cn(
						'mb-3 w-full rounded-md border-2 transition-colors',
						selectedLength === 2 && 'border-primary',
					)}
					onclick={() => (selectedLength = 2)}
				>
					{Math.floor(Math.floor(ratio) * selectedLed.len)}mm misura taglio strip
					<span class="text-sm">(+{selectedLed.radius}mm misura tappi e saldatura)</span>
					<br />
					Misura finale profilo {length}mm
					<br />
					<span class="text-xs font-bold underline">
						NB: se viene selezionata questa opzione potrebbero verificarsi spazi non luminosi
						all’interno del profilo.
					</span>
				</button>

				<button
					class={cn(
						'mb-3 w-full rounded-md border-2 transition-colors',
						selectedLength === 3 && 'border-primary',
					)}
					onclick={() => (selectedLength = 3)}
				>
					{Math.floor(Math.ceil(ratio) * selectedLed.len)}mm misura taglio strip
					<span class="text-sm">(+{selectedLed.radius}mm misura tappi e saldatura)</span>
					<br />
					Misura finale profilo {Math.floor(
						Math.ceil(ratio) * selectedLed.len + selectedLed.radius,
					)}mm
				</button>
			{/if}

			<div class="mt-3 grid grid-cols-2 gap-2">
				{#if step >= 1}
					<Button.Root
						class={button({ class: 'w-full', color: 'secondary' })}
						onclick={() => (step -= 1)}
					>
						Indietro
					</Button.Root>
					<Button.Root
						disabled={selectedLength === undefined}
						class={button({ class: 'w-full' })}
						onclick={submit}
					>
						Conferma
					</Button.Root>
				{:else}
					<div></div>
					<Button.Root
						disabled={selectedLed === undefined}
						class={button({ class: 'w-full' })}
						onclick={() => (step += 1)}
					>
						Avanti
					</Button.Root>
				{/if}
			</div>

			<Dialog.Close
				class="absolute right-5 top-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
				onclick={reset}
			>
				<div>
					<X class="text-foreground" size={28} />
					<span class="sr-only">Close</span>
				</div>
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
