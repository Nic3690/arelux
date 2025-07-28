<script lang="ts">
	import * as Form from '$shad/ui/form';
	import { Input } from '$shad/ui/input';
	import { Button } from '$shad/ui/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { createSystem } from '$lib/admin.js';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	let imageInput: HTMLInputElement | undefined = $state();

	const form = superForm(data.form, {
		SPA: true,
		validators: zodClient(data.schema),
		onUpdate: async ({ form: f }) => {
			if (f.valid) {
				try {
					await createSystem(data.tenant, $formData.name, $formData.image);
					toast.success('Created');
				} catch {
					toast.error('Something went wrong');
				}
			}
		},
	});
	const { form: formData, enhance } = form;

	if (page.state.editing !== undefined) {
		const elem = data.families[page.state.editing];
		$formData.name = elem.displayName;

		const url = data.supabase.storage
			.from(data.tenant)
			.getPublicUrl(`system/${page.state.editing}.jpg`).data.publicUrl;
		const blob = fetch(url).then((res) => res.blob());

		onMount(async () => {
			let file = new File([await blob], $formData.name, {
				type: 'image/jpeg',
				lastModified: new Date().getTime(),
			});
			let container = new DataTransfer();
			container.items.add(file);
			if (imageInput) imageInput.files = container.files;
		});
	}
</script>

<h1 class="py-6 text-center text-4xl">Add a new system</h1>

<div class="flex items-center justify-center">
	<Button href=".">{$_("common.back")}</Button>
</div>

<form method="POST" enctype="multipart/form-data" class="container flex flex-col gap-3" use:enhance>
	<Form.Field {form} name="name">
		<Form.Control let:attrs>
			<Form.Label class="flex flex-row items-center gap-6">
				Name
				<Form.FieldErrors />
			</Form.Label>
			<Input {...attrs} bind:value={$formData.name} />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="image">
		<Form.Control let:attrs>
			<Form.Label class="flex flex-row items-center gap-6">
				Image
				<Form.FieldErrors />
			</Form.Label>
			<Input
				type="file"
				{...attrs}
				bind:el={imageInput}
				onchange={(e) => {
					let el = e.target;
					if (el === null) return toast.error(`Something went wrong`);

					let files = (el as HTMLInputElement).files;
					if (files === null) return toast.error(`Something went wrong`);

					$formData.image = files[0];
				}}
			/>
		</Form.Control>
	</Form.Field>

	<Button type="submit">Submit</Button>
</form>
