<script lang="ts">
	import _ from 'lodash';
	import { flyAndScale } from '$shad/utils';
	import { Popover } from 'bits-ui';

	type ColorProps = {
		/** Lista di codici colore disponibili */
		items: string[];
		/** Callback quando un colore viene selezionato */
		onsubmit?: (color: string) => void;
		/** Valore attualmente selezionato */
		value?: string;
		/** Disabilita la selezione del colore */
		disabled?: boolean;
		/** Etichette personalizzate per i colori (opzionale) */
		labels?: Record<string, string>;
		/** Colore predefinito quando il valore è undefined */
		defaultColor?: string;
	};

	let {
		items,
		onsubmit,
		disabled = false,
		value = $bindable(),
		labels = {},
		defaultColor = '#cccccc'
	}: ColorProps = $props();

	// Imposta il valore predefinito al primo elemento se non specificato
	$effect(() => {
		if ((value === undefined || value === '') && items.length > 0) {
			value = items[0];
		}
	});

	let open = $state(false);
	
	// Ottieni colori unici dalla lista fornita
	const uniqueColors = $derived(_.uniq(items));
	
	// Ottieni un'etichetta per un colore specifico
	function getColorLabel(color: string | undefined): string {
		if (color === undefined) return '';
		return labels[color] || color;
	}
	
	// Gestisce la selezione di un colore
	function handleColorSelect(color: string) {
		open = false;
		value = color;
		if (onsubmit) onsubmit(color);
	}
</script>

<div class="flex items-center justify-center gap-3 rounded bg-box p-3">
	<span id="color-label">Colore</span>

	{#if uniqueColors.length > 1}
		<Popover.Root bind:open>
			<Popover.Trigger 
				{disabled} 
				class="disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary rounded"
				aria-labelledby="color-label"
				aria-haspopup="true"
				aria-expanded={open}
			>
				<div
					class="h-8 w-8 rounded-[8px] border-2 border-gray-500 transition-transform hover:scale-105 active:scale-95"
					style={`background-color: ${value || defaultColor};`}
					title={getColorLabel(value)}
				></div>
			</Popover.Trigger>
			
			<Popover.Content
				class="border-dark-10 z-30 flex flex-wrap gap-2 rounded border bg-background p-3 shadow-popover"
				transition={flyAndScale}
				sideOffset={8}
				side="top"
				aria-label="Seleziona un colore"
			>
				{#each uniqueColors as color}
					<button
						type="button"
						class="h-8 w-8 cursor-pointer rounded-[8px] border-2 border-gray-500 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary active:scale-95"
						style={`background-color: ${color};`}
						aria-label={getColorLabel(color)}
						title={getColorLabel(color)}
						aria-current={value === color ? 'true' : undefined}
						onclick={() => handleColorSelect(color)}
					></button>
				{/each}
			</Popover.Content>
		</Popover.Root>
	{:else}
		<div
			class="h-8 w-8 cursor-not-allowed rounded-[8px] border-2 border-gray-500"
			style={`background-color: ${value || defaultColor};`}
			title={getColorLabel(value)}
			aria-labelledby="color-label"
		></div>
	{/if}
</div>