<script lang="ts">
	import Check from 'lucide-svelte/icons/check';
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down';
	import { onMount, onDestroy, tick } from 'svelte';
	import * as Command from '$shad/ui/command';
	import * as Popover from '$shad/ui/popover';
	import { cn } from '$shad/utils.js';
	import { Separator } from '$shad/ui/separator';
	import ModelInput from './ModelInput.svelte';
	import { Button } from '$shad/ui/button';
	import { toast } from 'svelte-sonner';
	import Input from '$shad/ui/input/input.svelte';
	import { Label } from '$shad/ui/label';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Trash from 'phosphor-svelte/lib/Trash';
	import type { Vector3Like } from 'three';
	import { selectedSystem } from '$lib';
	import type { Renderer } from '$lib/renderer/renderer';
	import type { TemporaryObject } from '$lib/renderer/objects';

	export let renderer: Renderer;

	let code: string;
	let power: number;
	let modelInput: ModelInput;
	let simplifiedModelInput: ModelInput;
	let imageInput: HTMLInputElement;
	let chosenFamily: string | undefined;
	let familyInputOpen: boolean = false;
	let len: number | undefined;
	let color: string | undefined;
	let angle: number | undefined;
	let radius: number | undefined;
	let temperature: number | undefined;
	let desc1: string;
	let desc2: string;
	let price: number;
	let isLed: boolean = false;
	let isEditMode: boolean = false;
	let profileObject: TemporaryObject | undefined;
	
	$: isLed = chosenFamily !== undefined && page.data.families[chosenFamily]?.isLed;

	let junctions: {
		x: number;
		y: number;
		z: number;
		angle: number;
		group: string;
	}[] = [];

	let lineJunctions: {
		point1: Vector3Like;
		point2: Vector3Like;
		pointC: Vector3Like;
		group: string;
	}[] = [];

	if (page.state.editing !== undefined) {
		isEditMode = true;
		const item = page.data.catalog[page.state.editing];
		code = item.code;
		power = item.power;
		price = item.price_cents / 100;
		junctions = item.juncts.map((x) => ({ ...x, groups_open: false, can_connect_open: false }));
		lineJunctions = item.line_juncts.map((x) => ({
			...x,
			groups_open: false,
			can_connect_open: false,
		}));

		for (const [familyCode, family] of Object.entries(page.data.families)) {
			if (family.items.some(item => item.code === code)) {
				chosenFamily = familyCode;

				const familyItem = family.items.find(item => item.code === code);
				if (familyItem) {
					desc1 = familyItem.desc1;
					desc2 = familyItem.desc2;
					color = familyItem.color;
					len = familyItem.len;
					angle = familyItem.deg;
					radius = familyItem.radius;
				}
				break;
			}
		}
	}

	onMount(async () => {
		renderer.handles.setVisible(true);
		renderer.handles.clear();

		// 🔧 NUOVO: Carica la mesh del profilo se in modalità editing
		if (isEditMode && code) {
			try {
				profileObject = await renderer.addObject(code);
				renderer.frameObject(profileObject);
			} catch (error) {
				console.warn('⚠️ Impossibile caricare il modello:', code, error);
			}
		}

		for (let i = 0; i < junctions.length; i++) {
			renderer.handles.createTemporaryHandle();
			renderer.handles.createAngle();
			updateHandle(i);
		}

		for (const j of lineJunctions) {
			renderer.handles.createCurve(j.point1, j.pointC, j.point2);
		}
	});

	// 🔧 NUOVO: Cleanup quando si esce dalla pagina
	onDestroy(() => {
		if (profileObject) {
			renderer.removeObject(profileObject);
			profileObject = undefined;
		}
	});

	async function onSubmit() {
		const supabase = page.data.supabase;
		const tenant = page.data.tenant;
		let image = (imageInput?.files ?? [])[0];

		if (code === undefined || code.trim() === '')
			return toast.error("The `code` field can't be empty");
		
		if (power === null || power === undefined)
			return toast.error("The `power` field can't be empty");

		if (junctions.length > 0) {
			if (junctions.some((j) => j.angle === null || j.angle === undefined))
				return toast.error("The `angle` field can't be empty");
			
			for (const j of junctions)
				if (j.x === null || j.y === null || j.z === null)
					return toast.error("The `position` field can't be empty");
		}

		if (lineJunctions.length > 0) {
			for (const j of lineJunctions)
				for (const p of [j.point1, j.pointC, j.point2])
					if (p.x === null || p.y === null || p.z === null)
						return toast.error("The `position` field can't be empty");
		}

		if (!isEditMode) {
			if (image === undefined) 
				return toast.error('You need to choose an image file');
			
			if (chosenFamily === undefined) 
				return toast.error('You must choose a family');
			
			if (desc1 === undefined || desc1.trim() === '')
				return toast.error("The `description` field can't be empty");
			
			if (!isLed && (desc2 === undefined || desc2.trim() === ''))
				return toast.error("The `description` field can't be empty");
		} else {
			if (chosenFamily !== undefined) {
				if (desc1 !== undefined && desc1.trim() === '')
					return toast.error("The `description` field can't be empty");
					
				if (!isLed && desc2 !== undefined && desc2.trim() === '')
					return toast.error("The `description` field can't be empty");
			}
		}

		try {
			if (image !== undefined) {
				await supabase.storage.from(tenant).upload(`images/${code}.webp`, image, { upsert: true });
			}

			if (chosenFamily && page.data.families[chosenFamily]?.hasModel) {
				try {
					const model = modelInput?.getFile?.() || null;
					const simplifiedModel = simplifiedModelInput?.getFile?.() || null;

					if (model instanceof File) {
						await supabase.storage.from(tenant).upload(`models/${code}.glb`, model, { upsert: true });
					}
					
					if (simplifiedModel instanceof File) {
						await supabase.storage.from(tenant).upload(`simple/${code}.glb`, simplifiedModel, { upsert: true });
					}
				} catch (error) {
					console.error("Error processing models:", error);
				}
			}

			await supabase
				.from('objects')
				.upsert({ code, tenant, power, system: $selectedSystem, price_cents: price * 100 })
				.throwOnError();

			await supabase
				.from('object_junctions')
				.delete()
				.eq('object_code', code)
				.eq('tenant', tenant)
				.throwOnError();

			await supabase
				.from('object_curve_junctions')
				.delete()
				.eq('object_code', code)
				.eq('tenant', tenant)
				.throwOnError();

			if (chosenFamily) {
				await supabase
					.from('family_objects')
					.upsert({
						familycode: chosenFamily,
						objectcode: code,
						tenant,
						angle,
						color,
						len,
						temperature,
						radius,
						desc1: desc1 || '',
						desc2: desc2 || '',
					})
					.throwOnError();
			}

			for (const j of junctions) {
				const junctId = await supabase
					.from('junctions')
					.insert({
						angle: j.angle,
						x: j.x,
						y: j.y,
						z: j.z,
					})
					.select('id')
					.single()
					.throwOnError();

				await supabase
					.from('object_junctions')
					.upsert({
						junction_id: junctId.data?.id ?? -1,
						object_code: code,
						groups: j.group,
						tenant,
					})
					.throwOnError();
			}

			for (const j of lineJunctions) {
				const junction1_id = await supabase
					.from('junctions')
					.insert({
						angle: -1,
						x: j.point1.x,
						y: j.point1.y,
						z: j.point1.z,
					})
					.select('id')
					.single()
					.throwOnError();
				const junction2_id = await supabase
					.from('junctions')
					.insert({
						angle: -1,
						x: j.point2.x,
						y: j.point2.y,
						z: j.point2.z,
					})
					.select('id')
					.single()
					.throwOnError();
				const junction_control_id = await supabase
					.from('junctions')
					.insert({
						angle: -1,
						x: j.pointC.x,
						y: j.pointC.y,
						z: j.pointC.z,
					})
					.select('id')
					.single()
					.throwOnError();

				await supabase.from('object_curve_junctions').upsert({
					object_code: code,
					tenant,
					groups: j.group,
					junction1_id: junction1_id.data?.id ?? -1,
					junction2_id: junction2_id.data?.id ?? -1,
					junction_control_id: junction_control_id.data?.id ?? -1,
				});
			}
		} catch (e) {
			toast.error('Failed to save object');
			console.error('Failed to save object:', e);
			return;
		}

		toast.success(isEditMode ? 'Object updated successfully' : 'Object inserted successfully');
		invalidateAll();
	}

	function updateHandle(i: number) {
		renderer.handles.setAngle(i, junctions[i].angle, junctions[i]);
		renderer.handles.moveHandle(i, junctions[i]);
	}

	function updateCurve(i: number) {
		renderer.handles.updateCurve(
			i,
			lineJunctions[i].point1,
			lineJunctions[i].pointC,
			lineJunctions[i].point2,
		);
	}
