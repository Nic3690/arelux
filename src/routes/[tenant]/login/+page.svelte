<script lang="ts">
	import { Button } from '$shad/ui/button';
	import * as Card from '$shad/ui/card/index';
	import { Input } from '$shad/ui/input';
	import { Label } from '$shad/ui/label';
	import { toast } from 'svelte-sonner';
	import { error } from '@sveltejs/kit';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let disabled = false;
	export let data: PageData;

	async function login() {
		const emailEl = document.getElementById('email') as HTMLInputElement;
		const passEl = document.getElementById('password') as HTMLInputElement;

		disabled = true;
		const { error: authError } = await data.supabase.auth.signInWithPassword({
			email: emailEl.value,
			password: passEl.value,
		});
		disabled = false;

		if (authError !== null) {
			if (authError.code === 'invalid_credentials') toast.error('Invalid credentials');
			else error(500, 'An error occurred');
		} else {
			goto(`/${data.tenant}/admin`);
		}
	}
</script>

<div class="flex h-dvh items-center justify-center">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Login</Card.Title>
			<Card.Description>Enter your email below to login to your account.</Card.Description>
		</Card.Header>
		<form on:submit={login}>
			<Card.Content class="grid gap-4">
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input id="email" type="email" placeholder="m@example.com" required />
				</div>
				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input id="password" type="password" required />
				</div>
			</Card.Content>
			<Card.Footer>
				<Button type="submit" class="w-full transition-all" bind:disabled>Sign in</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</div>
