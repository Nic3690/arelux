<script lang="ts">
	import { page } from '$app/state';

	/**
	 * Se true, il logo sarà posizionato in cima alla pagina.
	 * Se false, il logo sarà posizionato in fondo alla pagina.
	 * @default true
	 */
	export let top: boolean = true;

	// Ottieni l'URL del logo dal tenant corrente
	const logoUrl = page.data.supabase.storage
		.from(page.data.tenant)
		.getPublicUrl(`${page.data.tenant}.png`).data.publicUrl;
</script>

<div
	class="absolute flex items-center justify-center"
	style="left: 300px; right: 300px; {top ? 'top' : 'bottom'}: 20px;"
>
	<img 
		src={logoUrl} 
		style="max-height: 50px;" 
		alt="Logo {page.data.tenant}" 
		loading="lazy"
	/>
</div>