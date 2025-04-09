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
		/** Se length è undefined, disabilita l'apertura del popup */
		length: number | undefined;
		tenant: string;
		supabase: SupabaseClient<Database>;
		onsubmit?: (ledCode: string, length: number) => any;
	};

	let { family, length, tenant, supabase, onsubmit }: Props = $props();
	
	// Stato
	let items: FamilyEntry[] = $state([]);
	let selectedLed: FamilyEntry | undefined = $state();
	let selectedLength: number | undefined = $state();
	let step = $state(0);
	let open = $state(false);

	// Stato di backup per ripristino in caso di annullamento
	let prevSelectedLed: FamilyEntry | undefined = $state();
	let prevSelectedLength: number | undefined = $state();
	let prevStep = $state(0);

	// Ordina gli elementi in ordine alfabetico per codice
	$effect(() => {
		items = family.items.toSorted((a, b) => a.code.localeCompare(b.code));
	});

	// Ripristina lo stato precedente (usato per annullamento)
	function reset() {
		selectedLed = prevSelectedLed;
		selectedLength = prevSelectedLength;
		step = prevStep;
	}

	// Calcola le lunghezze disponibili per il LED selezionato
	function calculateAvailableLengths(led: FamilyEntry, targetLength: number): Array<{option: number, description: string, finalLength: number, warning?: string}> {
		if (!led || targetLength === undefined) return [];
		
		const ratio = (targetLength - led.radius) / led.len;
		
		return [
			{
				option: 1,
				description: `${Math.floor(Math.floor(ratio) * led.len)}mm misura taglio strip`,
				finalLength: Math.floor(Math.floor(ratio) * led.len + led.radius)
			},
			{
				option: 2,
				description: `${Math.floor(Math.floor(ratio) * led.len)}mm misura taglio strip`,
				finalLength: targetLength,
				warning: 'NB: se viene selezionata questa opzione potrebbero verificarsi spazi non luminosi all\'interno del profilo.'
			},
			{
				option: 3,
				description: `${Math.floor(Math.ceil(ratio) * led.len)}mm misura taglio strip`,
				finalLength: Math.floor(Math.ceil(ratio) * led.len + led.radius)
			}
		];
	}

	// Gestisce il submit del form
	function submit() {
		if (selectedLed === undefined || selectedLength === undefined) return;
		
		// Salva lo stato attuale come precedente
		prevSelectedLed = selectedLed;
		prevSelectedLength = selectedLength;
		prevStep = step;

		// Calcola il valore finale in base all'opzione selezionata
		const ratio = ((length as number) - selectedLed.radius) / selectedLed.len;
		let value: number;
		
		switch (selectedLength) {
			case 1:
				value = Math.floor(Math.floor(ratio) * selectedLed.len + selectedLed.radius);
				break;
			case 2:
				value = length as number;
				break;
			case 3:
				value = Math.floor(Math.ceil(ratio) * selectedLed.len + selectedLed.radius);
				break;
			default:
				value = -1;
		}

		if (onsubmit) onsubmit(selectedLed.code, value);
		open = false;
	}
</script>

<Dialog.Root onOutsideClick={reset} bind:open>
	<Dialog.Trigger 
		class={button()} 
		disabled={length === undefined || length === -1}
		aria-label="Configura striscia LED"
	>
		Configura LED
	</Dialog.Trigger>
	
	<Dialog.Portal>
		<Dialog.Overlay
			transition={fade}
			transitionConfig={{ duration: 150 }}
			class="fixed inset-0 z-50 bg-black/80"
		/>
		
		<Dialog.Content
			transition={flyAndScale}
			class="fixed left-[50%] top-[50%] z-50 w-full max-w-full translate-x-[-50%] translate-y-[-50%] rounded border bg-background p-5 shadow-popover outline-none sm:max-w-[600px]"
			aria-labelledby="led-config-title"
		>
			<Dialog.Title id="led-config-title" class="flex w-full items-center justify-center text-lg font-semibold">
				Configura striscia LED
			</Dialog.Title>
			
			<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

			{#if step === 0}
				<!-- Passo 1: Selezione del tipo di LED -->
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
											'flex w-full flex-col items-center rounded-md border-2 p-2',
											selectedLed === item && 'border-primary',
										)}
										onclick={() => (selectedLed = item)}
										aria-pressed={selectedLed === item}
										aria-label={`Seleziona striscia LED ${item.code}: ${item.desc1} ${item.desc2}`}
									>
										<span class="font-medium">{item.code}</span>
										<img {src} alt={`Striscia LED ${item.code}`} class="h-[60px] my-2" />
										<span>{item.desc1}</span>
										<span>{item.desc2}</span>
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
				<!-- Passo 2: Selezione della lunghezza -->
				{@const lengthOptions = calculateAvailableLengths(selectedLed, length as number)}
				
				{#each lengthOptions as option}
					<button
						class={cn(
							'mb-3 w-full rounded-md border-2 p-3 text-left transition-colors',
							selectedLength === option.option && 'border-primary',
						)}
						onclick={() => (selectedLength = option.option)}
						aria-pressed={selectedLength === option.option}
					>
						{option.description}
						<span class="text-sm">(+{selectedLed.radius}mm misura tappi e saldatura)</span>
						<br />
						Misura finale profilo {option.finalLength}mm
						
						{#if option.warning}
							<br />
							<span class="text-xs font-bold underline">{option.warning}</span>
						{/if}
					</button>
				{/each}
			{/if}

			<!-- Pulsanti di navigazione -->
			<div class="mt-3 grid grid-cols-2 gap-2">
				{#if step >= 1}
					<Button.Root
						class={button({ class: 'w-full', color: 'secondary' })}
						onclick={() => (step -= 1)}
						aria-label="Torna al passo precedente"
					>
						Indietro
					</Button.Root>
					<Button.Root
						disabled={selectedLength === undefined}
						class={button({ class: 'w-full' })}
						onclick={submit}
						aria-label="Conferma configurazione LED"
					>
						Conferma
					</Button.Root>
				{:else}
					<div></div>
					<Button.Root
						disabled={selectedLed === undefined}
						class={button({ class: 'w-full' })}
						onclick={() => (step += 1)}
						aria-label="Vai al passo successivo"
					>
						Avanti
					</Button.Root>
				{/if}
			</div>

			<!-- Pulsante di chiusura -->
			<Dialog.Close
				class="absolute right-5 top-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
				onclick={reset}
				aria-label="Chiudi"
			>
				<div>
					<X class="text-foreground" size={28} />
					<span class="sr-only">Chiudi</span>
				</div>
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>