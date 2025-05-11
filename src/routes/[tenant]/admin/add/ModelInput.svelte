<script lang="ts">
	import { Input } from '$shad/ui/input';
	import { Label } from '$shad/ui/label';
	import { toast } from 'svelte-sonner';
	import type { Renderer } from '$lib/renderer/renderer';
	import type { TemporaryObject } from '$lib/renderer/objects';

	export let idSupplement: string;
	export let renderer: Renderer;
	let obj: TemporaryObject;

	export async function onShow() {
		let el = document.getElementById(`${idSupplement}-model`);
		if (el === null) return toast.error(`Element '${idSupplement}-model' not found`);

		let files = (el as HTMLInputElement).files;
		if (files === null) return toast.error(`Element '${idSupplement}-model' is not of type="file"`);

		if (obj) renderer.removeObject(obj);
		
		try {
			obj = renderer.addTemporaryObject();
			renderer.frameObject(obj);
		} catch (error) {
			toast.error('Failed to render model. Is it a GLTF/GLB file?');
			console.error(error);
		}

		return files[0];
	}
	export function getFile() {
		const el = document.getElementById(`${idSupplement}-model`) as HTMLInputElement;
		return el?.files?.[0] || null;
	}
</script>

<div>
	<Label for="{idSupplement}-model"><slot /></Label>
	<Input
		id="{idSupplement}-model"
		type="file"
		class="cursor-pointer transition-colors hover:bg-accent"
		on:change={onShow}
	/>
</div>