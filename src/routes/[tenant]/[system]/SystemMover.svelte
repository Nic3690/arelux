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
    import type { TemporaryObject } from '$lib/renderer/objects';
    import { _ } from 'svelte-i18n';

    let { 
        active = false,
        disabled = false,
        renderer = undefined as Renderer | undefined,
        selectedConfiguration = null as Set<TemporaryObject> | null,
        onToggle = () => {},
        onMove = () => {},
        onConfigurationSelected = (config: Set<TemporaryObject> | null) => {}
    } = $props();

    const MOVE_INCREMENT = 2.54;

    function hasVerticalProfiles(): boolean {
        if (!renderer || !selectedConfiguration) return false;
        
        // Controlla solo i profili nella configurazione selezionata
        const profiles = Array.from(selectedConfiguration).filter(obj => 
            obj.getCatalogEntry().line_juncts && obj.getCatalogEntry().line_juncts.length > 0 ||
            obj.getCatalogEntry().juncts && obj.getCatalogEntry().juncts.length >= 2
        );
        
        if (profiles.length === 0) return false;
        
        return profiles.every(obj => {
            const code = obj.getCatalogEntry().code.toLowerCase();

            let familyDisplayName = '';
            
            for (const family of Object.values(renderer.families)) {
                const familyItem = family.items.find(item => item.code === obj.getCatalogEntry().code);
                if (familyItem) {
                    familyDisplayName = family.displayName.toLowerCase();
                    break;
                }
            }
            
            return code.includes('verticale') || 
                   code.includes('vertical') ||
                   familyDisplayName.includes('verticale') ||
                   familyDisplayName.includes('vertical');
        });
    }

    function handleMove(direction: 'x+' | 'x-' | 'y+' | 'y-' | 'z+' | 'z-') {
        if (!renderer || !selectedConfiguration) return;

        let deltaX = 0, deltaY = 0, deltaZ = 0;

        switch (direction) {
            case 'x+': deltaX = MOVE_INCREMENT; break;
            case 'x-': deltaX = -MOVE_INCREMENT; break;
            case 'y+': deltaY = MOVE_INCREMENT; break;
            case 'y-': deltaY = -MOVE_INCREMENT; break;
            case 'z+': deltaZ = MOVE_INCREMENT; break;
            case 'z-': deltaZ = -MOVE_INCREMENT; break;
        }

        renderer.moveConfiguration(selectedConfiguration, deltaX, deltaY, deltaZ);
        onMove();
    }

    function centerInRoom() {
        if (!renderer || !selectedConfiguration) return;
        
        renderer.centerConfigurationInRoom(selectedConfiguration);

        onMove();

        toast.success('Configurazione centrata nella stanza');
    }

    function confirmAndClose() {
        onConfigurationSelected(null);
        onToggle();
    }
</script>

<div class="relative flex flex-col gap-2">
    {#if active && selectedConfiguration}
        <div class="absolute bottom-full mb-2 right-0 flex flex-col gap-3 rounded bg-box p-4 min-w-64 shadow-lg border">
            <div class="text-center">
                <div class="text-sm font-medium">Sposta Configurazione</div>
                <div class="text-xs text-gray-600">
                    {selectedConfiguration.size} oggetti connessi • Incrementi di 10cm
                </div>
            </div>

            <!-- Controlli movimento per assi -->
            <div class="flex flex-col gap-3">
                <!-- Asse X -->
                <div class="flex items-center gap-3">
                    <span class="w-6 font-bold text-center text-lg">X</span>
                    <button 
                        onclick={() => handleMove('x-')}
                        class="flex h-10 w-10 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta a sinistra (-10cm)"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <button 
                        onclick={() => handleMove('x+')}
                        class="flex h-10 w-10 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta a destra (+10cm)"
                    >
                        <ArrowRight size={18} />
                    </button>
                </div>

                <!-- Asse Y -->
                <div class="flex items-center gap-3">
                    <span class="w-6 font-bold text-center text-lg">Y</span>
                    <button 
                        onclick={() => handleMove('y+')}
                        disabled={!hasVerticalProfiles()}
                        class={cn(
                            "flex h-10 w-10 items-center justify-center rounded transition-colors",
                            hasVerticalProfiles() 
                                ? "bg-yellow-400 hover:bg-yellow-300" 
                                : "bg-gray-300 cursor-not-allowed opacity-50"
                        )}
                        title={hasVerticalProfiles() ? "Sposta in alto (+10cm)" : "Disponibile solo per profili verticali"}
                    >
                        <ArrowUp size={18} />
                    </button>
                    <button 
                        onclick={() => handleMove('y-')}
                        disabled={!hasVerticalProfiles()}
                        class={cn(
                            "flex h-10 w-10 items-center justify-center rounded transition-colors",
                            hasVerticalProfiles() 
                                ? "bg-yellow-400 hover:bg-yellow-300" 
                                : "bg-gray-300 cursor-not-allowed opacity-50"
                        )}
                        title={hasVerticalProfiles() ? "Sposta in basso (-10cm)" : "Disponibile solo per profili verticali"}
                    >
                        <ArrowDown size={18} />
                    </button>
                </div>

                <!-- Asse Z -->
                <div class="flex items-center gap-3">
                    <span class="w-6 font-bold text-center text-lg">Z</span>
                    <button 
                        onclick={() => handleMove('z-')}
                        class="flex h-10 w-10 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta indietro (-10cm)"
                    >
                        <ArrowUp size={18} />
                    </button>
                    <button 
                        onclick={() => handleMove('z+')}
                        class="flex h-10 w-10 items-center justify-center rounded bg-yellow-400 hover:bg-yellow-300 transition-colors"
                        title="Sposta avanti (+10cm)"
                    >
                        <ArrowDown size={18} />
                    </button>
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <button 
                    onclick={centerInRoom}
                    class={cn(button({ color: 'secondary' }), 'w-full flex items-center justify-center gap-2')}
                    title="Centra la configurazione nella stanza virtuale"
                >
                    <House size={16} />
                    <span>Centra in Stanza</span>
                </button>
                
                <button 
                    onclick={confirmAndClose}
                    class={cn(button(), 'w-full flex items-center justify-center gap-2')}
                    title="Conferma la posizione attuale e chiudi"
                >
                    <Check size={16} />
                    <span>Conferma</span>
                </button>
            </div>
        </div>
    {:else if active}
        <div class="absolute bottom-full mb-2 right-0 text-center px-3 py-2 bg-box rounded shadow-lg border min-w-64">
            Clicca su un oggetto per selezionare la configurazione da spostare
        </div>
    {/if}

    <button 
        class={cn(
            button({ class: 'flex items-center justify-center gap-2' }),
            active && 'bg-yellow-300'
        )}
        onclick={onToggle as MouseEventHandler<HTMLButtonElement>}
        {disabled}
        title={active ? 'Disattiva modalità sposta configurazione' : 'Attiva modalità sposta configurazione'}
    >
        <ArrowsOutCardinal size={20} />
        <span>{$_('system.moveSystem')}</span>
    </button>
</div>