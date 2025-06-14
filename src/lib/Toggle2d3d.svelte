<script lang="ts">
	import { Dialog, Separator } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$shad/utils';
	import X from 'phosphor-svelte/lib/X';
	import House from 'phosphor-svelte/lib/House';
	import ArrowsHorizontal from 'phosphor-svelte/lib/ArrowsHorizontal';
	import { button } from '$lib';
	import { page } from '$app/state';
	import { Renderer } from './renderer/renderer';
	import { browser } from '$app/environment';

	let { 
		is3d = $bindable(page.data.settings.allow3d), 
		renderer,
		virtualRoomDisabled = false
	}: { 
		is3d?: boolean; 
		renderer?: Renderer | undefined;
		virtualRoomDisabled?: boolean;
	} = $props();

	let showVirtualRoom = $state(false);
	let showRoomSettings = $state(false);
	
	const STORAGE_KEY = 'virtual_room_dimensions';
	const DEFAULT_DIMENSIONS = { width: 30, height: 30, depth: 30 };
	
	function loadSavedDimensions() {
		if (!browser) return DEFAULT_DIMENSIONS;
		
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.width > 0 && parsed.height > 0 && parsed.depth > 0) {
					return parsed;
				}
			}
		} catch (e) {
			console.warn('Errore caricamento dimensioni stanza:', e);
		}
		
		return DEFAULT_DIMENSIONS;
	}
	
	function saveDimensions(dimensions: { width: number; height: number; depth: number }) {
		if (!browser) return;
		
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
		} catch (e) {
			console.warn('Errore salvataggio dimensioni stanza:', e);
		}
	}

	const savedDimensions = loadSavedDimensions();
	let roomWidth = $state(savedDimensions.width);
	let roomHeight = $state(savedDimensions.height);
	let roomDepth = $state(savedDimensions.depth);
	
	let tempRoomWidth = $state(roomWidth);
	let tempRoomHeight = $state(roomHeight);
	let tempRoomDepth = $state(roomDepth);
	
	$effect(() => {
		if (renderer) {
			const dimensions = {
				width: roomWidth / 10,
				height: roomHeight / 10,
				depth: roomDepth / 10
			};
			
			renderer.setCurrentRoomDimensions(dimensions);
			
			if (renderer.isVirtualRoomVisible()) {
				renderer.resizeVirtualRoom(dimensions);
			}
		}
	});
	
	function toggleVirtualRoom() {
		if (virtualRoomDisabled) return;
		
		showVirtualRoom = !showVirtualRoom;

		if (renderer) {
			renderer.debugRoomAndProfiles();
			if (showVirtualRoom) {
				const dimensions = { 
					width: roomWidth / 10, 
					height: roomHeight / 10, 
					depth: roomDepth / 10 
				};
				renderer.setCurrentRoomDimensions(dimensions);
				renderer.resizeVirtualRoom(dimensions);
			}
			renderer.setVirtualRoomVisible(showVirtualRoom);
		}
	}

	function openRoomSettings() {
		if (renderer) {
			const current = renderer.getCurrentRoomDimensions();
			roomWidth = current.width * 10;
			roomHeight = current.height * 10;
			roomDepth = current.depth * 10;
		}
		
		tempRoomWidth = roomWidth;
		tempRoomHeight = roomHeight;
		tempRoomDepth = roomDepth;
		showRoomSettings = true;
	}

	function confirmRoomSettings() {
		roomWidth = tempRoomWidth;
		roomHeight = tempRoomHeight;
		roomDepth = tempRoomDepth;
		
		const dimensions = {
			width: roomWidth / 10,
			height: roomHeight / 10,
			depth: roomDepth / 10
		};

		saveDimensions({ width: roomWidth, height: roomHeight, depth: roomDepth });
		
		if (renderer) {
			renderer.setCurrentRoomDimensions(dimensions);

			if (showVirtualRoom) {
				renderer.resizeVirtualRoom(dimensions);
			}
		}
		
		showRoomSettings = false;
	}

	function cancelRoomSettings() {
		tempRoomWidth = roomWidth;
		tempRoomHeight = roomHeight;
		tempRoomDepth = roomDepth;
		showRoomSettings = false;
	}

	$effect(() => {
		if (renderer) {
			renderer.setVirtualRoomVisible(showVirtualRoom);
		}
	});

	$effect(() => {
		if (virtualRoomDisabled && showVirtualRoom && renderer) {
			showVirtualRoom = false;
			renderer.setVirtualRoomVisible(false);
		}
	});
</script>

