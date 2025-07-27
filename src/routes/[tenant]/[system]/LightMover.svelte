<script lang="ts">
    import { button } from '$lib';
    import { cn } from '$shad/utils';
    import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
    import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
    import LightbulbFilament from 'phosphor-svelte/lib/LightbulbFilament';
    import type { MouseEventHandler } from 'svelte/elements';
    import type { Renderer } from '$lib/renderer/renderer';
    import type { TemporaryObject } from '$lib/renderer/objects';
    import { _ } from 'svelte-i18n';

    let { 
        active = false,
        disabled = false,
        selectedLightId = null,
        position = 0.5,
        invertedControls = false,
        renderer = undefined as Renderer | undefined,
        selectedLight = null as TemporaryObject | null,
        onToggle = () => {},
        onMove = () => {},
        onPreview = () => {}
    } = $props();

    let isValidPosition = $state(true);
    let suggestedPosition = $state(position);

    $effect(() => {
        if (active && selectedLight && renderer) {
            const parentProfile = renderer.findParentProfileForLight(selectedLight);
            if (parentProfile) {
                isValidPosition = renderer.isValidLightPosition(parentProfile, selectedLight, position);
                
                if (!isValidPosition) {
                    suggestedPosition = renderer.findNearestValidLightPosition(parentProfile, selectedLight, position);
                }
            }
        }
    });

    $effect(() => {
        return () => {
            if (renderer) {
                renderer.clearLightPositionFeedback();
            }
        };
    });

    function handleMove(increment: number) {
        const adjustedIncrement = invertedControls ? -increment : increment;
        let newPosition = Math.max(0.01, Math.min(0.99, position + adjustedIncrement));
        
        onMove(newPosition);
    }

    function handleSliderChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const newPosition = parseFloat(input.value);
        position = newPosition;
    }

    function handleSliderMouseUp() {
        if (isValidPosition) {
            onMove(position);
        } else {
            if (selectedLight && renderer) {
                const parentProfile = renderer.findParentProfileForLight(selectedLight);
                if (parentProfile) {
                    const validPosition = renderer.findNearestValidLightPosition(parentProfile, selectedLight, position);
                    position = validPosition;
                    onMove(validPosition);
                }
            }
        }
    }

    function confirmPosition() {
        if (isValidPosition) {
            onMove(position);
        }
        onToggle();
    }
</script>

<div class="relative flex flex-col gap-2">
    {#if active && selectedLightId}
        <div class="absolute bottom-full mb-2 right-0 flex flex-col gap-2 rounded bg-box p-3 shadow-lg border min-w-64">
            <div class="flex items-center justify-center">
                <button 
                    onclick={() => handleMove(-0.05)}
                    disabled={position <= 0.01}
                    class={cn(
                        "flex h-8 w-8 items-center justify-center rounded bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 mr-2"
                    )}
                >
                    <ArrowLeft size={16} />
                </button>

                <div class="flex-1 mx-2">
                    <input
                        type="range"
                        min="0.01"
                        max="0.99"
                        step="0.01"
                        value={position}
                        oninput={handleSliderChange}
                        onmouseup={handleSliderMouseUp}
                        ontouchend={handleSliderMouseUp}
                        class={cn(
                            "w-full h-2 rounded-lg appearance-none cursor-pointer",
                            isValidPosition ? "bg-green-200" : "bg-red-200 invalid"
                        )}
                    />
                </div>

                <button 
                    onclick={() => handleMove(0.05)}
                    disabled={position >= 0.99}
                    class={cn(
                        "flex h-8 w-8 items-center justify-center rounded bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 ml-2"
                    )}
                >
                    <ArrowRight size={16} />
                </button>
            </div>

            <div class="text-center text-xs text-gray-500 mb-2">
                Posizione: {Math.round(position * 100)}%
            </div>
            
            {#if !isValidPosition}
                <div class="text-center">
                    <div class="text-sm text-red-600 mb-2">Posizione occupata</div>
                    <button 
                        onclick={confirmPosition}
                        disabled={!isValidPosition}
                        class={cn(button(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
                    >
                        Conferma posizione
                    </button>
                </div>
            {:else}
                <div class="text-center">
                    <div class="text-sm text-green-600 mb-2">Posizione libera</div>
                    <button 
                        onclick={confirmPosition}
                        class={cn(button())}
                    >
                        Conferma posizione
                    </button>
                </div>
            {/if}
        </div>
    {:else if active}
        <div class="absolute bottom-full mb-2 right-0 text-center px-3 py-2 bg-box rounded shadow-lg border min-w-64">
            Clicca su una luce per selezionarla e spostarla
        </div>
    {/if}

    <button 
        class={cn(
            button({ class: 'flex items-center justify-center gap-2' }),
            active && 'bg-yellow-300'
        )}
        onclick={onToggle as MouseEventHandler<HTMLButtonElement>}
        {disabled}
    >
        <LightbulbFilament size={20} />
        <span>{$_('lights.moveLight')}</span>
    </button>
</div>

<style>
    input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    input[type=range]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: background-color 0.2s;
    }
    
    input[type=range]::-ms-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    input[type=range]:not(.invalid)::-webkit-slider-thumb {
        background: #22c55e;
    }
    
    input[type=range]:not(.invalid)::-moz-range-thumb {
        background: #22c55e;
    }
    
    input[type=range]:not(.invalid)::-ms-thumb {
        background: #22c55e;
    }

    input[type=range].invalid::-webkit-slider-thumb {
        background: #ef4444;
    }
    
    input[type=range].invalid::-moz-range-thumb {
        background: #ef4444;
    }
    
    input[type=range].invalid::-ms-thumb {
        background: #ef4444;
    }
</style>