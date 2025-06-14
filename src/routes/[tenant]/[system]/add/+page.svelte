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
	import { button, finishEdit, getPowerBudget, objects } from '$lib';
	import ConfigCurveShape from '$lib/config/ConfigCurveShape.svelte';
	import ConfigLength from '$lib/config/ConfigLength.svelte';
	import ConfigLed from '$lib/config/ConfigLed.svelte';
	import ConfigLengthArbitrary from '$lib/config/ConfigLengthArbitrary.svelte';
	import { Renderer } from '$lib/renderer/renderer';
	import type { LineHandleMesh } from '$lib/renderer/handles';
	import ArrowsClockwise from 'phosphor-svelte/lib/ArrowsClockwise';
	import { SvelteSet } from 'svelte/reactivity';
	import type { RendererObject, TemporaryObject } from '$lib/renderer/objects'; // AGGIUNTO TemporaryObject
	import ConfigLengthSelector from '$lib/config/ConfigLengthSelector.svelte';
	import { type CompositeProfileConfig } from '$lib/compositeProfiles'; // NUOVO IMPORT
	import { Vector3 } from 'three';

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

	let virtualRoomDisabled = $state(true);

	let configShape = $state<{ angle: number; radius: number }>();
	let configLength = $state<number>();
	let currentCompositeConfig = $state<CompositeProfileConfig | null>(null);

	// Reset compositeConfig quando cambia la famiglia o l'item
	$effect(() => {
		if (page.state.chosenFamily || page.state.chosenItem) {
			// Reset quando cambia la selezione se non è una lunghezza personalizzata
			if (!page.state.isCustomLength) {
				currentCompositeConfig = null;
			}
		}
	}); // NUOVO: memorizza compositeConfig localmente

	onMount(() => {
		renderer = Renderer.get(data, canvas, controlsEl);
		renderer.handles.setVisible(false);
	});

	let hasPowerSupply = $state(false);
	objects.subscribe(
		(objects) => (hasPowerSupply = objects.some((obj) => data.catalog[obj.code].power > 0)),
	);

	$effect(() => {
		if (chosenFamily === undefined || page.state.chosenItem !== undefined) {
			renderer?.handles.setVisible(false);
			renderer?.setOpacity(1);
		} else {
			renderer?.handles.selectObject(data.families[chosenFamily].items[0].code).setVisible(true);
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

				pushState('', {
					chosenFamily: chosenFamily as string,
					chosenItem: data.families[chosenFamily as string].items[0].code,
					reference,
				});
			});
		}
	});

	let temporary: RendererObject | null = null;
	let temporaryComposite: TemporaryObject[] = []; // NUOVO: per profili compositi temporanei
	let group: string | null = $state(null);
	$effect(() => {
		// Pulisci oggetti temporanei esistenti
		if (temporary !== null) {
			renderer?.removeObject(temporary);
			temporary = null;
		}
		
		// Pulisci profili compositi temporanei
		if (temporaryComposite.length > 0) {
			for (const obj of temporaryComposite) {
				renderer?.removeObject(obj);
			}
			temporaryComposite = [];
		}

		if (page.state.chosenFamily !== undefined && page.state.chosenItem !== undefined) {
			renderer?.setOpacity(0.2);

			// NUOVA LOGICA: Controlla se è un profilo composito
			if (currentCompositeConfig && page.state.isCustomLength) {
				console.log('👁️ Creando preview profilo composito temporaneo...');
				
				// Crea preview del profilo composito
				import('$lib/compositeProfiles').then(async ({ createCompositeProfile }) => {
					if (renderer && currentCompositeConfig) {
						try {
							const compositeObjects = await createCompositeProfile(renderer, currentCompositeConfig);
							temporaryComposite = compositeObjects;
							
							// Per il preview, posiziona il profilo composito vicino al punto di attachment
							// ma NON collegarlo effettivamente (è solo un preview)
							if (page.state.reference && compositeObjects.length > 0) {
								const firstObject = compositeObjects[0];
								
								if (page.state.reference.typ === 'junction') {
									const parentObj = renderer?.getObjectById(page.state.reference.id);
									if (parentObj && parentObj.mesh) {
										// Posiziona vicino ma non collegare
										const junctionPos = parentObj.getCatalogEntry().juncts[page.state.reference.junction];
										if (junctionPos && firstObject.mesh) {
											const worldPos = parentObj.mesh.localToWorld(new Vector3().copy(junctionPos));
											firstObject.mesh.position.copy(worldPos);
										}
									}
								} else {
									// Per line junction, posiziona al punto specificato
									if (firstObject.mesh) {
										firstObject.mesh.position.copy(page.state.reference.pos);
									}
								}
							}
							
							console.log('✅ Preview profilo composito creato');
						} catch (error) {
							console.error('❌ Errore creazione preview composito:', error);
						}
					}
				});
			} else {
				// LOGICA ORIGINALE: Oggetto singolo normale
				renderer?.addObject(page.state.chosenItem).then((o) => {
					if (junctionId !== undefined) o.markJunction(junctionId);

					if (page.state.reference) {
						if (page.state.reference.typ === 'junction') {
							renderer?.getObjectById(page.state.reference.id)?.attach(o);
						} else {
							renderer?.getObjectById(page.state.reference.id)?.attachLine(o, page.state.reference.pos);
						}
					}

					temporary = o;
				});
			}
		} else {
			renderer?.setOpacity(1);
		}
	});
	beforeNavigate(() => {
		// Pulisci oggetto temporaneo normale
		if (temporary) renderer?.removeObject(temporary);
		
		// Pulisci profili compositi temporanei
		if (temporaryComposite.length > 0) {
			for (const obj of temporaryComposite) {
				renderer?.removeObject(obj);
			}
		}
		
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
				Indietro
			</a>

			<span>Modifica l'oggetto da inserire</span>

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
							<Button.Root on:click={() => (mode = thisMode)}>
								<DropdownMenu.Item class="flex w-36 items-center ">
									<span class="overflow-x-hidden text-ellipsis text-nowrap">
										{thisMode}
									</span>
								</DropdownMenu.Item>
							</Button.Root>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Item list -->
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
							// TODO: remove this
							if (a.displayName === 'ATS24.60IP44') return -1;
							if (b.displayName === 'ATS24.60IP44') return 1;
							return a.displayName.localeCompare(b.displayName);
						})
						.filter((fam) => fam.system === data.system)
						.filter((fam) => fam.group === mode)
						.filter((fam) => fam.visible) as item}
						{@const isDisabled =
							hasPowerSupply && item.items.some((obj) => data.catalog[obj.code].power > 0)}

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

					{item.displayName}
				</RadioGroup.Item>
					{/each}
				</RadioGroup.Root>

				<Button.Root
					class={button()}
					disabled={chosenFamily === undefined}
					on:click={() => {
						if (chosenFamily === undefined) return;

						const family = data.families[chosenFamily];
						const item = family.items[0];
						if (family.needsConfig) {
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
					{#if chosenFamily !== undefined && data.families[chosenFamily].needsConfig}
						AVANTI
					{:else}
						AGGIUNGI
					{/if}
				</Button.Root>
			{:else}
				<Button.Root
					class={button({ class: 'mt-auto' })}
					on:click={() => {
						console.log('🔧 PULSANTE CLICCATO - page.state completo:', {
							chosenFamily: page.state.chosenFamily,
							chosenItem: page.state.chosenItem,
							reference: page.state.reference,
							length: page.state.length,
							isCustomLength: page.state.isCustomLength,
							led: page.state.led,
							compositeConfig: currentCompositeConfig, // USA LA VARIABILE LOCALE
						});
						
						if (temporary) {
							const oldTemporary = temporary;
							temporary = null;
							
							// ✅ AGGIUNGI QUESTO DEBUG PROPRIO PRIMA DI FINISHEDIT
							const stateToPass = {
								chosenFamily: page.state.chosenFamily!,
								chosenItem: page.state.chosenItem!,
								reference: page.state.reference,
								length: page.state.length,
								isCustomLength: page.state.isCustomLength,
								led: page.state.led,
								compositeConfig: currentCompositeConfig, // USA LA VARIABILE LOCALE
							};
							
							console.log('🔧 PARAMETRI CHE PASSO A FINISHEDIT:', stateToPass);
							
							finishEdit(rend, oldTemporary, group, stateToPass);
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

<div class="absolute bottom-5 left-80 right-80 flex justify-center gap-3">
    {#if page.state.chosenFamily !== undefined}
      {@const family = data.families[page.state.chosenFamily]}

      {@const isProfilo = family.group.toLowerCase().includes('profil') || 
                        family.displayName.toLowerCase().includes('profil') ||
                        (family.needsLengthConfig && !family.isLed)}

      {#if isProfilo}
        {#if family.system === "XNet" || family.system === "XFree s"}
            <ConfigLength
                {family}
                onsubmit={(objectCode, length, isCustom, compositeConfig) => {
                    configLength = length;
                    currentCompositeConfig = compositeConfig || null; // MEMORIZZA LOCALMENTE
					console.log('🔧 ADD PAGE - ConfigLength onsubmit ricevuto:', {
						objectCode,
						length,
						isCustom,
						compositeConfig,
						currentPageState: page.state
					});
                    
                    replaceState('', {
                    chosenItem: objectCode,
                    chosenFamily: page.state.chosenFamily,
                    reference: page.state.reference,
                    length: length,
                    isCustomLength: isCustom
                    // compositeConfig rimosso da qui - ora è in currentCompositeConfig
                    });
					console.log('🔧 ADD PAGE - Subito dopo replaceState:', page.state);
                }}
                />
        {:else if family.needsLengthConfig && !family.arbitraryLength}
            <ConfigLength
            {family}
            onsubmit={(objectCode, length, isCustom, compositeConfig) => {
                configLength = length;
                currentCompositeConfig = compositeConfig || null; // MEMORIZZA LOCALMENTE
                let displayCode = objectCode;
                
                replaceState('', {
                chosenItem: displayCode,
                chosenFamily: page.state.chosenFamily,
                reference: page.state.reference,
                length: length,
                isCustomLength: isCustom === true
                // compositeConfig rimosso da qui
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
            const items = family.items
              .filter((i) => (needsCurveConfig ? i.deg === angle && i.radius === radius : true))
              .filter((i) => (needsLengthConfig ? i.len === configLength : true))
              .filter((i) => i.color === color);
            if (items.length === 0) throw new Error("what?");
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
  
      {#if data.catalog[page.state.chosenItem].juncts.length > 1 && $objects.length > 0}
        <button class={button({ class: 'flex items-center' })} onclick={() => temporary?.rotate()}>
          <ArrowsClockwise class="mr-1 size-7 text-foreground" />
          Ruota
        </button>
      {/if}
    {/if}
  </div>
</main>
<canvas class="absolute inset-0 -z-10 h-dvh w-full" bind:this={canvas}></canvas>