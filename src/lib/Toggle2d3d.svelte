<script lang="ts">
	import { Dialog, Separator } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { flyAndScale } from '$shad/utils';
	import X from 'phosphor-svelte/lib/X';
	import { button } from '$lib';
	import { page } from '$app/state';
	import { Renderer } from './renderer/renderer';

	export let is3d: boolean = page.data.settings.allow3d;
</script>

<div class="main">
	{#if page.data.settings.allow3d}
		<input type="checkbox" id="toggle" class="toggleCheckbox" bind:checked={is3d} />
		<label for="toggle" class="toggleContainer border border-[#e8e8e8]">
			<div><span>2D</span></div>
			<div><span>3D</span></div>
		</label>
	{/if}

	<!-- Help popup -->
	<Dialog.Root>
		<Dialog.Trigger class={button({ size: 'square', class: 'font-bold' })}>
			<span class="text-xl">?</span>
		</Dialog.Trigger>

		<Dialog.Portal>
			<Dialog.Overlay
				transition={fade}
				transitionConfig={{ duration: 150 }}
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
			/>
			<Dialog.Content
				transition={flyAndScale}
				class="fixed left-[50%] top-[50%] z-50 w-full max-w-[94%] translate-x-[-50%] translate-y-[-50%] rounded bg-background p-5 shadow-popover outline-none lg:w-3/5"
			>
				<Dialog.Title class="flex w-full items-center text-left text-2xl font-bold">
					Come funziona il configuratore:
				</Dialog.Title>
				<Separator.Root class="-mx-5 mb-3 mt-3 block h-px bg-muted" />

				<Dialog.Description>
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Architecto in ab esse, laboriosam
					quod quam impedit ipsa eum, dignissimos dolore nobis mollitia odit cum nostrum iusto. Quo
					error repellendus atque!

					<h2 class="mb-2 mt-2 text-xl font-bold">Funzioni base:</h2>

					Lorem ipsum dolor sit amet consectetur adipisicing elit. Saepe rerum quibusdam aspernatur
					nobis reiciendis necessitatibus autem deleniti. Asperiores et sequi quidem.

					<ul class="mt-2 flex w-full place-content-between">
						<li>PROFILI</li>
						<li>CONNETTORI</li>
						<li>LUCI</li>
						<li>ACCESSORI</li>
						<li>PREVENTIVO</li>
					</ul>

					<h2 class="mb-2 mt-2 text-xl font-bold">Legenda simboli:</h2>
				</Dialog.Description>

				<Dialog.Close
					class="absolute right-5 top-5 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-98"
				>
					<div>
						<X class="size-5 text-foreground" />
						<span class="sr-only">Close</span>
					</div>
				</Dialog.Close>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</div>

<style>
	.main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		grid-row: span 2;
		width: 50px;

		user-select: none;
	}

	.toggleContainer {
		grid-row: span 2;

		background: #e8e8e8;
		color: hsl(var(--primary));

		color: rgba(0, 0, 0, 127);

		position: relative;
		display: grid;
		grid-template-rows: repeat(2, 1fr);
		height: 96px;
		border-radius: 10px;
		font-weight: bold;
		cursor: pointer;

		font-size: 25px;
		font-family: 'Acumin Pro';
	}
	.toggleContainer::before {
		content: '';
		position: absolute;
		width: 100%;
		height: 50%;
		left: 0%;
		border-radius: 10px;
		background: white;
		transition: all 0.3s;
	}
	.toggleCheckbox:checked + .toggleContainer::before {
		top: 50%;
	}
	.toggleContainer div {
		padding: 2px;
		text-align: center;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.toggleContainer div * {
		transform: translateY(0.1em);
	}
	.toggleCheckbox {
		display: none;
	}
	.toggleCheckbox:checked + .toggleContainer div:first-child {
		color: rgba(0, 0, 0, 127);
		transition: color 0.2s;
	}
	.toggleCheckbox:checked + .toggleContainer div:last-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
	.toggleCheckbox + .toggleContainer div:first-child {
		color: hsl(var(--primary));
		transition: color 0.2s;
	}
	.toggleCheckbox + .toggleContainer div:last-child {
		color: rgba(0, 0, 0, 127);
		transition: color 0.2s;
	}
</style>
