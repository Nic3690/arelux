<script lang="ts">
	import { cn } from '$shad/utils';
	type Props = { value?: number; onsubmit?: (value: number) => any };

	let { value = $bindable(0), onsubmit }: Props = $props();
</script>

<div class="flex items-center justify-center rounded bg-box px-6 py-1">
	<input
		bind:value
		class={cn('font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent')}
		onblur={() => {
			if (onsubmit && value) onsubmit(value);
		}}
		onkeyup={(e) => {
			if (e.key === 'Enter' && onsubmit && value) onsubmit(value);
		}}
	/>
	<span class="ml-0.5">mm</span>
</div>
