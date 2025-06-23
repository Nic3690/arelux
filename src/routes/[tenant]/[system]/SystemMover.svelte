<script lang="ts">
    import { button } from '$lib';
    import { cn } from '$shad/utils';
    import ArrowUp from 'phosphor-svelte/lib/ArrowUp';
    import ArrowDown from 'phosphor-svelte/lib/ArrowDown';
    import ArrowLeft from 'phosphor-svelte/lib/ArrowLeft';
    import ArrowRight from 'phosphor-svelte/lib/ArrowRight';
    import ArrowsOutCardinal from 'phosphor-svelte/lib/ArrowsOutCardinal';
    import House from 'phosphor-svelte/lib/House';
    import type { MouseEventHandler } from 'svelte/elements';
    import type { Renderer } from '$lib/renderer/renderer';
    import { toast } from 'svelte-sonner';
	import { Check } from 'phosphor-svelte';

    let { 
        active = false,
        disabled = false,
        renderer = undefined as Renderer | undefined,
        onToggle = () => {},
        onMove = () => {}
    } = $props();

    const MOVE_INCREMENT = 2.54;

    function hasVerticalProfiles(): boolean {
        if (!renderer) return false;
        const profiles = renderer.getObjects().filter(obj => 
            obj.getCatalogEntry().line_juncts && obj.getCatalogEntry().line_juncts.length > 0
        );
        if (profiles.length === 0) return false;
        return profiles.every(obj => 
            obj.getCatalogEntry().code.toLowerCase().includes('verticale') ||
            obj.getCatalogEntry().code.toLowerCase().includes('vertical')
        );
    }

    function handleMove(direction: 'x+' | 'x-' | 'up' | 'down') {
        if (!renderer) return;

        let deltaX = 0, deltaY = 0, deltaZ = 0;
        const isVertical = hasVerticalProfiles();

        switch (direction) {
            case 'x+': deltaX = MOVE_INCREMENT; break;
            case 'x-': deltaX = -MOVE_INCREMENT; break;
            case 'up': 
                if (isVertical) {
                    deltaY = MOVE_INCREMENT;
                } else {
                    deltaZ = MOVE_INCREMENT;
                }
                break;
            case 'down':
                if (isVertical) {
                    deltaY = -MOVE_INCREMENT;
                } else {
                    deltaZ = -MOVE_INCREMENT;
                }
                break;
        }

        renderer.moveAllObjects(deltaX, deltaY, deltaZ);
        
        const directionNames = {
            'x+': 'destra',
            'x-': 'sinistra', 
            'up': isVertical ? 'alto' : 'avanti',
            'down': isVertical ? 'basso' : 'indietro'
        };
        
        toast.success(`Oggetti spostati di 10cm verso ${directionNames[direction]}`);
        onMove();
    }

    function centerInRoom() {
        if (!renderer) return;
        renderer.centerSystemInRoom();
        toast.success('Oggetti centrati nella stanza virtuale');
        onMove();
    }
</script>

<div class="relative flex flex-col gap-2">
    {#if active}
        <div class="absolute bottom-full mb-2 flex flex-col gap-3 rounded bg-box p-4 min-w-64 shadow-lg border">
            <div class="text-center">
                <div class="text-sm font-medium">Sposta Oggetti</div>
                <div class="text-xs text-gray-600">Incrementi di 10cm</div>
            </div>

            <!-- Griglia centrata con dimensioni fisse -->
            <div class="flex justify-center">
                <div class="grid grid-cols-3 gap-2 w-fit">
                    <div class="w-12 h-12"></div>
                    <button 
                        onclick={() => handleMove('up')}
                        class="flex h-12 w-12 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title={hasVerticalProfiles() ? "Sposta in alto (+10cm)" : "Sposta avanti (+10cm)"}
                    >
                        <ArrowUp size={20} />
                    </button>
                    <div class="w-12 h-12"></div>

                    <button 
                        onclick={() => handleMove('x-')}
                        class="flex h-12 w-12 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta a sinistra (+10cm)"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    
                    <div class="w-12 h-12"></div>
                    
                    <button 
                        onclick={() => handleMove('x+')}
                        class="flex h-12 w-12 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta a destra (+10cm)"
                    >
                        <ArrowRight size={20} />
                    </button>

                    <div class="w-12 h-12"></div>
                    <button 
                        onclick={() => handleMove('down')}
                        class="flex h-12 w-12 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title={hasVerticalProfiles() ? "Sposta in basso (+10cm)" : "Sposta indietro (+10cm)"}
                    >
                        <ArrowDown size={20} />
                    </button>
                    <div class="w-12 h-12"></div>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <button 
                    onclick={centerInRoom}
                    class={cn(button({ color: 'secondary' }), 'w-full flex items-center justify-center gap-2')}
                    title="Centra gli oggetti nella stanza virtuale"
                >
                    <House size={16} />
                    <span>Centra in Stanza</span>
                </button>
                
                <button 
                    onclick={() => {
                        toast.success('Posizione del sistema confermata');
                        onToggle();
                    }}
                    class={cn(button(), 'w-full flex items-center justify-center gap-2')}
                    title="Conferma la posizione attuale e chiudi"
                >
                    <Check size={16} />
                    <span>Conferma</span>
                </button>
            </div>
        </div>
    {/if}

    <button 
        class={cn(
            button({ class: 'flex items-center justify-center gap-2' }),
            active && 'bg-yellow-300'
        )}
        onclick={onToggle as MouseEventHandler<HTMLButtonElement>}
        {disabled}
        title={active ? 'Disattiva modalità sposta oggetti' : 'Attiva modalità sposta oggetti'}
    >
        <ArrowsOutCardinal size={20} />
        <span>Move Objects</span>
    </button>
</div>