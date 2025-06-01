<script lang="ts">
    import { cn } from '$shad/utils';
    
    type Props = { 
        standardLength?: number;
        value?: number;
        onsubmit?: (value: number) => any;
    };

    let { 
        standardLength = 2500,
        value = $bindable(standardLength), 
        onsubmit 
    }: Props = $props();

    let valueInvalid = $state(false);

    const fractionValues = [0.2, 0.4, 0.6, 0.8, 1.0].map(f => Math.round(standardLength * f));
    
    function selectFraction(length: number) {
        value = length;
        valueInvalid = false;
        if (onsubmit) onsubmit(value);
    }
</script>

<div class="flex items-center justify-center rounded bg-box px-6 py-1">
    <svg height="20" width="120" viewBox="0 0 100 20">
        <line x1="5" y1="10" x2="95" y2="10" stroke-width="1.5" class="stroke-primary" />
        {#each fractionValues as length, i}
            <circle
                cx={5 + (i * 90 / 4)}
                cy="10"
                r={Math.abs(value - length) < 10 ? 7 : 5}
                class={cn('fill-primary stroke-primary', 
                          Math.abs(value - length) < 10 && 'brightness-95')}
                role="button"
                tabindex={i + 1}
                aria-label="{length}mm"
                onclick={() => selectFraction(length)}
                onkeyup={(e) => (e.key === ' ' || e.key === 'Enter') && selectFraction(length)}
            />
        {/each}
    </svg>

    <input
        bind:value
        type="number"
        min="1"
        class={cn(
            'font-input w-16 appearance-none rounded-md border-2 border-black/40 bg-transparent',
            valueInvalid && 'border-red-500',
        )}
        oninput={() => (valueInvalid = false)}
        onblur={() => {
            if (value <= 0) {
                valueInvalid = true;
                return;
            }
            if (onsubmit) onsubmit(value);
        }}
        onkeyup={(e) => {
            if (e.key === 'Enter' && value > 0 && onsubmit) onsubmit(value);
        }}
    />
    <span class="ml-0.5">mm</span>
</div>