<script lang="ts">
	import AreluxLogo from '$lib/Logo.svelte';
	import DownloadConfirmPopup from '$lib/DownloadConfirmPopup.svelte';
	import Toggle2d3d from '$lib/Toggle2d3d.svelte';
	import { Button, Dialog, ScrollArea, Separator } from 'bits-ui';
	import X from 'phosphor-svelte/lib/X';
	import { onMount } from 'svelte';
	import type { SavedObject } from '../../../app';
	import { button, objects } from '$lib';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$shad/utils';
	import { cn } from '$shad/utils';
	import { Renderer } from '$lib/renderer/renderer';
	import { toast } from 'svelte-sonner';
	import { Vector2, Object3D } from 'three';
	import type { TemporaryObject } from '$lib/renderer/objects';
	import LightMover from './LightMover.svelte';
	import { Vector3 } from 'three';

	let { data } = $props();
	let renderer: Renderer;

	let showDownloadPopup = $state(false);
	let is3d = $state(true);
	let code = $state('');
	let codeDialogOpen = $state(false);
	let codeWrong = $state(false);
	let codeRight = $state(false);
	
	let downloadDisabled = $derived($objects.length === 0 || (data.settings.password.length !== 0 && !codeRight));
	
	let lightMoverMode = $state(false);
	let selectedLight = $state<TemporaryObject | null>(null);
	let lightPosition = $state(0.5);
	let lights = $state<TemporaryObject[]>([]);
	let pointer = $state(new Vector2());
	let invertedControls = $state(false);

	$effect(() => {
		if (renderer && $objects.length > 0) {
			lights = renderer.getLights();
		}
	});

	function toggleLightMoverMode() {
		lightMoverMode = !lightMoverMode;
		selectedLight = null;
		
		if (lightMoverMode && renderer) {
			lights = renderer.getLights();
			
			if (lights.length === 0) {
				toast.info('Non sono state trovate luci. Aggiungi prima una luce al progetto.');
				lightMoverMode = false;
			} else {
				toast.info('Modalità spostamento luci attivata. Clicca su una luce per selezionarla.');
			}
		} else {
			renderer?.setOpacity(1);
		}
	}

	function handleLightMove(position: number) {
		if (selectedLight && renderer) {
			lightPosition = position;

			const success = renderer.moveLight(selectedLight, position);
			
			if (!success) {
			console.error("Impossibile spostare la luce:", selectedLight.getCatalogEntry().code);
			}
		}
		}

	function remove(item: SavedObject) {
		let i = $objects.indexOf(item);
		if (i > -1) {
			$objects = $objects.toSpliced(i, 1);
		}
		if (item.object) renderer.removeObject(item.object);
	}

	let canvas: HTMLCanvasElement;
	let controlsEl: HTMLElement;
	onMount(() => {
	renderer = Renderer.get(data, canvas, controlsEl)
		.setCamera(controlsEl, {
		is3d,
		isOrtographic: is3d,
		})
		.setScene('normal');
	renderer.handles.setVisible(false);
	
	controlsEl.addEventListener('pointerdown', (event) => {
		if (lightMoverMode && renderer) {
		lights = renderer.getLights();

		pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		const intersectables = lights
		.filter(obj => obj.mesh)
		.map(obj => obj.mesh) as Object3D[];

		const intersections = renderer.raycast(pointer, intersectables);
		
		if (intersections.length > 0) {
			for (const light of lights) {
			let found = false;
			light.mesh?.traverse((child) => {
				if (intersections.some(i => i.object.uuid === child.uuid)) {
				selectedLight = light;

				if (selectedLight.getCurvePosition() === undefined) {
					selectedLight.setCurvePosition(0.5);
				}
				
				lightPosition = selectedLight.getCurvePosition();

				invertedControls = renderer.getLightMovementDirection(selectedLight);

				renderer.highlightLight(selectedLight);
				found = true;
				}
			});
			if (found) break;
			}
		}
		}
	});
	});

	$effect(() => {
		if (controlsEl !== undefined) {
			renderer.setCamera(controlsEl, { is3d, isOrtographic: !is3d });
		}
	});

	async function submitCode() {
		if (data.settings.password === code) {
			codeWrong = false;
			codeRight = true;
			codeDialogOpen = false;
		} else {
			codeWrong = true;
			codeRight = false;
		}
	}
</script>

