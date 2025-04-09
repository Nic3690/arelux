<script lang="ts">
	import _ from 'lodash';
	import type { Family } from '../../app';
	
	// Implementazione locale della funzione cn (classNames) per evitare dipendenze
	function cn(...classes: (string | boolean | undefined | null)[]): string {
		return classes.filter(Boolean).join(' ');
	}

	type LengthItem = { code: string; len: number };

	let { 
		family,
		value = $bindable(),
		onsubmit
	}: {
		family: Family;
		value?: string;
		onsubmit?: (value: string, length: number) => void;
	} = $props();

	let valueInvalid = $state(false);
	let valueLen = $state(0);
	let items: LengthItem[] = $state([]);

	// Estrae e ordina le lunghezze uniche dalla famiglia
	$effect(() => {
		// Estrai items con codice e lunghezza
		const extractedItems = family.items.map(i => ({ code: i.code, len: i.len ?? 0 }));
		
		// Ordina per lunghezza
		const sortedItems = extractedItems.toSorted((a, b) => a.len - b.len);
		
		// Rimuovi duplicati di lunghezza
		items = _.uniqBy(sortedItems, 'len');
		
		// Imposta la lunghezza iniziale
		if (items.length > 0) {
			valueLen = items[0].len;
		}
	});

	// Inizializza il valore selezionato se necessario
	$effect(() => {
		if (value === undefined || !family.items.map(i => i.code).includes(value)) {
			if (family.items.length > 0) {
				value = family.items[0].code;
				valueLen = family.items[0].len ?? 0;
			}
		}
	});

	// Aggiorna valueLen quando cambia value
	$effect(() => {
		if (value) {
			const item = family.items.find(i => i.code === value);
			if (item) {
				valueLen = item.len ?? 0;
			}
		}
	});

	function handleItemClick(code: string, len: number) {
		value = code;
		valueLen = len;
		valueInvalid = false;
		if (onsubmit) onsubmit(value, len);
	}

	function handleInputBlur() {
		const item = items.find(i => i.len === valueLen);
		value = item?.code;
		valueInvalid = value === undefined;
		
		if (onsubmit && value) {
			onsubmit(value, valueLen);
		}
	}
</script>

<div class="flex items-center justify-center rounded bg-box px-6 py-1">
	<svg height="20" width="120" viewBox="0 0 100 20" aria-labelledby="lengthSliderTitle" role="img">
		<title id="lengthSliderTitle">Selettore lunghezza</title>
		<line x1="5" y1="10" x2="95" y2="10" stroke-width="1.5" class="stroke-primary" />
		
		{#each items as { code, len }, i}
			{@const lerpResult = items.length === 1 
				? 50 // Se c'è solo un elemento, centralo
				: (5 * (items.length - 1 - i) + 95 * i) / (items.length - 1)}
				
			<!-- Punto selezionabile per ogni lunghezza disponibile -->
			<circle
				cx={lerpResult}
				cy="10"
				r={valueLen === len ? 7 : 5}
				class={cn('fill-primary stroke-primary cursor-pointer', 
					valueLen === len && 'brightness-95')}
				onclick={() => handleItemClick(code, len)}
				tabindex="0"
				role="button"
				aria-label={`Lunghezza ${len}mm`}
				aria-pressed={valueLen === len}
				onkeydown={(e) => e.key === 'Enter' && handleItemClick(code, len)}
			/>
		{/each}
	</svg>

	<input
		bind:value={valueLen}
		type="number"
		class={cn(
			'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent',
			valueInvalid && 'border-red-500'
		)}
		aria-label="Lunghezza in millimetri"
		name="length-input"
		id="length-input"
		oninput={() => (valueInvalid = false)}
		onblur={handleInputBlur}
		onkeydown={(e) => e.key === 'Enter' && handleInputBlur()}
	/>
	<span class="ml-0.5">mm</span>
</div>