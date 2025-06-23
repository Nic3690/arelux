import { storable } from './storable';
import { browser } from '$app/environment';

// Migrazione una tantum dalle vecchie dimensioni salvate
function migrateLegacyDimensions() {
    if (!browser) return { width: 30, height: 30, depth: 30 };
    
    try {
        // Controlla se ci sono già i nuovi valori
        const newDimensions = localStorage.getItem('virtualRoomDimensions');
        if (newDimensions) {
            // I nuovi valori esistono già, non serve migrare
            return JSON.parse(newDimensions);
        }
        
        // Controlla se ci sono le vecchie dimensioni
        const oldDimensions = localStorage.getItem('virtual_room_dimensions');
        if (oldDimensions) {
            const parsed = JSON.parse(oldDimensions);
            if (parsed.width > 0 && parsed.height > 0 && parsed.depth > 0) {
                console.log('🔄 Migrazione dimensioni stanza dal vecchio formato');
                // Rimuovi il vecchio formato dopo la migrazione
                localStorage.removeItem('virtual_room_dimensions');
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Errore durante migrazione dimensioni stanza:', e);
    }
    
    return { width: 30, height: 30, depth: 30 };
}

// Store per mantenere lo stato della stanza virtuale
export const virtualRoomVisible = storable('virtualRoomVisible', false);

// Store per le dimensioni della stanza virtuale con migrazione
export const virtualRoomDimensions = storable('virtualRoomDimensions', migrateLegacyDimensions());