<main class="grid h-dvh grid-cols-layout grid-rows-layout gap-3 p-5">
	<!-- Sidebar -->
	<div class="row-span-3 flex flex-col gap-3">
		<a href="/{data.tenant}" class="inline-flex">
			<ArrowLeft class="translate-y-1" />
			Indietro
		</a>

		{#if $objects.length === 0}
			<span>Non ci sono ancora componenti nella tua configurazione</span>
		{:else}
			<span>La tua configurazione</span>
		{/if}

		<ScrollArea.Root>
			<ScrollArea.Viewport class="h-full w-full">
				<ScrollArea.Content>
					{#each $objects.filter((o) => !o.hidden) as item}
						{@const url = data.supabase.storage
							.from(data.tenant)
							.getPublicUrl(`images/${item.code}.webp`)}

						<div
							class="mt-3 rounded bg-box3 ring-inset ring-primary transition-all"
							bind:this={item.sidebarItem}
						>
							<div class="mt-3 flex items-center justify-start rounded">
								<img
									src={url.data.publicUrl}
									class="mx-3 aspect-square h-20 rounded-full object-cover outline outline-primary/50"
									alt=""
								/>
								<div class="flex grow items-center justify-start py-4 pr-6">
									<div class="flex flex-col">
										<span class="mb-1">{item.code.split('+')[0]}</span>
										<span class="text-sm">{item.desc1},</span>
										<span class="text-sm">{item.desc2}</span>
									</div>
									<button class="ml-auto" type="button" onclick={() => remove(item)}>
										<X size={28} />
									</button>
								</div>
							</div>

							{#each item.subobjects as subitem}
								<div class="flex items-center justify-start rounded py-4">
									<img
										src={url.data.publicUrl}
										class="mx-3 h-20 rounded-full outline outline-primary/50"
										alt=""
									/>
									<div class="flex flex-col">
										<span class="mb-1">{subitem.code}</span>
										<span class="text-sm">{subitem.desc1} {subitem.desc2}</span>
									</div>
								</div>
							{/each}
						</div>
					{/each}
				</ScrollArea.Content>
			</ScrollArea.Viewport>
			<ScrollArea.Scrollbar orientation="vertical">
				<ScrollArea.Thumb />
			</ScrollArea.Scrollbar>
			<ScrollArea.Corner />
			<ScrollArea.Scrollbar orientation="horizontal">
				<ScrollArea.Thumb />
			</ScrollArea.Scrollbar>
		</ScrollArea.Root>

		<!-- Add element button -->
		<Button.Root class={button({ class: 'mt-auto' })} href="/{data.tenant}/{data.system}/add">
			AGGIUNGI
		</Button.Root>

		<!-- Preventivo -->
		<div class="flex flex-col gap-2 rounded bg-box p-5">
			<span>Preventivo</span>
			{#if data.settings.password.length !== 0}
				<Dialog.Root bind:open={codeDialogOpen}>
					<Dialog.Trigger class={button({ size: 'xs' })}>Codice</Dialog.Trigger>
					<Dialog.Portal>
						<Dialog.Overlay
							transition={fade}
							transitionConfig={{ duration: 150 }}
							class="fixed inset-0 z-50 bg-black/80"
						/>

						<Dialog.Content
							transition={flyAndScale}
							class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded border bg-background p-5 shadow-popover outline-none sm:max-w-[490px] md:w-full"
						>
							<Dialog.Title
								class="flex w-full items-center justify-center text-lg font-semibold tracking-tight"
							>
								Inserisci la password
							</Dialog.Title>
							<Separator.Root class="-mx-5 mb-6 mt-5 block h-px bg-muted" />
							<input
								type="password"
								class={cn(
									'border-border-input placeholder:text-foreground-alt/50 hover:border-dark-40 inline-flex h-10 w-full items-center rounded-md border bg-background px-4 text-sm ring-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
									codeWrong && 'ring-2 ring-red-500',
								)}
								oninput={() => (codeWrong = false)}
								onkeyup={(e) => {
									if (e.key === 'Enter') submitCode();
								}}
								placeholder="Password"
								autocomplete="off"
								bind:value={code}
							/>
							<div class="mt-3 flex items-center justify-center">
								<button type="button" class={button({ class: 'w-full' })} onclick={submitCode}>
									Invia
								</button>
							</div>
							<Dialog.Close
								class="absolute right-5 top-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
							>
								<div>
									<X class="text-foreground" size={28} />
									<span class="sr-only">Close</span>
								</div>
							</Dialog.Close>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			{/if}
			<Button.Root
				bind:disabled={downloadDisabled}
				class={button({ color: 'secondary', size: 'xs' })}
				on:click={() => (showDownloadPopup = true)}
			>
				Scarica
			</Button.Root>
		</div>
	</div>

	<AreluxLogo />
	<Toggle2d3d bind:is3d />

	<div bind:this={controlsEl}></div>

	<div class="absolute bottom-5 left-80 right-80 flex justify-center gap-3">
		<LightMover
			active={lightMoverMode}
			disabled={$objects.length === 0}
			selectedLightId={selectedLight?.id ?? null}
			position={lightPosition}
			invertedControls={invertedControls}
			onToggle={toggleLightMoverMode}
			onMove={handleLightMove}
	  />
	</div>

	{#if showDownloadPopup}
		<DownloadConfirmPopup
			closeCallback={() => {
				showDownloadPopup = false;
			}}
			askForLeds={$objects.some((o) => data.catalog[o.code].askForLeds)}
		/>
	{/if}
</main>
<canvas class="absolute inset-0 -z-10 h-dvh w-full" bind:this={canvas}></canvas>