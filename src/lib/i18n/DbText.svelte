<script lang="ts">
    import { translateDatabaseText } from './dbTranslator';
    import { locale } from 'svelte-i18n';
    
    // Props del componente
    let { 
        text = '',
        fallback = '',
        class: className = '',
        element = 'span'
    }: {
        text: string;
        fallback?: string;
        class?: string;
        element?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    } = $props();
    
    // Store reattivo che si aggiorna automaticamente quando cambia la lingua
    let translatedText = $derived(text ? translateDatabaseText(text) : fallback);
</script>

{#if element === 'span'}
    <span class={className}>{translatedText}</span>
{:else if element === 'div'}
    <div class={className}>{translatedText}</div>
{:else if element === 'p'}
    <p class={className}>{translatedText}</p>
{:else if element === 'h1'}
    <h1 class={className}>{translatedText}</h1>
{:else if element === 'h2'}
    <h2 class={className}>{translatedText}</h2>
{:else if element === 'h3'}
    <h3 class={className}>{translatedText}</h3>
{:else if element === 'h4'}
    <h4 class={className}>{translatedText}</h4>
{:else if element === 'h5'}
    <h5 class={className}>{translatedText}</h5>
{:else if element === 'h6'}
    <h6 class={className}>{translatedText}</h6>
{/if}