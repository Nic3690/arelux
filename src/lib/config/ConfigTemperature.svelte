<script lang="ts">
	import { Slider } from 'bits-ui';

	let {
		min,
		max,
		step,
		defaultValue = 4000,
		onChange = undefined
	}: {
		min: number;
		max: number;
		step: number;
		defaultValue?: number;
		onChange?: ((value: number) => void) | undefined;
	} = $props();

	let value = $state([defaultValue]);

	$effect(() => {
		if (onChange && value[0]) {
			onChange(value[0]);
		}
	});
</script>

<div class="flex w-full items-center justify-center rounded bg-box px-5 py-3 md:max-w-[280px]">
	<Slider.Root
		bind:value
		let:thumbs
		let:ticks
		{min}
		{max}
		{step}
		class="relative flex w-full touch-none select-none items-center"
	>
		<span
			class="relative h-2 w-full grow overflow-hidden rounded-full bg-gradient-to-l from-blue-400 to-red-400"
		>
			<Slider.Range class="absolute h-full" />
		</span>
		{#each thumbs as thumb}
			<Slider.Thumb
				{thumb}
				class="border-border-input hover:border-dark-40 block size-[25px] cursor-pointer rounded-full border bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 active:scale-98 disabled:pointer-events-none disabled:opacity-50 dark:bg-foreground dark:shadow-card"
			/>
		{/each}

		{#each ticks as tick}
			<Slider.Tick {tick} />
		{/each}
	</Slider.Root>

	<input
		bind:value={value[0]}
		class="font-input ml-5 w-16 appearance-none rounded-md border border-black/40 bg-transparent"
		name="temperature-input"
		id="temperature-input"
		aria-label="Temperatura in Kelvin"
	/>

	<span class="translate-y-0.5 pl-1">K</span>
</div>