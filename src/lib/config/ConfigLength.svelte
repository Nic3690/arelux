<script lang="ts">
    import { cn } from '$shad/utils';
    import _ from 'lodash';
    import type { Family } from '../../app';
    import { onMount } from 'svelte';
    import { calculateProfileComposition, isCompositeProfileSupported, extractBaseCode, type CompositeProfileConfig } from '$lib/compositeProfiles';

    type Props = {
        family: Family;
        value?: string;
        onsubmit?: (value: string, length: number, isCustom?: boolean, compositeConfig?: CompositeProfileConfig | null) => any;
    };

    let { family, value = $bindable(), onsubmit }: Props = $props();

    let valueInvalid = $state(false);
    let isCustomLength = $state(false);
    let valueLen = $state(2500);
    let items: { code: string; len: number }[] = $state([]);
    let debugInfo = $state("");
    let compositeConfig: CompositeProfileConfig | null = $state(null);
    let isCompositeProfile = $state(false);

    function debug(msg: string) {
        console.log(msg);
        debugInfo = msg;
    }

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
        isCompositeProfile = false;
        compositeConfig = null;
        valueInvalid = false;
        if (onsubmit) onsubmit(value, len, false);
    }

    function findClosestModelLength(customLength: number) {
        if (items.length === 0) return null;

        let closestItem = items[0];
        let minDiff = Math.abs(customLength - closestItem.len);
        
        for (let i = 1; i < items.length; i++) {
            const diff = Math.abs(customLength - items[i].len);
            if (diff < minDiff) {
                minDiff = diff;
                closestItem = items[i];
            }
        }
        
        debug(`Lunghezza personalizzata: ${customLength}mm, modello più vicino: ${closestItem.code} (${closestItem.len}mm)`);
        return closestItem;
    }
    
    function handleCustomLength() {
        if (!valueLen || valueLen <= 0) {
            valueInvalid = true;
            return;
        }
        
        const matchingItem = items.find(i => i.len === Number(valueLen));
        
        if (matchingItem) {
            // Lunghezza standard trovata
            value = matchingItem.code;
            isCustomLength = false;
            isCompositeProfile = false;
            compositeConfig = null;
            console.log('🔧 ConfigLength: lunghezza standard', { code: value, length: valueLen });
            if (onsubmit) onsubmit(value, valueLen, false);
        } else {
            // Lunghezza personalizzata
            isCustomLength = true;
            const closestModel = findClosestModelLength(valueLen);
            
            if (closestModel) {
                // Verifica se il profilo supporta la composizione
                if (isCompositeProfileSupported(closestModel.code)) {
                    const baseCode = extractBaseCode(closestModel.code);
                    compositeConfig = calculateProfileComposition(baseCode, valueLen);
                    isCompositeProfile = true;
                    value = baseCode; // Usa il codice base
                    
                    console.log('🔧 ConfigLength: profilo composito', { 
                        baseCode,
                        customLength: valueLen, 
                        composition: compositeConfig,
                        chiamandoOnsubmit: true
                    });
                } else {
                    // Profilo normale personalizzato
                    isCompositeProfile = false;
                    compositeConfig = null;
                    value = closestModel.code;
                    
                    console.log('🔧 ConfigLength: lunghezza personalizzata normale', { 
                        code: closestModel.code, 
                        customLength: valueLen, 
                        closestStandardLength: closestModel.len,
                        chiamandoOnsubmit: true
                    });
                }

                if (onsubmit) {
                    onsubmit(value, valueLen, true, compositeConfig);
                }
            }
        }
    }
</script>

<div class="flex flex-row items-center justify-center rounded-md bg-box px-6 py-1">
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
            min="1"
            class={cn(
                'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent',
                valueInvalid && 'border-red-500',
                isCustomLength && 'border-primary',
            )}
            onblur={() => handleCustomLength()}
            onkeyup={(e) => {
                if (e.key === 'Enter') handleCustomLength();
            }}
        />
        <span class="ml-0.5">mm</span>
    </div>
</div>