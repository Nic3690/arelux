<script lang="ts">
	import type { PageData } from './$types';
	import { Table, TableBody, TableCell, TableRow } from '$shad/ui/table';
	import TableHeader from '$shad/ui/table/table-header.svelte';
	import TableHead from '$shad/ui/table/table-head.svelte';
	import { Button } from '$shad/ui/button';
	import { goto } from '$app/navigation';
	import { deleteFamily, deleteObject } from '$lib/admin';
	import { selectedSystem } from '$lib';

	export let data: PageData;
</script>

<div class="flex flex-col items-center pb-6">
	<h1 class="py-10 text-center text-4xl">
		{data.tenant} | {$selectedSystem}
	</h1>
	<div>
		<Button class="w-min" href="/{data.tenant}/admin/add">Add new object</Button>
		<Button class="w-min" href="/{data.tenant}/admin/familyadd">Add new family</Button>
		<Button class="w-min" href="/{data.tenant}/admin/systemadd">Add new system</Button>
		<Button class="w-min" href="/{data.tenant}/admin/systemselect">Select another system</Button>
	</div>
</div>

<h2 class="text-center">Items</h2>

<Table class="container">
	<TableHeader>
		<TableRow>
			<TableHead>Code</TableHead>
			<TableHead>Power impact</TableHead>
			<TableHead class="pr-6 text-right">Actions</TableHead>
		</TableRow>
	</TableHeader>

	<TableBody>
		{#each Object.values(data.catalog)
			.filter((obj) => obj.system === $selectedSystem)
			.toSorted((obj1, obj2) => obj1.code.localeCompare(obj2.code)) as obj}
			<TableRow>
				<TableCell>{obj.code}</TableCell>
				<TableCell>{obj.power}W</TableCell>
				<TableCell class="text-right">
					<Button
						variant="outline"
						class="mr-6"
						on:click={() => {
							goto(`/${data.tenant}/admin/add`, {
								state: { editing: obj.code } as App.PageState,
							});
						}}
					>
						Edit
					</Button>
					<Button variant="destructive" on:click={() => deleteObject(data.tenant, obj.code)}>
						Delete
					</Button>
				</TableCell>
			</TableRow>
		{/each}
	</TableBody>
</Table>

<h2 class="mt-10 text-center">Families</h2>

<Table class="container mb-10">
	<TableHeader>
		<TableRow>
			<TableHead>Code</TableHead>
			<TableHead>Displayed name</TableHead>
			<TableHead>Group</TableHead>
			<TableHead class="pr-6 text-right">Actions</TableHead>
		</TableRow>
	</TableHeader>

	<TableBody>
		{#each Object.values(data.families)
			.filter((obj) => obj.system === $selectedSystem)
			.toSorted((obj1, obj2) => obj1.code.localeCompare(obj2.code)) as obj}
			<TableRow>
				<TableCell>{obj.code}</TableCell>
				<TableCell>{obj.displayName}</TableCell>
				<TableCell>{obj.group}</TableCell>
				<TableCell class="text-right">
					<Button
						variant="outline"
						class="mr-6"
						on:click={() => {
							goto(`/${data.tenant}/admin/familyadd`, {
								state: { editing: obj.code } as App.PageState,
							});
						}}
					>
						Edit
					</Button>
					<Button variant="destructive" on:click={() => deleteFamily(data.tenant, obj.code)}>
						Delete
					</Button>
				</TableCell>
			</TableRow>
		{/each}
	</TableBody>
</Table>
