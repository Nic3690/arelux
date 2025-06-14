<script lang="ts">
    import { cn } from '$shad/utils';
    import _ from 'lodash';
    import type { Family } from '../../app';
    import { onMount } from 'svelte';

    type Props = {
        family: Family;
        value?: string;
        onsubmit?: (value: string, length: number, isCustom?: boolean) => any;
    };

    let { family, value = $bindable(), onsubmit }: Props = $props();

    let valueInvalid = $state(false);
    let isCustomLength = $state(false);
    let valueLen = $state(2500);
    let items: { code: string; len: number }[] = $state([]);
    
    // Nuovi stati per i messaggi di errore
    let errorMessage = $state('');
    let hasError = $state(false);

    onMount(() => {
        const validItems = family.items
            .filter(i => i.len > 0 && i.len !== undefined)
            .map(i => ({ code: i.code, len: i.len }));

        items = _.uniqWith(
            validItems.sort((a, b) => a.len - b.len),
            (a, b) => a.len === b.len
        );

        if (items.length > 0) {
            valueLen = items[0].len;
            value = items[0].code;
        }
    });

    function selectLength(code: string, len: number) {
        value = code;
        valueLen = len;
        isCustomLength = false;
        valueInvalid = false;
        hasError = false;
        errorMessage = '';
        if (onsubmit) onsubmit(value, len, false);
    }

    function handleCustomLength() {
        // Reset errori
        hasError = false;
        errorMessage = '';
        valueInvalid = false;
        
        if (!valueLen || valueLen <= 0) {
            valueInvalid = true;
            hasError = true;
            errorMessage = 'Inserire una lunghezza valida';
            return;
        }
        
        // Validazione: solo multipli di 10mm
        if (valueLen % 10 !== 0) {
            hasError = true;
            errorMessage = 'La lunghezza deve essere un multiplo di 10mm';
            valueInvalid = true;
            return;
        }
        
        // Validazione: massimo 2500mm
        if (valueLen > 2500) {
            hasError = true;
            errorMessage = 'La lunghezza massima è di 2500mm';
            valueInvalid = true;
            return;
        }
        
        const matchingItem = items.find(i => i.len === Number(valueLen));
        
        if (matchingItem) {
            // Lunghezza standard trovata
            value = matchingItem.code;
            isCustomLength = false;
            console.log('🔧 ConfigLength: lunghezza standard', { code: value, length: valueLen });
            if (onsubmit) onsubmit(value, valueLen, false);
        } else {
            // Lunghezza personalizzata - usa il primo item della famiglia come base
            isCustomLength = true;
            value = items[0].code;
            
            console.log('🔧 ConfigLength: lunghezza personalizzata con scaling', { 
                baseCode: value, 
                customLength: valueLen, 
                standardLength: items[0].len
            });
            
            if (onsubmit) {
                onsubmit(value, valueLen, true);
            }
        }
    }
</script>

<div class="flex flex-col rounded-md bg-box px-6 py-1">
    <div class="flex flex-row items-center justify-center">
        <!-- Barra grafica con i pallini selezionabili -->
        <div class="relative flex w-full items-center justify-center">
            <svg height="20" width="120" viewBox="0 0 100 20">
                <line x1="5" y1="10" x2="95" y2="10" stroke-width="1.5" class="stroke-primary" />
                
                {#if items.length > 0}
                    {#each items as { code, len }, i}
                        {@const position = items.length > 1 
                            ? 5 + (i * 90 / (items.length - 1))
                            : 50}
                        
                        <circle
                            cx={position}
                            cy="10"
                            r={valueLen === len && !isCustomLength ? 7 : 5}
                            class={cn(
                                'cursor-pointer fill-primary stroke-primary', 
                                valueLen === len && !isCustomLength && 'brightness-95'
                            )}
                            role="button"
                            tabindex={i + 1}
                            aria-label={`${len}mm`}
                            onclick={() => selectLength(code, len)}
                            onkeyup={(e) => (e.key === ' ' || e.key === 'Enter') && selectLength(code, len)}
                        />
                    {/each}
                {/if}
            </svg>
        </div>

        <!-- Input manuale -->
        <div class="mt-2 flex items-center">
            <input
                bind:value={valueLen}
                type="number"
                min="10"
                max="2500"
                step="10"
                class={cn(
                    'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent',
                    (valueInvalid || hasError) && 'border-red-500',
                    isCustomLength && !hasError && 'border-primary',
                )}
                onblur={() => handleCustomLength()}
                onkeyup={(e) => {
                    if (e.key === 'Enter') handleCustomLength();
                }}
                oninput={() => {
                    // Reset errori quando l'utente sta digitando
                    if (hasError) {
                        hasError = false;
                        errorMessage = '';
                        valueInvalid = false;
                    }
                }}
            />
            <span class="ml-0.5">mm</span>
        </div>
    </div>
    
    <!-- Messaggi di errore -->
    {#if hasError && errorMessage}
        <div class="mt-1 text-xs text-red-500">
            {errorMessage}
        </div>
    {/if}
</div>