</script>

<div>
	<Label for="lamp-code">Code {isEditMode ? '(editing)' : ''}</Label>
	<Input type="text" id="lamp-code" bind:value={code} disabled={isEditMode} />
</div>

<!-- family popup -->
<div>
	<Label>Family {isEditMode && chosenFamily ? `(${page.data.families[chosenFamily]?.displayName})` : ''}</Label>
	<Popover.Root bind:open={familyInputOpen} let:ids>
		<Popover.Trigger asChild let:builder class="">
			<Button
				builders={[builder]}
				variant="outline"
				role="combobox"
				aria-expanded={familyInputOpen}
				class={cn(
					'col-span-6 w-full justify-between font-normal ',
					chosenFamily === undefined && 'text-gray-400',
				)}
			>
				{chosenFamily !== undefined
					? page.data.families[chosenFamily]?.displayName || 'Unknown family'
					: 'Choose a family...'}
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-[300px] p-0">
			<Command.Root>
				<Command.Empty>No family found</Command.Empty>
				<Command.Group>
					{#each Object.values(page.data.families).filter((fam) => fam.system === $selectedSystem) as fam}
						<Command.Item
							value={fam.code}
							onSelect={(newValue: string) => {
								if (newValue === chosenFamily) {
									chosenFamily = undefined;
								} else {
									chosenFamily = newValue;
								}

								familyInputOpen = false;
								tick().then(() => {
									document.getElementById(ids.trigger)?.focus();
								});
							}}
						>
							<Check class={cn('mr-2 h-4 w-4', fam.code !== chosenFamily && 'text-transparent')} />
							<span>
								{fam.displayName}
								<br />
								<span class="text-ellipsis text-sm text-muted-foreground">{fam.code}</span>
							</span>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
</div>

<div>
	<Label for="price-input">Price</Label>
	<Input type="number" id="price-input" bind:value={price} />
</div>

<div>
	<Label>Description {!isLed ? '(two rows)' : ''}</Label>
	<Input type="text" bind:value={desc1} />
	{#if !isLed}
		<Input type="text" bind:value={desc2} class="mt-1" />
	{/if}
</div>

<div>
	<Label for="image">Image {isEditMode ? '(only required for new objects)' : ''}</Label>
	<Input
		type="file"
		id="image"
		bind:el={imageInput}
		class="cursor-pointer transition-colors hover:bg-accent"
	/>
</div>

{#if chosenFamily && page.data.families[chosenFamily]?.hasModel}
	<ModelInput {renderer} idSupplement="lamp" bind:this={modelInput}>Model {isEditMode ? '(optional when editing)' : ''}</ModelInput>
	<ModelInput {renderer} idSupplement="simplified" bind:this={simplifiedModelInput}>
		Simplified model (optional)
	</ModelInput>
{/if}

<div>
	<Label>Power impact (watts{isLed ? '/m' : ''})</Label>
	<Input type="number" placeholder="0" bind:value={power} />
</div>

{#if chosenFamily !== undefined}
	{@const family = page.data.families[chosenFamily]}
	{#if family?.needsColorConfig}
		<div>
			<Label>Color</Label>
			<Input type="color" bind:value={color} />
		</div>
	{/if}
	{#if family?.needsLengthConfig}
		<div>
			<Label>Length (mm)</Label>
			<Input type="number" bind:value={len} />
		</div>
	{/if}
	{#if family?.needsTemperatureConfig}
		<div>
			<Label>Temperature (Kelvin)</Label>
			<Input type="number" bind:value={temperature} />
		</div>
	{/if}
	{#if family?.isLed}
		<div>
			<Label>Minimum length (mm)</Label>
			<Input type="number" bind:value={len} />
		</div>

		<div>
			<Label>Tolerance (mm)</Label>
			<Input type="number" bind:value={radius} placeholder="5mm" />
		</div>
	{/if}
	{#if family?.needsCurveConfig}
		<div>
			<Label>Angle (degrees)</Label>
			<Input type="number" bind:value={angle} />
		</div>

		<div>
			<Label>Radius (mm)</Label>
			<Input type="number" bind:value={radius} />
		</div>
	{/if}
{/if}

<!-- Junctions -->
<Separator class="mb-1 mt-1" />
<div class="flex w-full place-content-between items-center gap-4">
	<h2 class="text-xl">Junctions</h2>
	<Button
		variant="outline"
		onclick={() => {
			junctions = junctions.concat({
				x: null as unknown as number,
				y: null as unknown as number,
				z: null as unknown as number,
				angle: null as unknown as number,
				group: '',
			});
			renderer.handles.createTemporaryHandle();
			renderer.handles.createAngle();
		}}
		class="grow"
	>
		Add new
	</Button>
</div>
{#each junctions as j, i}
	<div class="grid grid-cols-6 gap-x-1 gap-y-3">
		<Input
			type="number"
			step="0.1"
			bind:value={junctions[i].x}
			oninput={() => updateHandle(i)}
			placeholder="x"
			class="col-span-2"
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={junctions[i].y}
			oninput={() => updateHandle(i)}
			placeholder="y"
			class="col-span-2"
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={junctions[i].z}
			oninput={() => updateHandle(i)}
			placeholder="z"
			class="col-span-2"
		/>

		<Input
			type="text"
			placeholder="Junction group"
			class="col-span-6"
			bind:value={junctions[i].group}
		/>

		<Input
			type="number"
			class="col-span-3"
			placeholder="Degrees"
			bind:value={j.angle}
			oninput={() => updateHandle(i)}
		></Input>
		<Button
			variant="destructive"
			class="col-span-3"
			onclick={() => {
				junctions = junctions.toSpliced(i, 1);
				renderer.handles.delete(i);
			}}
		>
			<Trash size={16} />
		</Button>

		<Separator class="col-span-3 mb-1 mt-2" />
	</div>
{/each}

<Separator class="mb-1 mt-1" />
<div class="flex w-full place-content-between items-center gap-4">
	<h2 class="text-xl">Line junctions</h2>
	<Button
		variant="outline"
		onclick={() => {
			const junct = {
				point1: { x: 0, y: 0, z: 0 },
				point2: { x: 0, y: 0, z: 0 },
				pointC: { x: 0, y: 0, z: 0 },
				group: '',
			};
			lineJunctions = lineJunctions.concat(junct);
			renderer.handles.createCurve(junct.point1, junct.pointC, junct.point2);
		}}
		class="grow"
	>
		Add new
	</Button>
</div>
{#each lineJunctions as j, i}
	<div class="grid grid-cols-6 gap-x-1 gap-y-3">
		<Label class="col-span-6">Position 1 (x, y, z)</Label>
		<Input
			type="number"
			step="0.1"
			placeholder="x"
			class="col-span-2"
			bind:value={lineJunctions[i].point1.x}
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			class="col-span-2"
			placeholder="y"
			bind:value={lineJunctions[i].point1.y}
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].point1.z}
			placeholder="z"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>

		<Label class="col-span-6">Control point (x, y, z)</Label>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].pointC.x}
			placeholder="x"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].pointC.y}
			placeholder="y"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].pointC.z}
			placeholder="z"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>

		<Label class="col-span-6">Position 2 (x, y, z)</Label>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].point2.x}
			placeholder="x"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].point2.y}
			placeholder="y"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>
		<Input
			type="number"
			step="0.1"
			bind:value={lineJunctions[i].point2.z}
			placeholder="z"
			class="col-span-2"
			oninput={() => updateCurve(i)}
		/>

		<Input
			type="text"
			placeholder="Junction group"
			class="col-span-6"
			bind:value={lineJunctions[i].group}
		/>

		<Button
			variant="destructive"
			class="col-span-6"
			onclick={() => {
				lineJunctions = lineJunctions.toSpliced(i, 1);
			}}
		>
			<Trash size={16} />
		</Button>

		<Separator class="col-span-6 mb-1 mt-2" />
	</div>
{/each}

<Button class="mt-3 w-full" onclick={onSubmit}>{isEditMode ? 'Update' : 'Submit'}</Button>