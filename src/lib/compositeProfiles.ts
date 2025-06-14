// src/lib/compositeProfiles.ts

import type { Renderer } from './renderer/renderer';
import type { TemporaryObject } from './renderer/objects';
import { Vector3 } from 'three'; // AGGIUNTO per il posizionamento

export interface ProfileSegment {
    code: string;
    length: number;
    count: number;
}

export interface CompositeProfileConfig {
    segments: ProfileSegment[];
    totalLength: number;
    baseCode: string; // XNR01L o XNS01L
}

/**
 * Calcola la composizione ottimale di pezzetti per una lunghezza personalizzata
 */
export function calculateProfileComposition(baseCode: string, targetLength: number): CompositeProfileConfig {
    console.log(`🧮 Calcolando composizione per ${baseCode} lunghezza ${targetLength}mm`);
    
    const segments: ProfileSegment[] = [];
    let remainingLength = targetLength;

    // Pezzi disponibili in ordine di priorità (dal più grande al più piccolo)
    const availablePieces = [
        { code: baseCode, length: 2500 },           // Pezzo originale
        { code: `${baseCode}_500`, length: 500 },   // Pezzetto da 500mm
        { code: `${baseCode}_100`, length: 100 },   // Pezzetto da 100mm
    ];

    // Algoritmo greedy: usa prima i pezzi più grandi
    for (const piece of availablePieces) {
        if (remainingLength >= piece.length) {
            const count = Math.floor(remainingLength / piece.length);
            if (count > 0) {
                segments.push({
                    code: piece.code,
                    length: piece.length,
                    count: count
                });
                remainingLength -= count * piece.length;
                console.log(`  - ${count}x ${piece.code} (${piece.length}mm)`);
            }
        }
    }

    if (remainingLength > 0) {
        console.warn(`⚠️ Rimangono ${remainingLength}mm non coperti!`);
    }

    const result = {
        segments,
        totalLength: targetLength,
        baseCode
    };

    console.log(`✅ Composizione calcolata:`, result);
    return result;
}

/**
 * Crea un profilo composito nella scena del renderer
 */
export async function createCompositeProfile(
    renderer: Renderer, 
    config: CompositeProfileConfig
): Promise<TemporaryObject[]> {
    console.log(`🏗️ Creando profilo composito per ${config.baseCode}`);
    
    const objects: TemporaryObject[] = [];
    let currentPositionX = 0; // Posizione corrente lungo l'asse X (in mm)

    // Crea tutti i pezzetti senza collegarli
    for (const segment of config.segments) {
        for (let i = 0; i < segment.count; i++) {
            console.log(`  - Aggiungendo ${segment.code} alla posizione ${currentPositionX}mm`);
            
            const obj = await renderer.addObject(segment.code);
            objects.push(obj);

            // Posiziona il pezzetto lungo l'asse X
            if (obj.mesh) {
                // Converti da mm a unità 3D (assumendo 1 unità = 1mm)
                obj.mesh.position.x = currentPositionX / 100; // Dividi per 100 per scale appropriata
                obj.mesh.position.y = 0;
                obj.mesh.position.z = 0;
            }

            currentPositionX += segment.length;
        }
    }

    console.log(`📍 Posizionati ${objects.length} pezzetti`);

    // APPROCCIO SEMPLIFICATO: Non collegare i pezzetti, solo nascondere le giunzioni
    // Questo evita tutti i conflitti di giunzioni
    hideIntermediateJunctions(objects);

    console.log(`✅ Profilo composito creato con ${objects.length} pezzetti (lunghezza totale: ${currentPositionX}mm)`);
    return objects;
}

/**
 * Nasconde le giunzioni intermedie di un profilo composito
 */
function hideIntermediateJunctions(objects: TemporaryObject[]) {
    console.log(`🙈 Nascondendo giunzioni intermedie per ${objects.length} oggetti...`);
    
    if (objects.length <= 1) {
        console.log(`  - Solo ${objects.length} oggetto/i, nessuna giunzione da nascondere`);
        return;
    }

    // Per tutti gli oggetti tranne il primo e l'ultimo, rimuovi tutte le giunzioni
    for (let i = 1; i < objects.length - 1; i++) {
        const obj = objects[i];
        const catalogEntry = obj.getCatalogEntry();
        
        console.log(`  - Nascondendo giunzioni per oggetto intermedio ${i} (${catalogEntry.code})`);
        
        // Crea una copia dell'entry del catalogo con giunzioni vuote
        const modifiedEntry = {
            ...catalogEntry,
            juncts: [], // Rimuove tutte le giunzioni
            line_juncts: [] // Rimuove tutte le line junctions
        };
        
        obj.setCatalogEntry(modifiedEntry);
    }

    // Per il primo oggetto, mantieni solo la junction di sinistra (index 0)
    if (objects.length > 0) {
        const firstObj = objects[0];
        const firstEntry = firstObj.getCatalogEntry();
        
        console.log(`  - Primo oggetto (${firstEntry.code}): mantenendo solo junction sinistra`);
        
        if (firstEntry.juncts.length > 1) {
            const modifiedFirstEntry = {
                ...firstEntry,
                juncts: [firstEntry.juncts[0]], // Solo la prima junction (sinistra)
                line_juncts: firstEntry.line_juncts // Mantieni le line junctions se ci sono
            };
            firstObj.setCatalogEntry(modifiedFirstEntry);
        } else if (firstEntry.juncts.length === 1) {
            console.log(`    - Primo oggetto ha solo 1 junction, mantieni così com'è`);
        } else {
            console.log(`    - Primo oggetto non ha junctions`);
        }
    }

    // Per l'ultimo oggetto, mantieni solo la junction di destra (index 1, o 0 se c'è solo quella)
    if (objects.length > 1) {
        const lastObj = objects[objects.length - 1];
        const lastEntry = lastObj.getCatalogEntry();
        
        console.log(`  - Ultimo oggetto (${lastEntry.code}): mantenendo solo junction destra`);
        
        if (lastEntry.juncts.length > 1) {
            const modifiedLastEntry = {
                ...lastEntry,
                juncts: [lastEntry.juncts[1]], // Solo la seconda junction (destra)
                line_juncts: lastEntry.line_juncts // Mantieni le line junctions se ci sono
            };
            lastObj.setCatalogEntry(modifiedLastEntry);
        } else if (lastEntry.juncts.length === 1) {
            // Se c'è solo una junction, mantienila (potrebbe essere la junction destra)
            console.log(`    - Ultimo oggetto ha solo 1 junction, mantieni così com'è`);
        } else {
            console.log(`    - Ultimo oggetto non ha junctions`);
        }
    }
    
    console.log(`✅ Gestione giunzioni completata`);
}

/**
 * Verifica se un codice profilo supporta la composizione
 */
export function isCompositeProfileSupported(code: string): boolean {
    const supportedBaseCodes = ['XNR01L', 'XNS01L'];
    return supportedBaseCodes.some(baseCode => code.startsWith(baseCode));
}

/**
 * Estrae il codice base da un codice profilo (es: XNR01L_500 -> XNR01L)
 */
export function extractBaseCode(code: string): string {
    const supportedBaseCodes = ['XNR01L', 'XNS01L'];
    for (const baseCode of supportedBaseCodes) {
        if (code.startsWith(baseCode)) {
            return baseCode;
        }
    }
    return code; // Fallback se non riconosciuto
}