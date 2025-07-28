<script lang="ts">
	import _ from 'lodash';
	import type { FamilyEntry, Family } from '../../app';
	import { DEG2RAD } from 'three/src/math/MathUtils.js';
	import { arc } from './svgutils';
	import { Button, Dialog, Separator } from 'bits-ui';
	import { button } from '$lib';
	import { fade } from 'svelte/transition';
	import { cn, flyAndScale } from '$shad/utils';
	import { _ as fnct } from 'svelte-i18n';

	export type Props = {
		selected?: FamilyEntry | undefined;
		onSubmit?: undefined | ((value: FamilyEntry, point: Point) => void);
		family: Family;
	};

	type Point = {
		angle: number;
		radius: number;
	};

	function sorted(points: Point[]): Point[] {
		return points.toSorted((a, b) => {
			if (a.radius < b.radius) return -1;
			if (a.radius > b.radius) return 1;
			if (a.angle < b.angle) return -1;
			if (a.angle > b.angle) return 1;
			return 0;
		});
	}

	let { selected = $bindable(), onSubmit, family }: Props = $props();
	let open = $state(false);

	const points = $derived<Point[]>(
		_.uniqWith(
			family.items.map((i) => ({ angle: i.deg, radius: i.radius })),
			_.isEqual,
		),
	);

	const mappedRadii = $derived.by<Map<string, number>>(() => {
		const minR = Math.max(...family.items.map((i) => i.radius));
		const maxR = Math.min(...family.items.map((i) => i.radius));
		const lerp = (r: number) => (20 * (minR - r) + 95 * (r - maxR)) / (minR - maxR);
		return new Map(
			family.items.map((i) => [JSON.stringify({ angle: i.deg, radius: i.radius }), lerp(i.radius)]),
		);
	});

	const angles = $derived(new Set(points.map((p) => p.angle)));
	const wide = $derived(angles.values().some((angle) => angle > 90));
	const radii = $derived(new Set(points.map((p) => mappedRadii.get(JSON.stringify(p))!)));
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class="tracking-wider {button()}">{$fnct("config.modifyCurvature")}</Dialog.Trigger>

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
		>
			<Dialog.Title class="relative flex w-full items-center text-left text-2xl font-bold">
				<span>{$fnct("config.modifyCurvature")}</span>
				
				{#if selected !== undefined}
					<div class="absolute right-0 flex gap-4 text-sm font-normal">
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground text-lg">{$fnct("config.angle")}</span>
							<span class="font-medium text-lg">{selected.deg}°</span>
						</div>
						<div class="flex items-center gap-1">
							<span class="text-muted-foreground text-lg">{$fnct("config.radius")}</span>
							<span class="font-medium text-lg">{selected.radius}mm</span>
						</div>
					</div>
				{/if}
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
				>
					<!-- Linee non inferiori -->
					{#each angles as angle}
						{@const x = 100 * Math.cos((180 + angle) * DEG2RAD)}
						{@const y = 100 * Math.sin((180 + angle) * DEG2RAD)}
						<line x1="0" y1="0" x2={x} y2={y} stroke="#e5e7eb" />
					{/each}

					<!-- Linea inferiore -->
					<line x1="0" y1="0" x2="-100" y2="0" stroke="#e5e7eb" />
					{#if wide}
						<line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" />
					{/if}

					<!-- Archi -->
					{#each radii as radius}
						<path d={arc(radius, wide ? 180 : 90)} stroke="#e5e7eb" stroke-dasharray="2" />
					{/each}

					{#if selected !== undefined}
						{@const point = points.find(
							(p) => p.radius === selected!.radius && p.angle === selected!.deg,
						)}
						{#if point !== undefined}
							<path
								d={arc(mappedRadii.get(JSON.stringify(point))!, point.angle)}
								stroke="#686868"
								class="pointer-events-none"
							/>
						{/if}
					{/if}

					{#each sorted(points) as point, i}
						{@const isSelected =
							selected && selected.deg === point.angle && selected.radius === point.radius}
						{@const select = () =>
							(selected = family.items.find(
								(item) => item.radius === point.radius && item.deg === point.angle,
							))}

						{@const x =
							mappedRadii.get(JSON.stringify(point))! * Math.cos((180 + point.angle) * DEG2RAD)}
						{@const y =
							mappedRadii.get(JSON.stringify(point))! * Math.sin((180 + point.angle) * DEG2RAD)}

						<circle
							fill={isSelected ? 'hsl(var(--primary))' : '#686868'}
							class="outline-none transition-colors focus-visible:scale-150 focus-visible:stroke-popover-foreground"
							r="1"
							transform-origin="{x} {y}"
							cx={x}
							cy={y}
							role="button"
							tabindex={i + 1}
							onclick={select}
							onkeyup={(e) => (e.key === ' ' || e.key === 'Enter') && select()}
						/>
					{/each}
				</svg>
			</Dialog.Description>

			<div class="flex w-full flex-row items-stretch gap-5 pt-6">
				<Dialog.Close class={button({ color: 'secondary', class: 'w-full' })}>
					<span class="translate-y-0.5">{$fnct("common.cancel")}</span>
				</Dialog.Close>
				<Button.Root
					disabled={selected === undefined}
					class={button({ class: 'w-full' })}
					on:click={() => {
						if (onSubmit !== undefined && selected !== undefined)
							onSubmit(selected, { radius: selected.radius, angle: selected.deg });
						if (selected !== undefined) open = false;
					}}
				>
					<span class="translate-y-0.5">{$fnct("common.confirm")}</span>
				</Button.Root>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	svg circle:hover {
		fill: #feca0a;
	}
</style>