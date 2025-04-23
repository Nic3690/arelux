<script lang="ts">
	import { getSupabase } from '$lib';
	import { onMount } from 'svelte';
	import '../app.pcss';

	let tenants: Set<string> = $state(new Set());

	onMount(async () => {
		let client = getSupabase();
		let res = await client.storage.listBuckets();
		tenants = new Set(res.data?.map((t) => t.name) ?? []);
	});
</script>

Tenants:

<ul>
	{#each tenants as tenant}
		<li>- <a href={tenant} class="text-blue-700 underline visited:text-purple-800">{tenant}</a></li>
	{/each}
</ul>

Go to
<code>/[tenant]</code>
to view