<div class="main">
	{#if page.data.settings.allow3d}
		<input type="checkbox" id="toggle" class="toggleCheckbox" bind:checked={is3d} />
		<label for="toggle" class="toggleContainer border border-[#e8e8e8]">
			<div><span>2D</span></div>
			<div><span>3D</span></div>
		</label>
	{/if}

	{#if is3d}
	<button 
		class={button({ 
			size: 'square', 
			class: 'font-bold flex items-center justify-center', 
			color: showVirtualRoom ? 'primary' : 'secondary' 
		})}
		onclick={toggleVirtualRoom}
		disabled={virtualRoomDisabled}
		title={virtualRoomDisabled 
			? "Aggiungi degli oggetti per attivare la stanza virtuale" 
			: (showVirtualRoom ? "Nascondi stanza virtuale" : "Mostra stanza virtuale")
		}
	>
		<House size={20} />
	</button>

	<button 
		class={button({ 
			size: 'square', 
			class: 'font-bold flex items-center justify-center'
		})}
		onclick={openRoomSettings}
		title="Modifica dimensioni stanza"
	>
		<ArrowsHorizontal size={20} />
	</button>
	{/if}

	<Dialog.Root>
		<Dialog.Trigger class={button({ size: 'square', class: 'font-bold mt-2' })}>
			<span class="text-xl">?</span>
		</Dialog.Trigger>

		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-3/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Come funziona il configuratore:
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Architecto in ab esse, laboriosam
					quod quam impedit ipsa eum, dignissimos dolore nobis mollitia odit cum nostrum iusto. Quo
					error repellendus atque!

					<h2 class="mb-2 mt-2 text-xl font-bold">Funzioni base:</h2>

					Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe rerum quibusdam aspernatur
					nobis reiciendis necessitatibus autem deleniti. Asperiores et sequi quidem.

					<ul class="mt-2 flex w-full place-content-between">
						<li>PROFILI</li>
						<li>CONNETTORI</li>
						<li>LUCI</li>
						<li>ACCESSORI</li>
						<li>PREVENTIVO</li>
					</ul>

					<h2 class="mb-2 mt-2 text-xl font-bold">Legenda simboli:</h2>

					<h2 class="mb-2 mt-4 text-xl font-bold">Stanza virtuale:</h2>
					<p>La stanza virtuale è un riferimento visivo che aiuta a visualizzare le dimensioni reali degli elementi. Può essere attivata o disattivata con il pulsante della casa.</p>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<Dialog.Root bind:open={showRoomSettings}>
		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-2/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Impostazioni Stanza Virtuale
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					<p class="mb-4">Modifica le dimensioni della stanza virtuale per adattarla al tuo progetto:</p>
					
					<div class="flex flex-col gap-4">
						<div class="flex items-center">
							<label for="tempRoomWidth" class="mr-2 w-24">Larghezza:</label>
							<input 
								id="tempRoomWidth" 
								type="range" 
								min="10" 
								max="100" 
								step="1" 
								class="w-40"
								bind:value={tempRoomWidth}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomWidth / 10).toFixed(1)}m</span>
						</div>
						<div class="flex items-center">
							<label for="tempRoomHeight" class="mr-2 w-24">Altezza:</label>
							<input 
								id="tempRoomHeight" 
								type="range" 
								min="20" 
								max="50" 
								step="1" 
								class="w-40"
								bind:value={tempRoomHeight}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomHeight / 10).toFixed(1)}m</span>
						</div>
						<div class="flex items-center">
							<label for="tempRoomDepth" class="mr-2 w-24">Profondità:</label>
							<input 
								id="tempRoomDepth" 
								type="range" 
								min="10" 
								max="100" 
								step="1" 
								class="w-40"
								bind:value={tempRoomDepth}
							/>
							<span class="ml-2 w-16 text-right">{(tempRoomDepth / 10).toFixed(1)}m</span>
						</div>
					</div>

					<div class="mt-6 flex gap-3">
						<button 
							class={button({ color: 'secondary', class: 'flex-1' })}
							onclick={cancelRoomSettings}
						>
							Annulla
						</button>
						<button 
							class={button({ class: 'flex-1' })}
							onclick={confirmRoomSettings}
						>
							Conferma
						</button>
					</div>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
					onclick={cancelRoomSettings}
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</div>

<style>
	.main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		grid-row: span 2;
		width: 50px;

		user-select: none;
	}

	.toggleContainer {
		grid-row: span 2;

		background: #e8e8e8;
		color: hsl(var(--primary));

		color: rgba(0, 0, 0, 127);

		position: relative;
		display: grid;
		grid-template-rows: repeat(2, 1fr);
		height: 96px;
		border-radius: 10px;
		font-weight: bold;
		cursor: pointer;

		font-size: 25px;
		font-family: 'Acumin Pro';
	}
	.toggleContainer::before {
		content: '';
		position: absolute;
		width: 100%;
		height: 50%;
		left: 0%;
		border-radius: 10px;
		background: white;
		transition: all 0.3s;
	}
	.toggleCheckbox:checked + .toggleContainer::before {
		top: 50%;
	}
	.toggleContainer div {
		padding: 2px;
		text-align: center;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.toggleContainer div * {
		transform: translateY(0.1em);
	}
	.toggleCheckbox {
		display: none;
	}
	.toggleCheckbox:checked + .toggleContainer div:first-child {
		color: rgba(0, 0, 0, 127);
		transition: color 0.2s;
	}
	.toggleCheckbox:checked + .toggleContainer div:last-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
	.toggleCheckbox + .toggleContainer div:first-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
</style>