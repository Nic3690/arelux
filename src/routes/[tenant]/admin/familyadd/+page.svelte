<script lang="ts">
	import * as Form from '$shad/ui/form';
	import { Input } from '$shad/ui/input';
	import { Button } from '$shad/ui/button';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { Checkbox } from '$shad/ui/checkbox';
	import { createFamily } from '$lib/admin.js';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { selectedSystem } from '$lib';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	let imageInput: HTMLInputElement | undefined = $state();

	const form = superForm(data.form, {
		SPA: true,
		validators: zodClient(data.schema),
		onUpdate: async ({ form: f }) => {
			if (f.valid) {
				try {
					await createFamily(data.tenant, $selectedSystem, $formData);
					toast.success('Created');
				} catch {
					toast.error('Something went wrong');
				}
			} else {
				for (const err of Object.values(f.errors)) {
					toast.error(`Form is invalid: ${err}`);
				}
			}
		},
	});
	const { form: formData, enhance } = form;

	if (page.state.editing !== undefined) {
		const elem = data.families[page.state.editing];
		$formData.displayName = elem.displayName;
		$formData.group = elem.group;
		$formData.hasModel = elem.hasModel;
		$formData.needsColorConfig = elem.needsColorConfig;
		$formData.needsCurveConfig = elem.needsCurveConfig;
		$formData.needsLengthConfig = elem.needsLengthConfig;
		$formData.needsTemperatureConfig = elem.needsTemperatureConfig;
		$formData.needsLedConfig = elem.needsLedConfig;
		$formData.ledFamily = elem.ledFamily ?? undefined;
		$formData.visible = elem.visible;
	}
</script>

<h1 class="py-6 text-center text-4xl">Add a new family</h1>

<div class="flex items-center justify-center">
	<Button href=".">{$_("common.back")}</Button>
</div>

<form
	method="POST"
	enctype="multipart/form-data"
	class="container flex flex-col gap-3 py-6"
	use:enhance
>
	<Form.Field {form} name="displayName">
		<Form.Control let:attrs>
			<Form.Label class="flex flex-row items-center gap-6">
				Name
				<Form.FieldErrors />
			</Form.Label>
			<Input {...attrs} bind:value={$formData.displayName} />
		</Form.Control>
		<Form.Description>
			This is the name that will be displayed on the left sidebar of the <code>/add</code> page.
		</Form.Description>
	</Form.Field>

	<Form.Field {form} name="group">
		<Form.Control let:attrs>
			<Form.Label class="flex flex-row items-center gap-6">
				Group
				<Form.FieldErrors />
			</Form.Label>
			<Input {...attrs} bind:value={$formData.group} />
		</Form.Control>
		<Form.Description>
			This is the "category" that the family will appear in, on the left sidebar of the
			<code>/add</code> page.
		</Form.Description>
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
		<Form.Description>The image that this family will appear with</Form.Description>
	</Form.Field>

	<Form.Field {form} name="visible" class="mt-6 flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox {...attrs} bind:checked={$formData.visible} />
			<div class="space-y-1 leading-none">
				<Form.Label>This family is visible on the left sidebar</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.visible} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="isLed" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox {...attrs} bind:checked={$formData.isLed} disabled={$formData.hasModel} />
			<div class="space-y-1 leading-none">
				<Form.Label>This family is composed of LEDs</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.isLed} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="hasModel" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.hasModel}
				onchange={() => {
					if (!$formData.hasModel) {
						$formData.needsColorConfig = false;
						$formData.needsCurveConfig = false;
						$formData.needsLengthConfig = false;
						$formData.needsTemperatureConfig = false;
					}
				}}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family have a 2D/3D model</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.hasModel} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="needsColorConfig" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.needsColorConfig}
				disabled={!$formData.hasModel}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family can have more than one finish</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.needsColorConfig} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="needsCurveConfig" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.needsCurveConfig}
				disabled={!$formData.hasModel}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family can be selected based on their curvature</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.needsCurveConfig} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="needsLengthConfig" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.needsLengthConfig}
				disabled={!$formData.hasModel}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family can be selected based on their length</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.needsLengthConfig} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="arbitraryLength" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.arbitraryLength}
				disabled={!$formData.needsLengthConfig && !$formData.hasModel}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family can be cut to arbitrary lengths</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.arbitraryLength} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field
		{form}
		name="needsTemperatureConfig"
		class="flex flex-row items-start space-x-3 space-y-0"
	>
		<Form.Control let:attrs>
			<Checkbox
				{...attrs}
				bind:checked={$formData.needsTemperatureConfig}
				disabled={!$formData.hasModel}
			/>
			<div class="space-y-1 leading-none">
				<Form.Label>Items in this family have a temperature configuration</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.needsTemperatureConfig} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="needsLedConfig" class="flex flex-row items-start space-x-3 space-y-0">
		<Form.Control let:attrs>
			<Checkbox {...attrs} bind:checked={$formData.needsLedConfig} disabled={!$formData.hasModel} />
			<div class="space-y-1 leading-none">
				<Form.Label>This family can have a LED strip attached.</Form.Label>
			</div>
			<input name={attrs.name} value={$formData.needsLedConfig} hidden />
		</Form.Control>
	</Form.Field>

	<Form.Field {form} name="ledFamily">
		<Form.Control let:attrs>
			<Form.Label class="flex flex-row items-center gap-6">
				Code of the LED family
				<Form.FieldErrors />
			</Form.Label>
			<Input
				type="text"
				{...attrs}
				bind:value={$formData.ledFamily}
				disabled={!$formData.needsLedConfig}
			/>
		</Form.Control>
	</Form.Field>

	<Button type="submit">Submit</Button>
</form>
