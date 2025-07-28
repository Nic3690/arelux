<script lang="ts">
	import { Toaster } from 'svelte-sonner';
	import '../../app.pcss';
	import { storable } from '$lib/storable';
	import { button } from '$lib';
	import { _ } from 'svelte-i18n';

	let { data, children } = $props();

	document
		.getElementsByTagName('html')[0]
		.style.setProperty('--primary', data.settings.primaryColor);

	const askForPassword = false;
	let password = storable('password', '');
	let value = $state();
</script>

<svelte:head>
	<title>FDM Redo</title>
</svelte:head>

<Toaster position="top-center" />

<Toaster />

{#if askForPassword}
	{#if $password === 'development-password'}
		{@render children()}
	{:else}
		<div class="m-6 flex max-w-xl flex-col gap-3">
			In sviluppo per lo step 2. Inserire la password:
			<br />

			<input type="password" bind:value class="border" />
			<br />
			<button onclick={() => password.set(value)} class={button()}>{$_("invoice.send")}</button>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}
