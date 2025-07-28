<script lang="ts">
	import { onMount } from 'svelte';
	import { ResizablePaneGroup, ResizablePane, ResizableHandle } from '$shad/ui/resizable';
	import { Button } from '$shad/ui/button';
	import LampConfig from './LampConfig.svelte';
	import type { PageData } from './$types';
	import { Renderer } from '$lib/renderer/renderer';
	import { _ } from 'svelte-i18n';

	let expanded: boolean = true;
	export let data: PageData;
	let renderer: Renderer | undefined;
	let canvas: HTMLCanvasElement;

	onMount(async () =>
		(renderer = Renderer.get(data, canvas, canvas))
			.setBackground(0xbfe3dd)
			.setCamera(canvas, { isOrtographic: true })
			.resetScene(),
	);
</script>

<ResizablePaneGroup direction="horizontal">
	<ResizablePane defaultSize={80}>
		<canvas bind:this={canvas} class="h-dvh w-full"></canvas>
	</ResizablePane>
	<ResizableHandle class="border" />
	<ResizablePane
		defaultSize={20}
		minSize={20}
		collapsedSize={0.5}
		collapsible
		onExpand={() => (expanded = true)}
		onCollapse={() => (expanded = false)}
	>
		{#if expanded}
			<div class="flex h-dvh max-h-dvh flex-col gap-3 overflow-y-scroll {expanded ? 'p-6' : ''}">
				<Button href="/{data.tenant}/admin" class="w-full">{$_("common.back")}</Button>

				<div class="flex gap-3">
					<Button variant="secondary" class="w-1/3" on:click={() => renderer?.moveCamera(100, 0, 0)}
						>X</Button
					>
					<Button variant="secondary" class="w-1/3" on:click={() => renderer?.moveCamera(0, 100, 0)}
						>Y</Button
					>
					<Button variant="secondary" class="w-1/3" on:click={() => renderer?.moveCamera(0, 0, 100)}
						>Z</Button
					>
				</div>

				{#if renderer !== undefined}
					<LampConfig {renderer} />
				{/if}
			</div>
		{/if}
	</ResizablePane>
</ResizablePaneGroup>
