<script lang="ts">
	import _ from 'lodash';
	import type { FamilyEntry, Family } from '../../app';
	import { DEG2RAD } from 'three/src/math/MathUtils.js';
	import { arc } from './svgutils';
	import { Button, Dialog, Separator } from 'bits-ui';
	import { button } from '$lib';
	import { fade } from 'svelte/transition';
	import { cn, flyAndScale } from '$shad/utils';

	export type Props = {
		selected?: FamilyEntry | undefined;
		onSubmit?: undefined | ((value: FamilyEntry, point: Point) => void);
		family: Family;
	};

	type Point = {
		angle: number;
		radius: number;
	};

	let { selected = $bindable(), onSubmit, family }: Props = $props();
	let open = $state(false);

	// Estrai e ordina punti unici dalla famiglia
	const points = $derived<Point[]>(
		_.uniqWith(
			family.items.map((i) => ({ angle: i.deg, radius: i.radius })),
			_.isEqual,
		)
	);

	// Crea una mappa per i raggi visualizzati
	const mappedRadii = $derived.by<Map<string, number>>(() => {
		// Trova il raggio minimo e massimo
		const radii = family.items.map((i) => i.radius);
		const minR = Math.min(...radii);
		const maxR = Math.max(...radii);
		
		// Funzione di interpolazione per posizionare i punti in SVG
		const lerp = (r: number) => {
			// Se min e max sono uguali, restituisci un valore centrale
			if (minR === maxR) return 57.5; // (20 + 95) / 2
			return (20 * (maxR - r) + 95 * (r - minR)) / (maxR - minR);
		};
		
		// Crea la mappa
		return new Map(
			family.items.map((i) => [
				JSON.stringify({ angle: i.deg, radius: i.radius }), 
				lerp(i.radius)
			]),
		);
	});

	// Estrai angoli e verifica se ce ne sono di ampi
	const angles = $derived(Array.from(new Set(points.map((p) => p.angle))).sort((a, b) => a - b));
	const wide = $derived(angles.some((angle) => angle > 90));
	
	// Estrai raggi mappati unici
	const radii = $derived(Array.from(new Set(
		points.map((p) => mappedRadii.get(JSON.stringify(p))!)
	)).sort((a, b) => a - b));

	// Ordina i punti per raggio e angolo
	function sortPoints(points: Point[]): Point[] {
		return [...points].sort((a, b) => {
			if (a.radius !== b.radius) return a.radius - b.radius;
			return a.angle - b.angle;
		});
	}

	// Gestisce la selezione di un punto
	function handlePointSelect(point: Point) {
		selected = family.items.find(
			(item) => item.radius === point.radius && item.deg === point.angle
		);
	}

	// Gestisce la conferma della selezione
	function handleConfirm() {
		if (onSubmit !== undefined && selected !== undefined) {
			onSubmit(selected, { radius: selected.radius, angle: selected.deg });
		}
		if (selected !== undefined) {
			open = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={button()} aria-label="Modifica curvatura e lunghezza">
		Modifica curvatura e lunghezza
	</Dialog.Trigger>

	<Dialog.Portal>
		<Dialog.Overlay
			transition={fade}
			transitionConfig={{ duration: 150 }}
			class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
		/>
		<Dialog.Content
			transition={flyAndScale}
			class={cn(
				'fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-3/5',
				wide ? 'max-w-[800px]' : 'max-w-[600px]',
			)}
			aria-labelledby="curve-shape-title"
		>
			<Dialog.Title id="curve-shape-title" class="flex w-full items-center text-left text-2xl font-bold">
				Modifica curvatura:
			</Dialog.Title>
			<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

			<Dialog.Description class="flex items-center justify-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={wide ? 800 : 400}
					height="400"
					viewBox="-102 -102 {wide ? '204' : '104'} 104"
					fill="none"
					stroke-width="0.6"
					aria-labelledby="curve-shape-svg-title"
					role="img"
				>
					<title id="curve-shape-svg-title">Selettore curvatura</title>
					
					<!-- Linee degli angoli -->
					{#each angles as angle}
						{@const x = 100 * Math.cos((180 + angle) * DEG2RAD)}
						{@const y = 100 * Math.sin((180 + angle) * DEG2RAD)}
						<line x1="0" y1="0" x2={x} y2={y} stroke="#e5e7eb" />
					{/each}

					<!-- Linea di base orizzontale -->
					<line x1="0" y1="0" x2="-100" y2="0" stroke="#e5e7eb" />
					{#if wide}
						<line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" />
					{/if}

					<!-- Archi per i raggi -->
					{#each radii as radius}
						<path d={arc(radius, wide ? 180 : 90)} stroke="#e5e7eb" stroke-dasharray="2" />
					{/each}

					<!-- Arco per il punto selezionato -->
					{#if selected !== undefined}
						{@const point = points.find(
							(p) => p.radius === selected!.radius && p.angle === selected!.deg
						)}
						{#if point !== undefined}
							<path
								d={arc(mappedRadii.get(JSON.stringify(point))!, point.angle)}
								stroke="#686868"
								class="pointer-events-none"
								aria-label={`Arco selezionato: raggio ${point.radius}mm, angolo ${point.angle}°`}
							/>
						{/if}
					{/if}

					<!-- Punti selezionabili -->
					{#each sortPoints(points) as point, i}
						{@const isSelected =
							selected && selected.deg === point.angle && selected.radius === point.radius}
						{@const x =
							mappedRadii.get(JSON.stringify(point))! * Math.cos((180 + point.angle) * DEG2RAD)}
						{@const y =
							mappedRadii.get(JSON.stringify(point))! * Math.sin((180 + point.angle) * DEG2RAD)}

						<circle
							fill={isSelected ? 'hsl(var(--primary))' : '#686868'}
							class="outline-none transition-colors focus-visible:scale-150 focus-visible:stroke-popover-foreground hover:fill-amber-400"
							r="1.5"
							transform-origin="{x} {y}"
							cx={x}
							cy={y}
							role="button"
							tabindex={i + 1}
							onclick={() => handlePointSelect(point)}
							onkeyup={(e) => (e.key === ' ' || e.key === 'Enter') && handlePointSelect(point)}
							aria-label={`Punto con raggio ${point.radius}mm e angolo ${point.angle}°`}
							aria-pressed={isSelected}
						/>
					{/each}

					<!-- Etichetta per il punto selezionato -->
					{#if selected !== undefined}
						{@const point = points.find(
							(p) => p.radius === selected!.radius && p.angle === selected!.deg
						)!}
						<text
							x={mappedRadii.get(JSON.stringify(point))! * -1 + 2}
							y="-2"
							fill="hsl(var(--foreground))"
							class="text-[5px]"
						>
							{point.radius}mm
						</text>
					{/if}
				</svg>
			</Dialog.Description>

			<!-- Pulsanti di azione -->
			<div class="flex w-full flex-row items-stretch gap-5 pt-6">
				<Dialog.Close class={button({ color: 'secondary', class: 'w-full' })} aria-label="Annulla selezione">
					<span class="translate-y-0.5">Annulla</span>
				</Dialog.Close>
				<Button.Root
					disabled={selected === undefined}
					class={button({ class: 'w-full' })}
					on:click={handleConfirm}
					aria-label="Conferma selezione"
				>
					<span class="translate-y-0.5">Conferma</span>
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	svg circle:hover {
		fill: #feca0a;
		cursor: pointer;
	}
	
	svg circle {
		transition: fill 0.2s ease-in-out, transform 0.2s ease-in-out;
	}
</style>