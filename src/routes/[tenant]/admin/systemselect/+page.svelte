<script lang="ts">
	import { goto } from '$app/navigation';
	import { selectSystem } from '$lib';
	import { Button } from '$shad/ui/button';

	let { data } = $props();
</script>

<h1 class="py-6 text-center text-2xl">Select which system you want to edit</h1>

<div class="flex flex-col items-center justify-center gap-4">
	{#each data.systems as system}
		<Button
			onclick={async () => {
				await selectSystem(system);
				goto(`/${data.tenant}/admin`);
			}}>{system}</Button
		>
	{/each}
</div>

<h1 class="py-6 text-center text-2xl">Or add a new one</h1>

<div class="flex items-center justify-center">
	<Button href="systemadd">Click here</Button>
</div>
