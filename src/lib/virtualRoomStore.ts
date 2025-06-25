import { storable } from './storable';
import { browser } from '$app/environment';

function migrateLegacyDimensions() {
    if (!browser) return { width: 30, height: 30, depth: 30 };
    
    try {
        const newDimensions = localStorage.getItem('virtualRoomDimensions');
        if (newDimensions) {
            return JSON.parse(newDimensions);
        }

        const oldDimensions = localStorage.getItem('virtual_room_dimensions');
        if (oldDimensions) {
            const parsed = JSON.parse(oldDimensions);
            if (parsed.width > 0 && parsed.height > 0 && parsed.depth > 0) {
                localStorage.removeItem('virtual_room_dimensions');
                return parsed;
            }
        }
    } catch (e) {
        console.warn('Errore durante migrazione dimensioni stanza:', e);
    }
    
    return { width: 30, height: 30, depth: 30 };
}

export const virtualRoomVisible = storable('virtualRoomVisible', false);

export const virtualRoomDimensions = storable('virtualRoomDimensions', migrateLegacyDimensions());