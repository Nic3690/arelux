<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Logo from '$lib/Logo.svelte';
	import { slide } from 'svelte/transition';
	
	export let data: PageData;
	// Usa direttamente supabase dall'oggetto data caricato dal layout
	const supabase = data.supabase;
	
	// Stato di caricamento
	let imagesLoading = true;
	
	// Descrizioni dei sistemi
	const defaultDescription = 'Lorem ipsum dolor sit amet. Non quae dolorem est quod accusamus est voluptatem earum sit cupiditate pariatur rem enim molestias est voluptatibus tempore. Sit omnis doloribus At quia rerum ut corporis nostrum aut maxime dolor est dolore nisi et voluptate corrupti eum tempora consectetur.';
	
	const descriptions: Record<string, string> = {
		'xnet': 'XNET è un sistema di binari a incasso per illuminazione professionale. Ideale per negozi, gallerie e spazi commerciali. Offre una soluzione elegante e discreta per l\'illuminazione di ambienti che richiedono versatilità e prestazioni.',
		'xfree_s': 'XFREES offre un sistema di illuminazione flessibile con binari a soffitto. Perfetto per abitazioni moderne e spazi versatili che necessitano di soluzioni adattabili alle diverse esigenze di illuminazione.',
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
			'xfree_s': 'XFREES',
		};
		
		return nameMap[systemId.toLowerCase()] || systemId.toUpperCase();
	}
	
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
				name: getSystemName(id),
				description: descriptions[id] || defaultDescription,
				mainImage,
				productImage1,
				productImage2,
				productImage3
			};
		}));
		
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

<div class="flex flex-col h-screen">
	<!-- Intestazione con titolo e Logo -->
	<div class="flex pt-10 pb-10 px-6 items-center justify-between">
		<h1 class="text-xl font-medium">Scegli il sistema che vuoi configurare:</h1>
		<Logo top={true} />
	</div>

	<!-- Contenuto principale -->
	<div class="flex flex-1 gap-6 overflow-hidden">
		<!-- Colonna sinistra: lista sistemi -->
		<div class="w-1/4 flex flex-col ml-6">
			<div class="space-y-3 flex-grow overflow-y-auto">
				{#each systems as system}
					<button 
						class="w-full py-3 rounded-full text-center font-medium transition-all duration-1000
						{selectedSystem.id === system.id 
							? 'bg-yellow-400 scale-100' 
							: 'bg-gray-100 scale-90 transform hover:scale-95'}"
						on:click={() => selectSystem(system)}
					>
						{system.name}
					</button>
				{/each}
				
				<!-- Sistemi placeholder (per completare l'interfaccia) -->
				{#if systems.length < 5}
					{#each Array(5 - systems.length) as _, i}
						<button class="w-full py-3 rounded-full text-center font-medium bg-gray-100 text-gray-400 scale-90 transform">
							Lorem
						</button>
					{/each}
				{/if}
			</div>
			
			<!-- Pulsante Configura -->
			<button 
				class="w-full py-3 mt-4 mb-6 rounded-full bg-yellow-400 font-medium"
				on:click={goToConfig}
			>
				Configura
			</button>
		</div>
		
		<!-- Colonna centrale: immagine principale -->
		<div class="flex-1 h-full">
			{#if imagesLoading}
				<div class="w-full h-full flex items-center justify-center">
					<p>Caricamento...</p>
				</div>
			{:else}
				<div class="h-full w-full overflow-hidden relative">
					{#key selectedSystem.id}
					<img 
						src={selectedSystem.mainImage}
						alt="Esempio sistema" 
						class="w-full h-full object-cover object-[85%_35%] rounded-t-[25px]"
						transition:slide={{ duration: 1000 }}
					/>

					<!-- Sovrapposizione per l'ombra bianca -->
					<div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
					{/key}
				</div>
			{/if}
		</div>

		<!-- Colonna destra: descrizione e immagini prodotti -->
		<div class="w-80 flex flex-col gap-6 h-full mr-6">
			<!-- Descrizione sistema -->
			<div>
				<p class="text-sm">
					{selectedSystem.description}
				</p>
			</div>
			
			<!-- Immagini prodotti - metà superiore -->
			<div class="grid grid-cols-2 gap-6 flex-grow-0">
				<img 
					src={selectedSystem.productImage1} 
					alt="Prodotto 1" 
					class="w-full h-full"
				/>
				<img 
					src={selectedSystem.productImage2} 
					alt="Prodotto 2" 
					class="w-full h-full object-cover object-[10%_95%]"
				/>
			</div>
			
			<!-- Immagine prodotto grande - metà inferiore -->
			<div class="flex-grow mt-auto overflow-hidden relative">
				<img 
					src={selectedSystem.productImage3} 
					alt="Installazione" 
					class="w-full h-full object-cover rounded-t-[25px]"
					transition:slide={{ duration: 1000 }}
				/>
				<div class="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
			</div>
		</div>
	</div>
</div>