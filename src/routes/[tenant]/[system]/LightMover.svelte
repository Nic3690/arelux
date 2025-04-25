<script lang="ts">
    import { button } from '$lib';
    import { cn } from '$shad/utils';
    import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
    import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
    import LightbulbFilament from 'phosphor-svelte/lib/LightbulbFilament';
    import type { MouseEventHandler } from 'svelte/elements';

    let { 
        active = false,
        disabled = false,
        selectedLightId = null,
        position = 0.5,
        invertedControls = false,
        onToggle = () => {},
        onMove = () => {}
    } = $props();

    function handleMove(increment: number) {
        const adjustedIncrement = invertedControls ? -increment : increment;
        const newPosition = Math.max(0.05, Math.min(0.95, position + adjustedIncrement));
        position = newPosition;
        onMove(newPosition);
    }

    function handleSliderChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const newPosition = parseFloat(input.value);
        position = newPosition;
        onMove(newPosition);
    }
</script>

<div class="flex flex-col gap-2">
    <button 
        class={cn(
            button({ class: 'flex items-center justify-center gap-2' }),
            active && 'bg-yellow-300'
        )}
        onclick={onToggle as MouseEventHandler<HTMLButtonElement>}
        {disabled}
    >
        <LightbulbFilament size={20} />
        <span>Move Lights</span>
    </button>

    {#if active && selectedLightId}
        <div class="flex items-center justify-center rounded bg-box p-3">
            <button 
                onclick={() => handleMove(-0.05)}
                disabled={position <= 0.05}
                class={cn(
                    "flex h-8 w-8 items-center justify-center rounded bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 mr-2"
                )}
            >
                <ArrowLeft size={16} />
            </button>

            <div class="flex-1 mx-2">
                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.01"
                    value={position}
                    oninput={handleSliderChange}
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <button 
                onclick={() => handleMove(0.05)}
                disabled={position >= 0.95}
                class={cn(
                    "flex h-8 w-8 items-center justify-center rounded bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 ml-2"
                )}
            >
                <ArrowRight size={16} />
            </button>
        </div>
    {:else if active}
        <div class="text-center px-3 py-2 bg-box rounded">
            Click on a light to select and move it
        </div>
    {/if}
</div>