<script lang="ts">
	let { children } = $props();

	import { ModeWatcher } from 'mode-watcher';
</script>

<svelte:head>
	<title>Admin page - FDM Redo</title>
</svelte:head>

<ModeWatcher />

{@render children()}
