<script lang="ts">
	import { page } from '$app/state';

	/**
	 * Se true, il logo sarà posizionato in cima alla pagina.
	 * Se false, il logo sarà posizionato in fondo alla pagina.
	 * @default true
	 */
	export let top: boolean = true;
	
	/**
	 * URL alternativo per il logo (opzionale)
	 * Se non specificato, verrà utilizzato il logo del tenant corrente
	 */
	export let customUrl: string | null = null;
	
	/**
	 * Altezza massima del logo in pixel
	 * @default 50
	 */
	export let maxHeight: number = 50;

	// Ottieni l'URL del logo dal tenant corrente o utilizza l'URL personalizzato
	$: logoUrl = customUrl || page.data.supabase.storage
		.from(page.data.tenant)
		.getPublicUrl(`${page.data.tenant}.png`).data.publicUrl;
		
	$: altText = `Logo ${page.data.tenant}`;
	
	// Gestione dello stile in base alla posizione
	$: position = top ? 'top: 20px' : 'bottom: 20px';
	
	// Flag per tracciare se c'è stato un errore di caricamento
	let imageError = false;
	
	// Gestione dell'errore di caricamento dell'immagine
	function handleImageError(event: Event) {
		imageError = true;
		
		// Cast dell'elemento target a HTMLImageElement
		const img = event.target as HTMLImageElement;
		img.src = '/fallback-logo.png';
	}
</script>

<div
	class="logo-container"
	style="left: 300px; right: 300px; {position};"
>
	{#if logoUrl}
		<img 
			src={logoUrl} 
			style="max-height: {maxHeight}px;" 
			alt={altText} 
			loading="lazy"
			on:error={handleImageError}
		/>
	{:else if imageError}
		<img 
			src="/fallback-logo.png" 
			style="max-height: {maxHeight}px;" 
			alt={altText} 
			loading="lazy"
		/>
	{:else}
		<div class="logo-placeholder" style="height: {maxHeight}px;">
			{altText}
		</div>
	{/if}
</div>

<style>
	.logo-container {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}
	
	.logo-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #f0f0f0;
		border-radius: 4px;
		padding: 0 20px;
		color: #666;
		font-style: italic;
	}
	
	/* Media query per schermi più piccoli */
	@media (max-width: 768px) {
		.logo-container {
			left: 50px;
			right: 50px;
		}
	}
</style>