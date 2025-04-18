<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	
	export let data: PageData;
	// Usa direttamente supabase dall'oggetto data caricato dal layout
	const supabase = data.supabase;
	
	// Stato di caricamento
	let imagesLoading = true;
	
	// Descrizioni dei sistemi
	const defaultDescription = 'Lorem ipsum dolor sit amet. Non quae dolorem est quod accusamus est voluptatem earum sit cupiditate pariatur rem enim molestias est voluptatibus tempore.';
	
	const descriptions: Record<string, string> = {
		'xnet': 'XNET è un sistema di binari a incasso per illuminazione professionale. Ideale per negozi, gallerie e spazi commerciali. Offre una soluzione elegante e discreta per l\'illuminazione di ambienti che richiedono versatilità e prestazioni.',
		'xfrees': 'XFREES offre un sistema di illuminazione flessibile con binari a soffitto. Perfetto per abitazioni moderne e spazi versatili che necessitano di soluzioni adattabili alle diverse esigenze di illuminazione.',
	};
	
	// Definisci l'interfaccia per il tipo System
	interface System {
		id: string;
		name: string;
		description: string;
		mainImage: string;
		productImage1: string;
		productImage2: string;
		productImage3: string;
	}
	
	// Funzione per ottenere il nome del sistema dall'ID
	function getSystemName(systemId: string): string {
		const nameMap: Record<string, string> = {
			'xnet': 'XNET',
			'xfrees': 'XFREE S',
		};
		
		return nameMap[systemId.toLowerCase()] || systemId.toUpperCase();
	}
	
	let logoUrl = '';
	let systems: System[] = [];

	// Inizializza sistemi
	onMount(async () => {
		imagesLoading = true;
		
		systems = await Promise.all(data.systems.map(async (systemId: string) => {
			const id = systemId.toLowerCase().replace(' ', '_');
			const mainImage = supabase.storage.from(data.tenant).getPublicUrl(`images/main_${id}.jpg`).data.publicUrl;
			const productImage1 = supabase.storage.from(data.tenant).getPublicUrl(`images/product1_${id}.jpg`).data.publicUrl;
			const productImage2 = supabase.storage.from(data.tenant).getPublicUrl(`images/product2_${id}.jpg`).data.publicUrl;
			const productImage3 = supabase.storage.from(data.tenant).getPublicUrl(`images/product3_${id}.jpg`).data.publicUrl;
			
			return {
				id: systemId,
				name: getSystemName(systemId),
				description: descriptions[id] || defaultDescription,
				mainImage,
				productImage1,
				productImage2,
				productImage3
			};
		}));
		
		// Ottieni URL del logo
		logoUrl = supabase.storage.from('images').getPublicUrl('ui/logo.png').data.publicUrl;
		
		// Se ci sono sistemi, seleziona il primo
		if (systems.length > 0) {
			selectedSystem = systems[0];
		}
		
		imagesLoading = false;
	});
	
	// Sistema selezionato
	let selectedSystem: System = {
		id: '',
		name: '',
		description: defaultDescription,
		mainImage: '',
		productImage1: '',
		productImage2: '',
		productImage3: ''
	};
	
	// Funzione per selezionare un sistema
	function selectSystem(system: System): void {
		selectedSystem = system;
	}
	
	// Funzione per navigare alla configurazione
	function goToConfig(): void {
		if (selectedSystem && selectedSystem.id) {
			window.location.href = `/${$page.params.tenant}/${selectedSystem.id}`;
		}
	}
</script>

<div class="w-full h-1/5">
	<h1 class="self-end text-2xl font-bold mb-8">Scegli il sistema che vuoi configurare:</h1>
</div>

<div class="flex h-4/5">
	<!-- Colonna sinistra: lista sistemi -->
	<div class="w-80 p-6 flex flex-col">
		<h1 class="text-2xl font-bold mb-8">Scegli il sistema che vuoi configurare:</h1>
		
		<div class="space-y-4 flex-grow">
			{#each systems as system}
				<button 
					class="w-full py-3 rounded-full text-center font-medium {selectedSystem.id === system.id ? 'bg-yellow-400' : 'bg-gray-100'}"
					on:click={() => selectSystem(system)}
				>
					{system.name}
				</button>
			{/each}
			
			<!-- Sistemi placeholder (per completare l'interfaccia) -->
			{#if systems.length < 5}
				{#each Array(5 - systems.length) as _, i}
					<button class="w-full py-3 rounded-full text-center font-medium bg-gray-100 text-gray-400">
						Lorem
					</button>
				{/each}
			{/if}
		</div>
		
		<!-- Pulsante Configura -->
		<button 
			class="w-full py-3 mt-4 rounded-full bg-yellow-400 font-bold"
			on:click={goToConfig}
		>
			Configura
		</button>
	</div>
	
	<!-- Colonna centrale: immagine principale -->
	<div class="flex-grow bg-white-100">
		{#if imagesLoading}
			<div class="w-full h-full flex items-center justify-center">
				<p>Caricamento...</p>
			</div>
		{:else}
			<img 
				src={selectedSystem.mainImage}
				alt="Esempio sistema" 
				class="w-full object-cover rounded-t-[25px]"
			/>
		{/if}
	</div>

	<!-- Colonna destra: descrizione e immagini prodotti -->
	<div class="w-96 p-6 flex flex-col">
		<!-- Logo ARELUX -->
		<div class="flex justify-end mb-6">
			<img 
				src={logoUrl} 
				alt="ARELUX" 
				class="h-8"
			/>
		</div>
		
		<!-- Descrizione sistema -->
		<div class="mb-6">
			<p class="text-sm">
				{selectedSystem.description}
			</p>
		</div>
		
		<!-- Immagini prodotti -->
		<div class="grid grid-cols-2 gap-4 mb-4">
			<img 
				src={selectedSystem.productImage1} 
				alt="Prodotto 1" 
				class="w-full h-auto rounded"
			/>
			<img 
				src={selectedSystem.productImage2} 
				alt="Prodotto 2" 
				class="w-full h-auto rounded"
			/>
		</div>
		
		<div class="mt-auto">
			<img 
				src={selectedSystem.productImage3} 
				alt="Installazione" 
				class="w-full h-auto rounded"
			/>
		</div>
	</div>
</div>