<script lang="ts">
	import Logo from '$lib/Logo.svelte';

	let { data } = $props();
</script>

<Logo top={false} />

<h1 class="pl-20 pt-20 text-xl">Scegli il sistema che vuoi configurare:</h1>

<div class="grid grid-cols-2 place-content-center gap-10 p-20 text-xl">
	{#each data.systems as system}
		{@const url = data.supabase.storage.from(data.tenant).getPublicUrl(`systems/${system}.jpg`)
			.data.publicUrl}
		<a href="/{data.tenant}/{system}">
			<div class="flex w-full items-center justify-between rounded bg-box px-8 py-6">
				{system}
				<div class="h-10 w-10 rounded-full bg-box3"></div>
			</div>
			<img src={url} alt="" class="mt-6 h-48 w-full rounded object-cover" />
		</a>
	{/each}
</div>
