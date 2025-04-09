<script lang="ts">
	import { cn } from '$shad/utils';
	
	type Props = { 
		value?: number; 
		onsubmit?: (value: number) => void;
		min?: number;
		max?: number;
	};

	let { 
		value = $bindable(0), 
		onsubmit,
		min = 0,
		max = Number.MAX_SAFE_INTEGER
	}: Props = $props();

	function handleChange() {
		if (onsubmit && value !== undefined && value >= min && value <= max) {
			onsubmit(value);
		}
	}
</script>

<div class="flex items-center justify-center rounded bg-box px-6 py-1">
	<input
		type="number"
		bind:value
		class={cn('font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent')}
		onblur={handleChange}
		onkeyup={(e) => e.key === 'Enter' && handleChange()}
		min={min}
		max={max}
		aria-label="Lunghezza in millimetri"
	/>
	<span class="ml-0.5">mm</span>
</div>