<script lang="ts">
	import Toggle2d3d from '$lib/Toggle2d3d.svelte';
	import { cn, flyAndScale } from '$shad/utils';
	import { Button, DropdownMenu, RadioGroup } from 'bits-ui';
	import CaretUpDown from 'phosphor-svelte/lib/CaretUpDown';
	import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
	import AreluxLogo from '$lib/Logo.svelte';
	import { beforeNavigate, goto, pushState, replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import ConfigColor from '$lib/config/ConfigColor.svelte';
	import type { PageData } from './$types';
	import { button, finishEdit, getPowerBudget, objects, virtualRoomVisible } from '$lib';
	import ConfigCurveShape from '$lib/config/ConfigCurveShape.svelte';
	import ConfigLength from '$lib/config/ConfigLength.svelte';
	import ConfigLed from '$lib/config/ConfigLed.svelte';
	import ConfigLengthArbitrary from '$lib/config/ConfigLengthArbitrary.svelte';
	import { Renderer } from '$lib/renderer/renderer';
	import type { LineHandleMesh } from '$lib/renderer/handles';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import { SvelteSet } from 'svelte/reactivity';
	import type { RendererObject } from '$lib/renderer/objects';
	import ConfigLengthSelector from '$lib/config/ConfigLengthSelector.svelte';
	import { Vector3 } from 'three';
	import type { Family } from '../../../../app';
	import { TemperatureManager, type TemperatureConfig } from '$lib/config/temperatureConfig';
	import { extractSubfamilies, hasLightSubfamilies, sortSubfamilies, type LightSubfamily } from '$lib/lightSubfamilies';
	import { _ } from 'svelte-i18n';
	import DbText from '$lib/i18n/DbText.svelte';

	function hasTemperatureVariants(family: Family): boolean {
		const enhancedFamily = TemperatureManager.getEnhancedFamily(family, enhancedCatalog);
		return TemperatureManager.hasTemperatureVariants(enhancedFamily);
	}

	function getAvailableTemperatures(family: Family): TemperatureConfig[] {
		const enhancedFamily = TemperatureManager.getEnhancedFamily(family, enhancedCatalog);
		return TemperatureManager.getAvailableTemperatures(enhancedFamily);
	}

	function getCurrentTemperature(code: string): TemperatureConfig | null {
		return TemperatureManager.getCurrentTemperature(code);
	}

	function switchToTemperature(code: string, temperature: TemperatureConfig): string {
		return TemperatureManager.switchTemperature(code, temperature);
	}

	function findItemByCode(family: Family, code: string) {
		const enhancedFamily = TemperatureManager.getEnhancedFamily(family, enhancedCatalog);
		return enhancedFamily.items.find(item => item.code === code);
	}

	function getEnhancedCatalog() {
		return TemperatureManager.getEnhancedCatalog(data.catalog);
	}

	// Nuova funzione helper per gestire la selezione iniziale
	function getDefaultItemForFamily(family: Family): any {
		const enhancedFamily = TemperatureManager.getEnhancedFamily(family);
		
		if (hasTemperatureVariants(enhancedFamily)) {
			// Prioritizza WW se disponibile, altrimenti il primo della lista
			const wwItem = enhancedFamily.items.find(i => i.code.includes('WW'));
			if (wwItem) {
				return wwItem;
			}
		}
		
		return enhancedFamily.items[0];
	}

	let { data }: { data: PageData } = $props();
	let canvas: HTMLCanvasElement;
	let controlsEl: HTMLElement;

	let is3d: boolean = $state(true);
	let chosenFamily: string | undefined = $state();
	let mode: string = $state(data.modes.find((m) => m.includes('Profili')) ?? data.modes[0]);
	let arbitraryLength: number | undefined = $state();
	let junctionId: number | undefined = $state(undefined);
	let renderer: Renderer | undefined = $state();
	let loaded: SvelteSet<string> = $state(new SvelteSet());

	let virtualRoomDisabled = $derived($objects.length === 0 && !$virtualRoomVisible);

	let configShape = $state<{ angle: number; radius: number }>();
	let configLength = $state<number>();

	let enhancedCatalog = $derived(getEnhancedCatalog());

	// Nuovi state per le sottofamiglie
	let selectedSubfamily: LightSubfamily | undefined = $state();
	let selectedPower: { baseModel: string; power: number; sampleCode: string } | undefined = $state();
	let showPowerPanel = $state(false);

	// Nuovo stato per le famiglie luci quando mode === "Luci"
	let lightFamilies = $derived(() => {
		if (mode !== 'Luci') return [];
		
		// Ottieni tutte le famiglie del gruppo "Luci"
		const families = Object.values(data.families)
			.filter((fam) => fam.system === data.system)
			.filter((fam) => fam.group === 'Luci')
			.filter((fam) => fam.visible);
		
		console.log('🔦 Famiglie Luci trovate:', families.map(f => f.displayName));
		
		// Estrai le sottofamiglie da tutte le famiglie luci
		const allSubfamilies = new Map<string, LightSubfamily>();
		
		for (const family of families) {
			console.log(`📋 Analizzando famiglia ${family.displayName} con ${family.items.length} items`);
			console.log('Items:', family.items.map(i => i.code));
			
			if (hasLightSubfamilies(family)) {
				console.log(family);
				const subfamiliesMap = extractSubfamilies(family, enhancedCatalog);
				
				// Merge subfamilies, combining models from different families
				for (const [code, subfamily] of subfamiliesMap) {
					if (allSubfamilies.has(code)) {
						// Merge models
						const existing = allSubfamilies.get(code)!;
						for (const model of subfamily.models) {
							if (!existing.models.some(m => m.baseModel === model.baseModel)) {
								existing.models.push(model);
							}
						}
						// Sort models by power
						existing.models.sort((a, b) => a.power - b.power);
					} else {
						allSubfamilies.set(code, subfamily);
					}
				}
			}
		}
		
		console.log('🎯 Sottofamiglie totali trovate:', Array.from(allSubfamilies.keys()));
		
		return sortSubfamilies(Array.from(allSubfamilies.values()));
	});

	// Funzione per ottenere le sottofamiglie quando una famiglia è selezionata
	const lightSubfamilies = $derived(() => {
		if (!chosenFamily) return [];
		const family = data.families[chosenFamily];
		if (!hasLightSubfamilies(family)) return [];
		
		const subfamiliesMap = extractSubfamilies(family, enhancedCatalog);
		return sortSubfamilies(Array.from(subfamiliesMap.values()));
	});

	// Resetta la selezione quando cambia la famiglia o il mode
	$effect(() => {
		if (chosenFamily || mode) {
			selectedSubfamily = undefined;
			selectedPower = undefined;
			showPowerPanel = false;
		}
	});

	onMount(() => {
		renderer = Renderer.get(data, canvas, controlsEl);
		renderer.handles.setVisible(false);
	});

	let hasPowerSupply = $state(false);
	objects.subscribe(
		(objects) => (hasPowerSupply = objects.some((obj) => enhancedCatalog[obj.code]?.power > 0)),
	);

	$effect(() => {
		if (chosenFamily === undefined || page.state.chosenItem !== undefined) {
			renderer?.handles.setVisible(false);
			renderer?.setOpacity(1);
		} else {
			// Per famiglie con sottofamiglie o mode Luci, mostra handles solo dopo selezione potenza
			if (lightSubfamilies().length > 0 || (mode === 'Luci' && lightFamilies().length > 0)) {
				if (selectedPower) {
					renderer?.handles.selectObject(selectedPower.sampleCode).setVisible(true);
				} else {
					renderer?.handles.setVisible(false);
				}
			} else {
				renderer?.handles.selectObject(data.families[chosenFamily].items[0].code).setVisible(true);
			}
			
			renderer?.setClickCallback((handle) => {
				let reference: typeof page.state.reference = {
					typ: 'junction',
					id: handle.other.id,
					junction: handle.otherJunctId,
				};

				if ((handle as LineHandleMesh).isLineHandle) {
					reference = {
						typ: 'line',
						id: handle.other.id,
						junction: handle.otherJunctId,
						pos: {
							x: (handle as LineHandleMesh).clickedPoint?.x ?? 0,
							y: (handle as LineHandleMesh).clickedPoint?.y ?? 0,
							z: (handle as LineHandleMesh).clickedPoint?.z ?? 0,
						},
					};
				}

				// Se abbiamo sottofamiglie, usa l'item selezionato tramite potenza
				let chosenItem;
				if (mode === 'Luci' && selectedPower) {
					// Nel mode Luci, usa direttamente il sampleCode della potenza selezionata
					chosenItem = selectedPower.sampleCode;
				} else if (chosenFamily && selectedPower && selectedSubfamily) {
					// Per famiglie singole con sottofamiglie
					const targetItem = data.families[chosenFamily].items.find(
						item => item.code.startsWith(selectedPower!.baseModel) && 
						       item.code.includes(selectedSubfamily!.code)
					);
					chosenItem = targetItem?.code || data.families[chosenFamily].items[0].code;
				} else if (chosenFamily) {
					// Famiglia normale senza sottofamiglie
					chosenItem = data.families[chosenFamily].items[0].code;
				} else {
					console.error('No chosen item found');
					return;
				}

				// Trova la famiglia corretta per l'item scelto
				let familyForItem = chosenFamily;
				if (mode === 'Luci' && !chosenFamily) {
					// Trova la famiglia che contiene questo item
					for (const [famCode, fam] of Object.entries(data.families)) {
						if (fam.items.some(i => i.code === chosenItem)) {
							familyForItem = famCode;
							break;
						}
					}
				}

				if (!familyForItem) {
					console.error('No family found for item:', chosenItem);
					return;
				}

				pushState('', {
					chosenFamily: familyForItem,
					chosenItem: chosenItem,
					reference,
				});
			});
		}
	});

	let temporary: RendererObject | null = null;
	let group: string | null = $state(null);
	
	$effect(() => {
		if (temporary !== null) {
			renderer?.removeObject(temporary);
			temporary = null;
		}

		if (page.state.chosenFamily !== undefined && page.state.chosenItem !== undefined) {
			renderer?.setOpacity(0.2);

			renderer?.addObject(page.state.chosenItem).then((o) => {
				if (junctionId !== undefined) o.markJunction(junctionId);

				if (page.state.isCustomLength && page.state.length) {
					const family = data.families[page.state.chosenFamily!];
					const item = family.items.find(i => i.code === page.state.chosenItem);
					if (item && item.len > 0) {
						const scaleFactor = page.state.length / item.len;
						
						const familyDisplayName = family.displayName.toLowerCase();
						const isVertical = familyDisplayName.includes('verticale');
						
						if (isVertical) {
							o.mesh!.scale.setY(scaleFactor);
						} else {
							o.mesh!.scale.setX(scaleFactor);
						}
					}
				}

				if (page.state.reference) {
					if (page.state.reference.typ === 'junction') {
						renderer?.getObjectById(page.state.reference.id)?.attach(o);
					} else {
						renderer?.getObjectById(page.state.reference.id)?.attachLine(o, page.state.reference.pos);
					}
				}

				temporary = o;
			});
		} else {
			renderer?.setOpacity(1);
		}
	});
	
	beforeNavigate(() => {
		if (temporary) renderer?.removeObject(temporary);
		
		renderer?.setOpacity(1);
	});

	$effect(() => {
		if (controlsEl !== undefined) {
			renderer?.setCamera(controlsEl, { is3d, isOrtographic: !is3d });
		}
	});
</script>

<main class="grid h-dvh grid-cols-layout grid-rows-layout gap-5 p-5">
	{#if renderer !== undefined}
		{@const rend = renderer}
		<div class="row-span-3 flex max-h-full flex-col gap-6">
			<a href="/{data.tenant}/{data.system}" class="inline-flex">
				<ArrowLeft class="translate-y-1" />
				{$_("common.back")}
			</a>

			<span>{$_("config.modifyObject")}</span>

			{#if page.state.chosenFamily === undefined}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="flex rounded bg-box p-6 text-left">
						<span class="overflow-x-hidden text-ellipsis text-nowrap">
							{mode}
						</span>
						<CaretUpDown class="ml-auto translate-y-1" />
					</DropdownMenu.Trigger>

					<DropdownMenu.Content
						transition={flyAndScale}
						class="z-20 flex flex-col gap-3 rounded bg-box3 p-6"
					>
						{#each data.modes as thisMode}
							<Button.Root on:click={() => {
								mode = thisMode;
								// Reset selezioni quando cambi mode
								selectedSubfamily = undefined;
								selectedPower = undefined;
								showPowerPanel = false;
								// Reset handles
								renderer?.handles.setVisible(false);
								renderer?.setOpacity(1);
							}}>
								<DropdownMenu.Item class="flex w-36 items-center ">
									<span class="overflow-x-hidden text-ellipsis text-nowrap">
										{thisMode}
									</span>
								</DropdownMenu.Item>
							</Button.Root>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				{#if mode === 'Luci' && lightFamilies().length > 0}
					<!-- Mostra direttamente le sottofamiglie per il mode Luci -->
					<RadioGroup.Root
						class="flex h-full min-h-0 shrink flex-col gap-6 overflow-y-scroll rounded bg-box p-6"
						value={selectedSubfamily?.code ?? undefined}
						onValueChange={(code) => {
							selectedSubfamily = lightFamilies().find(sf => sf.code === code);
							showPowerPanel = true;
							selectedPower = undefined;
						}}
					>
						{#if mode === 'Luci'}
							<span class="pb-3 text-sm">
								Capacità: {$objects && getPowerBudget(enhancedCatalog) + 'W'}
							</span>
						{/if}

						{#each lightFamilies() as subfamily}
							{@const iconCode = TemperatureManager.getBaseCodeForResources(subfamily.iconItem)}
							{@const url = data.supabase.storage
								.from(data.tenant)
								.getPublicUrl(`images/${iconCode}.webp`).data.publicUrl}
							
							<RadioGroup.Item
								class="relative flex flex-col items-center justify-center"
								value={subfamily.code}
								id={subfamily.code}
								onclick={() => {
									selectedSubfamily = subfamily;
									showPowerPanel = true;
									selectedPower = undefined;
								}}
							>
								<div class="relative">
									<img
										src={url}
										width="125"
										height="125"
										alt=""
										onload={() => loaded.add(url)}
										class={cn(
											'h-[125px] rounded-full outline outline-0 outline-primary transition-all',
											selectedSubfamily?.code === subfamily.code && 'outline-4',
											loaded.has(url) || 'opacity-0',
										)}
									/>
									
									{#if selectedSubfamily?.code === subfamily.code}
										<div class="absolute top-0 left-0 w-[125px] h-[125px] rounded-full border-2 border-yellow-400 pointer-events-none"></div>
									{/if}
									
									<div
										class={cn(
											'absolute top-0 z-10 h-[125px] w-[125px] animate-pulse rounded-full bg-gray-400',
											loaded.has(url) && 'hidden',
										)}
									></div>
								</div>
								
								{subfamily.displayName}
							</RadioGroup.Item>
						{/each}
					</RadioGroup.Root>
				{:else if chosenFamily && lightSubfamilies().length > 0}
					<!-- Mostra sottofamiglie per famiglie con pattern sottofamiglia -->
					<RadioGroup.Root
						class="flex h-full min-h-0 shrink flex-col gap-6 overflow-y-scroll rounded bg-box p-6"
						value={selectedSubfamily?.code ?? undefined}
						onValueChange={(code) => {
							selectedSubfamily = lightSubfamilies().find(sf => sf.code === code);
							showPowerPanel = true;
							selectedPower = undefined;
						}}
					>
						{#if mode === 'power'}
							<span class="pb-3 text-sm">
								Capacità: {$objects && getPowerBudget(data.catalog) + 'W'}
							</span>
						{/if}

						{#each lightSubfamilies() as subfamily}
							{@const iconCode = TemperatureManager.getBaseCodeForResources(subfamily.iconItem)}
							{@const url = data.supabase.storage
								.from(data.tenant)
								.getPublicUrl(`images/${iconCode}.webp`).data.publicUrl}
							
							<RadioGroup.Item
								class="relative flex flex-col items-center justify-center"
								value={subfamily.code}
								id={subfamily.code}
								onclick={() => {
									selectedSubfamily = subfamily;
									showPowerPanel = true;
									selectedPower = undefined;
								}}
							>
								<div class="relative">
									<img
										src={url}
										width="125"
										height="125"
										alt=""
										onload={() => loaded.add(url)}
										class={cn(
											'h-[125px] rounded-full outline outline-0 outline-primary transition-all',
											selectedSubfamily?.code === subfamily.code && 'outline-4',
											loaded.has(url) || 'opacity-0',
										)}
									/>
									
									{#if selectedSubfamily?.code === subfamily.code}
										<div class="absolute top-0 left-0 w-[125px] h-[125px] rounded-full border-2 border-yellow-400 pointer-events-none"></div>
									{/if}
									
									<div
										class={cn(
											'absolute top-0 z-10 h-[125px] w-[125px] animate-pulse rounded-full bg-gray-400',
											loaded.has(url) && 'hidden',
										)}
									></div>
								</div>
								
								{subfamily.displayName}
							</RadioGroup.Item>
						{/each}
					</RadioGroup.Root>
				{:else}
					<!-- RadioGroup normale per famiglie senza sottofamiglie -->
					<RadioGroup.Root
						class="flex h-full min-h-0 shrink flex-col gap-6 overflow-y-scroll rounded bg-box p-6"
						bind:value={chosenFamily}
					>
						{#if mode === 'power'}
							<span class="pb-3 text-sm">
								Capacità: {$objects && getPowerBudget(data.catalog) + 'W'}
							</span>
						{/if}

						{#each Object.values(data.families)
							.sort((a, b) => {
								if (a.displayName === 'ATS24.60IP44') return -1;
								if (b.displayName === 'ATS24.60IP44') return 1;
								return a.displayName.localeCompare(b.displayName);
							})
							.filter((fam) => fam.system === data.system)
							.filter((fam) => fam.group === mode)
							.filter((fam) => fam.visible)
							.filter((fam) => {
								if (data.system.toLowerCase() === 'xfree_s' || data.system.toLowerCase() === 'xfrees') {
									const isNWProfile = fam.displayName.toLowerCase().includes('nw') || 
													   fam.code.toLowerCase().includes('nw') ||
													   fam.items.some(item => item.code.toLowerCase().includes('nw'));
									return !isNWProfile;
								}
								return true;
							}) as item}
							{@const isDisabled = hasPowerSupply && item.items.some((obj) => enhancedCatalog[obj.code]?.power > 0)}

							<RadioGroup.Item
								class="relative flex flex-col items-center justify-center disabled:cursor-not-allowed"
								value={item.code}
								id={item.code}
								disabled={isDisabled}
							>
								{@const url = data.supabase.storage
									.from(data.tenant)
									.getPublicUrl(`families/${item.code}.webp`).data.publicUrl}

								<div class="relative">
									<img
										src={url}
										width="125"
										height="125"
										alt=""
										onload={() => loaded.add(url)}
										class={cn(
											'h-[125px] rounded-full outline outline-0 outline-primary transition-all',
											item.code === chosenFamily && 'outline-4',
											isDisabled && 'outline-dashed outline-2 outline-gray-400 grayscale',
											loaded.has(url) || 'opacity-0',
										)}
									/>

									{#if item.code === chosenFamily}
									<div 
										class="absolute top-0 left-0 w-[125px] h-[125px] rounded-full border-2 border-yellow-400 pointer-events-none"
									></div>
									{/if}
									
									<div
										class={cn(
											'absolute top-0 z-10 h-[125px] w-[125px] animate-pulse rounded-full bg-gray-400',
											loaded.has(url) && 'hidden',
										)}
									></div>
								</div>

								<DbText text={item.displayName} />
							</RadioGroup.Item>
						{/each}
					</RadioGroup.Root>
				{/if}

				{#if mode !== 'Luci'}
					<Button.Root
						class={button()}
						disabled={(chosenFamily === undefined) || 
								(lightSubfamilies().length > 0 && !selectedPower)}
						on:click={() => {
						
						// Gestione normale per famiglie
						if (chosenFamily === undefined) return;

						const family = data.families[chosenFamily];
						const enhancedFamily = TemperatureManager.getEnhancedFamily(family, enhancedCatalog);
						
						let item: typeof enhancedFamily.items[0] | undefined;
						if (selectedPower && selectedSubfamily) {
							item = enhancedFamily.items.find(
								i => i.code.startsWith(selectedPower!.baseModel) && 
									i.code.includes(selectedSubfamily!.code)
							);
						} else {
							item = enhancedFamily.items[0];
						}
						
						if (!item) return;
						
						if (hasTemperatureVariants(family)) {
							// Prioritizza WW se disponibile, altrimenti il primo della lista
							const availableTemps = getAvailableTemperatures(family);
							const wwTemp = availableTemps.find(t => t.suffix === 'WW');
							if (wwTemp) {
								const itemPrefix = item.code.split(' ')[0];
								const wwItem = enhancedFamily.items.find(i => 
									TemperatureManager.getCurrentTemperature(i.code)?.suffix === 'WW' &&
									i.code.startsWith(itemPrefix)
								);
								if (wwItem) {
									item = wwItem;
								}
							}
						}
						
						if (family.needsConfig || hasTemperatureVariants(family)) {
							pushState('', {
								chosenFamily,
								chosenItem: item.code,
								reference: undefined,
							});
						} else if (family.hasModel) {
							rend.addObject(item.code).then((object) => {
								if (chosenFamily === undefined) throw new Error('What????');
								finishEdit(rend, object, null, {
									chosenFamily,
									chosenItem: item.code,
									reference: undefined,
								});
							});
						} else {
							$objects.push({
								code: item.code,
								desc1: item.desc1,
								desc2: item.desc2,
								subobjects: [],
							});
							goto(`/${data.tenant}/${data.system}`);
						}
					}}
				>
					{#if (chosenFamily !== undefined && (data.families[chosenFamily].needsConfig || hasTemperatureVariants(data.families[chosenFamily]))) || (mode === 'Luci' && selectedPower)}
						AVANTI
					{:else}
						{$_("common.add")}
					{/if}
				</Button.Root>
				{/if}
			{:else}
				<Button.Root
					class={button({ class: 'mt-auto' })}
					on:click={() => {
						if (temporary) {
							const oldTemporary = temporary;
							temporary = null;
							
							const stateToPass = {
								chosenFamily: page.state.chosenFamily!,
								chosenItem: page.state.chosenItem!,
								reference: page.state.reference,
								length: page.state.length,
								isCustomLength: page.state.isCustomLength,
								led: page.state.led,
							};
							
							finishEdit(rend, oldTemporary, group, stateToPass);
						} else {
							console.error('❌ Nessun oggetto temporaneo trovato');
						}
					}}
				>
					AGGIUNGI
				</Button.Root>
			{/if}
		</div>

		<AreluxLogo />

		<Toggle2d3d bind:is3d {renderer} {virtualRoomDisabled} />
	{/if}

	<div bind:this={controlsEl}></div>

	<!-- Pannello potenze - mostrato quando una sottofamiglia è selezionata -->
	{#if showPowerPanel && selectedSubfamily && page.state.chosenFamily === undefined}
		<div class="absolute bottom-5 left-80 right-80 flex justify-center z-10">
			<div class="flex gap-6 rounded bg-box p-6 shadow-lg border border-gray-200">
				{#each selectedSubfamily.models as model}
					{@const iconCode = TemperatureManager.getBaseCodeForResources(model.sampleCode)}
					{@const url = data.supabase.storage
						.from(data.tenant)
						.getPublicUrl(`images/${iconCode}.webp`).data.publicUrl}
					
					<button
						class="flex flex-col items-center gap-2 group"
						onclick={() => {
							selectedPower = model;
							
							// IMPORTANTE: Mostra subito le handles quando selezioni una potenza!
							if (renderer && selectedPower) {
								renderer.handles.selectObject(selectedPower.sampleCode).setVisible(true);
								renderer.setOpacity(0.4);
								
								// Imposta il callback per quando clicchi su una handle
								renderer.setClickCallback((handle) => {
									let reference: typeof page.state.reference = {
										typ: 'junction',
										id: handle.other.id,
										junction: handle.otherJunctId,
									};

									if ((handle as LineHandleMesh).isLineHandle) {
										reference = {
											typ: 'line',
											id: handle.other.id,
											junction: handle.otherJunctId,
											pos: {
												x: (handle as LineHandleMesh).clickedPoint?.x ?? 0,
												y: (handle as LineHandleMesh).clickedPoint?.y ?? 0,
												z: (handle as LineHandleMesh).clickedPoint?.z ?? 0,
											},
										};
									}

									// Trova la famiglia per questo item
									let familyForItem: string | undefined;
									for (const [famCode, fam] of Object.entries(data.families)) {
										if (fam.items.some(i => i.code === selectedPower!.sampleCode)) {
											familyForItem = famCode;
											break;
										}
									}
									
									if (!familyForItem) {
										console.error('Famiglia non trovata per item:', selectedPower!.sampleCode);
										return;
									}

									// Naviga direttamente alla configurazione o aggiungi l'oggetto
									const family = data.families[familyForItem];
									const item = family.items.find(i => i.code === selectedPower!.sampleCode);
									
									if (!item) {
										console.error('Item non trovato:', selectedPower!.sampleCode);
										return;
									}
									
									if (family.needsConfig || hasTemperatureVariants(family)) {
										pushState('', {
											chosenFamily: familyForItem,
											chosenItem: item.code,
											reference,
										});
									} else if (family.hasModel) {
										// Aggiungi l'oggetto direttamente
										renderer!.addObject(item.code).then((object) => {
											if (reference.typ === 'junction') {
												renderer!.getObjectById(reference.id)?.attach(object);
											} else {
												renderer!.getObjectById(reference.id)?.attachLine(object, reference.pos);
											}
											
											finishEdit(renderer!, object, null, {
												chosenFamily: familyForItem,
												chosenItem: item.code,
												reference,
											});
										});
									}
								});
							}
						}}
					>
						<div class="relative">
							<img
								src={url}
								width="80"
								height="80"
								alt=""
								onload={() => loaded.add(url)}
								class={cn(
									'h-[80px] w-[80px] rounded-full outline outline-0 outline-primary transition-all group-hover:outline-2',
									selectedPower?.baseModel === model.baseModel && 'outline-4',
									loaded.has(url) || 'opacity-0',
								)}
							/>
							
							{#if selectedPower?.baseModel === model.baseModel}
								<div class="absolute top-0 left-0 w-[80px] h-[80px] rounded-full border-2 border-yellow-400 pointer-events-none"></div>
							{/if}
							
							<div
								class={cn(
									'absolute top-0 z-10 h-[80px] w-[80px] animate-pulse rounded-full bg-gray-400',
									loaded.has(url) && 'hidden',
								)}
							></div>
						</div>
						
						<span class="font-medium text-sm">{model.power}W</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Pannello configurazioni in basso (esistente) -->
	<div class="absolute bottom-5 left-80 right-80 flex justify-center gap-3">
		{#if page.state.chosenFamily !== undefined}
			{@const family = data.families[page.state.chosenFamily]}

			{#if hasTemperatureVariants(family)}
				{@const availableTemperatures = getAvailableTemperatures(family)}
				{@const currentTemp = getCurrentTemperature(page.state.chosenItem)}
				
				<div class="flex items-center rounded bg-box px-5 py-3">
					<span class="mr-4 font-medium">Temperatura:</span>
					<div class="flex rounded border-2 border-gray-300 overflow-hidden">
						{#each availableTemperatures as temperature}
							<button
								class="px-6 py-2 font-medium transition-all {currentTemp?.suffix === temperature.suffix 
									? 'bg-yellow-400 text-black' 
									: 'bg-white text-gray-700 hover:bg-gray-100'}"
								onclick={() => {
									const newCode = switchToTemperature(page.state.chosenItem, temperature);
									const newItem = findItemByCode(family, newCode);
									
									if (newItem) {
										replaceState('', {
											chosenItem: newCode,
											chosenFamily: page.state.chosenFamily,
											reference: page.state.reference,
											length: page.state.length,
											isCustomLength: page.state.isCustomLength,
											led: page.state.led,
										});
									}
								}}
							>
								<div class="text-center">
									<div class="font-bold">{temperature.label}</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{@const isProfilo = family.group.toLowerCase().includes('profil') || 
							  family.displayName.toLowerCase().includes('profil') ||
							  (family.needsLengthConfig && !family.isLed)}

			{#if isProfilo}
				{#if family.system === "XNet" || family.system === "XFree S"}
					<ConfigLength
						{family}
						onsubmit={(objectCode, length, isCustom) => {
							configLength = length;
							
							replaceState('', {
								chosenItem: objectCode,
								chosenFamily: page.state.chosenFamily,
								reference: page.state.reference,
								length: length,
								isCustomLength: isCustom
							});
						}}
					/>
				{:else if family.needsLengthConfig && !family.arbitraryLength}
					<ConfigLength
						{family}
						onsubmit={(objectCode, length, isCustom) => {
							configLength = length;
							
							replaceState('', {
								chosenItem: objectCode,
								chosenFamily: page.state.chosenFamily,
								reference: page.state.reference,
								length: length,
								isCustomLength: isCustom
							});
						}}
					/>
				{:else if family.needsLengthConfig && family.arbitraryLength}
					<ConfigLengthArbitrary
						value={arbitraryLength}
						onsubmit={(length) => {
							replaceState('', {
								chosenItem: page.state.chosenItem,
								chosenFamily: page.state.chosenFamily,
								reference: page.state.reference,
								length,
							});
						}}
					/>
				{/if}
			{/if}
			
			{#if family.needsCurveConfig}
				<ConfigCurveShape
					{family}
					onSubmit={(familyEntry, chosenPoint) => {
						configShape = chosenPoint;
						replaceState('', {
							chosenItem: familyEntry.code,
							chosenFamily: page.state.chosenFamily,
							reference: page.state.reference,
						});
					}}
				/>
			{/if}

			{#if family.needsColorConfig}
				<ConfigColor
					items={family.items.map((i) => i.color)}
					disabled={(family.needsCurveConfig && configShape === undefined) ||
					(family.needsLengthConfig && configLength === undefined)}
					onsubmit={(color) => {
						const { angle, radius } = configShape ?? { angle: -1, radius: -1 };
						const { needsCurveConfig, needsLengthConfig } = family;
						
						// Ottieni la temperatura corrente
						const currentTemp = getCurrentTemperature(page.state.chosenItem);
						
						const items = family.items
							.filter((i) => (needsCurveConfig ? i.deg === angle && i.radius === radius : true))
							.filter((i) => (needsLengthConfig ? i.len === configLength : true))
							.filter((i) => i.color === color)
							.filter((i) => {
								// Filtra anche per temperatura se disponibile
								if (currentTemp) {
									const itemTemp = getCurrentTemperature(i.code);
									return itemTemp?.suffix === currentTemp.suffix;
								}
								return true;
							});
							
						if (items.length === 0) {
							console.error("Nessun item trovato con colore:", color, "e temperatura:", currentTemp?.suffix);
							throw new Error("what?");
						}
						
						replaceState('', {
							chosenItem: items[0].code,
							chosenFamily: page.state.chosenFamily,
							reference: page.state.reference,
						});
					}}
				/>
			{/if}

			{#if family.needsLedConfig}
				{@const chosenItem = family.items.find((i) => i.code === page.state.chosenItem)}
				<ConfigLed
					family={data.families[family.ledFamily ?? '']}
					length={family.arbitraryLength ? page.state.length : chosenItem?.len}
					tenant={data.tenant}
					supabase={data.supabase}
					onsubmit={(led, length) => {
						replaceState('', {
							chosenItem: page.state.chosenItem,
							chosenFamily: page.state.chosenFamily,
							reference: page.state.reference,
							led,
							length,
						});
						arbitraryLength = length;
					}}
				/>
			{/if}

			{#if enhancedCatalog[page.state.chosenItem]?.juncts?.length > 1 && $objects.length > 0}
				<button class={button({ class: 'flex items-center' })} onclick={() => temporary?.rotate()}>
					<ArrowsClockwise class="mr-1 size-7 text-foreground" />
					Ruota
				</button>
			{/if}
		{/if}
	</div>
</main>
<canvas class="absolute inset-0 -z-10 h-dvh w-full" bind:this={canvas}></canvas>