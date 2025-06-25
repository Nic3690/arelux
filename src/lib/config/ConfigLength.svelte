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

    function handleSliderChange() {
        hasError = false;
        errorMessage = '';
        valueInvalid = false;
        
        const matchingItem = items.find(i => i.len === Number(valueLen));
        
        if (matchingItem) {
            value = matchingItem.code;
            isCustomLength = false;
            if (onsubmit) onsubmit(value, valueLen, false);
        } else {
            isCustomLength = true;
            value = items[0].code;
            
            if (onsubmit) {
                onsubmit(value, valueLen, true);
            }
        }
    }

    function handleCustomLength() {
        hasError = false;
        errorMessage = '';
        valueInvalid = false;
        
        if (!valueLen || valueLen <= 0) {
            valueInvalid = true;
            hasError = true;
            errorMessage = 'Inserire una lunghezza valida';
            return;
        }
        
        if (valueLen % 10 !== 0) {
            hasError = true;
            errorMessage = 'La lunghezza deve essere un multiplo di 10mm';
            valueInvalid = true;
            return;
        }
        
        if (valueLen > 2500) {
            hasError = true;
            errorMessage = 'La lunghezza massima è di 2500mm';
            valueInvalid = true;
            return;
        }
        
        if (valueLen < 10) {
            hasError = true;
            errorMessage = 'La lunghezza minima è di 10mm';
            valueInvalid = true;
            return;
        }
        
        const matchingItem = items.find(i => i.len === Number(valueLen));
        
        if (matchingItem) {
            value = matchingItem.code;
            isCustomLength = false;
            if (onsubmit) onsubmit(value, valueLen, false);
        } else {
            isCustomLength = true;
            value = items[0].code;
            
            if (onsubmit) {
                onsubmit(value, valueLen, true);
            }
        }
    }
</script>

<div class="flex flex-col rounded-md bg-box px-6 py-1">
    <div class="flex flex-col gap-2">
        <!-- Slider giallo con pallini cliccabili -->
        <div class="relative flex w-full items-center justify-center">
            <input
                bind:value={valueLen}
                type="range"
                min="10"
                max="2500"
                step="10"
                class="slider-yellow w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                oninput={handleSliderChange}
            />
            
            <!-- Pallini cliccabili per le lunghezze standard -->
            {#if items.length > 0}
                <div class="absolute top-0 w-full h-2 flex items-center">
                    {#each items as { code, len }, i}
                        {@const position = ((len - 10) / (2500 - 10)) * 100}
                        <button
                            class={cn(
                                'absolute w-2 h-2 rounded-full transform -translate-x-1.5 cursor-pointer transition-all hover:scale-110',
                                valueLen === len && !isCustomLength 
                                    ? 'bg-gray-400 scale-125 z-1' 
                                    : 'bg-gray-400 z-1'
                            )}
                            style="left: {position}%"
                            onclick={() => selectLength(code, len)}
                            title="{len}mm (standard)"
                            aria-label={`${len}mm`}
                        ></button>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Input manuale -->
        <div class="flex items-center justify-center">
            <input
                bind:value={valueLen}
                type="number"
                min="10"
                max="2500"
                step="10"
                class={cn(
                    'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent text-center',
                    (valueInvalid || hasError) && 'border-red-500',
                    isCustomLength && !hasError && 'border-primary',
                )}
                onblur={() => handleCustomLength()}
                onkeyup={(e) => {
                    if (e.key === 'Enter') handleCustomLength();
                }}
                oninput={() => {
                    // Reset errori quando l'utente sta digitando nell'input
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

<style>
    .slider-yellow {
        -webkit-appearance: none;
        appearance: none;
        background: #e5e7eb;
        outline: none;
        border-radius: 0.5rem;
    }

    .slider-yellow::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .slider-yellow::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fbbf24;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .slider-yellow::-webkit-slider-track {
        background: linear-gradient(to right, #fbbf24 0%, #fbbf24 100%);
        height: 8px;
        border-radius: 0.5rem;
    }

    .slider-yellow::-moz-range-track {
        background: linear-gradient(to right, #fbbf24 0%, #fbbf24 100%);
        height: 8px;
        border-radius: 0.5rem;
        border: none;
    }

    .slider-yellow::-webkit-slider-thumb:hover {
        background: #f59e0b;
        transform: scale(1.1);
        transition: all 0.2s ease;
    }

    .slider-yellow::-moz-range-thumb:hover {
        background: #f59e0b;
        transform: scale(1.1);
        transition: all 0.2s ease;
    }
</style>