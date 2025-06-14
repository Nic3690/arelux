// // src/lib/compositeProfiles.ts

// import type { Renderer } from './renderer/renderer';
// import type { TemporaryObject } from './renderer/objects';
// import { Vector3 } from 'three'; // AGGIUNTO per il posizionamento

// export interface ProfileSegment {
//     code: string;
//     length: number;
//     count: number;
// }

// export interface CompositeProfileConfig {
//     segments: ProfileSegment[];
//     totalLength: number;
//     baseCode: string; // XNR01L o XNS01L
// }

// /**
//  * Calcola la composizione ottimale di pezzetti per una lunghezza personalizzata
//  */
// export function calculateProfileComposition(baseCode: string, targetLength: number): CompositeProfileConfig {
//     console.log(`🧮 Calcolando composizione per ${baseCode} lunghezza ${targetLength}mm`);
    
//     const segments: ProfileSegment[] = [];
//     let remainingLength = targetLength;

//     // Pezzi disponibili in ordine di priorità (dal più grande al più piccolo)
//     const availablePieces = [
//         { code: baseCode, length: 2500 },           // Pezzo originale
//         { code: `${baseCode}_500`, length: 500 },   // Pezzetto da 500mm
//         { code: `${baseCode}_100`, length: 100 },   // Pezzetto da 100mm
//     ];

//     // Algoritmo greedy: usa prima i pezzi più grandi
//     for (const piece of availablePieces) {
//         if (remainingLength >= piece.length) {
//             const count = Math.floor(remainingLength / piece.length);
//             if (count > 0) {
//                 segments.push({
//                     code: piece.code,
//                     length: piece.length,
//                     count: count
//                 });
//                 remainingLength -= count * piece.length;
//                 console.log(`  - ${count}x ${piece.code} (${piece.length}mm)`);
//             }
//         }
//     }

//     if (remainingLength > 0) {
//         console.warn(`⚠️ Rimangono ${remainingLength}mm non coperti!`);
//     }

//     const result = {
//         segments,
//         totalLength: targetLength,
//         baseCode
//     };

//     console.log(`✅ Composizione calcolata:`, result);
//     return result;
// }

// /**
//  * Crea un profilo composito nella scena del renderer
//  */
// export async function createCompositeProfile(
//     renderer: Renderer, 
//     config: CompositeProfileConfig
// ): Promise<TemporaryObject[]> {
//     console.log(`🏗️ Creando profilo composito per ${config.baseCode}`);
//     console.log(`📊 Configurazione:`, config.segments);
    
//     const objects: TemporaryObject[] = [];
//     let currentPositionX = 0; // Posizione corrente lungo l'asse X (in mm)

//     // Crea tutti i pezzetti e posizionali in sequenza
//     for (const segment of config.segments) {
//         console.log(`📦 Segmento: ${segment.count}x ${segment.code} (${segment.length}mm each)`);
        
//         for (let i = 0; i < segment.count; i++) {
//             console.log(`  - Aggiungendo ${config.baseCode} #${i+1} alla posizione ${currentPositionX}mm`);
            
//             // USA SEMPRE IL CODICE BASE per avere le junctions corrette
//             const obj = await renderer.addObject(config.baseCode);
//             objects.push(obj);

//             // Scala il mesh per adattarlo alla lunghezza del segmento
//             if (obj.mesh) {
//                 const scaleFactor = segment.length / 2500; // 2500mm è la lunghezza standard
//                 obj.mesh.scale.setX(scaleFactor);
                
//                 // Posiziona il pezzetto lungo l'asse X con spaziatura visibile
//                 currentPositionX += segment.length * (62.5 / 2500);
//                 const xPosition = currentPositionX;
                
//                 obj.mesh.position.set(xPosition, 0, 0);
//             }
//         }
//     }

//     console.log(`📍 Creati ${objects.length} oggetti per lunghezza totale: ${currentPositionX}mm`);

//     // Nascondi le giunzioni intermedie per un aspetto più pulito
//     hideIntermediateJunctions(objects);

//     console.log(`✅ Profilo composito creato con ${objects.length} pezzetti`);
//     return objects;
// }

// // Funzione migliorata per nascondere solo le junctions intermedie, mantenendo TUTTE le line junctions
// function hideIntermediateJunctions(objects: TemporaryObject[]) {
//     console.log(`🙈 Gestendo junctions per ${objects.length} oggetti...`);
    
//     if (objects.length <= 1) {
//         console.log(`  - Solo ${objects.length} oggetto/i, nessuna giunzione da nascondere`);
//         return;
//     }

//     // Per tutti gli oggetti tranne il primo e l'ultimo, nascondi solo le junctions normali
//     for (let i = 1; i < objects.length - 1; i++) {
//         const obj = objects[i];
//         const catalogEntry = obj.getCatalogEntry();
        
//         console.log(`  - Nascondendo junctions normali per oggetto intermedio ${i} (${catalogEntry.code})`);
        
//         // Crea una copia dell'entry del catalogo rimuovendo solo le junctions normali
//         const modifiedEntry = {
//             ...catalogEntry,
//             juncts: [], // Rimuove tutte le junctions intermedie
//             line_juncts: catalogEntry.line_juncts // MANTIENI tutte le line junctions per attaccare luci
//         };
        
//         obj.setCatalogEntry(modifiedEntry);
//     }

//     // Gestisci le junctions del primo oggetto (mantieni solo quella "sinistra" per le junctions normali)
//     if (objects.length > 0) {
//         const firstObj = objects[0];
//         const firstEntry = firstObj.getCatalogEntry();
        
//         console.log(`  - Primo oggetto (${firstEntry.code}): gestendo junctions normali`);
        
//         if (firstEntry.juncts.length > 1) {
//             // Per profili lineari, mantieni solo la giunzione di uscita (destra)
//             const modifiedFirstEntry = {
//                 ...firstEntry,
//                 juncts: [firstEntry.juncts[firstEntry.juncts.length - 1]], // Ultima junction (destra)
//                 line_juncts: firstEntry.line_juncts // MANTIENI tutte le line junctions
//             };
//             firstObj.setCatalogEntry(modifiedFirstEntry);
//         }
//     }

//     // Gestisci le junctions dell'ultimo oggetto (mantieni solo quella "sinistra" per le junctions normali)
//     if (objects.length > 1) {
//         const lastObj = objects[objects.length - 1];
//         const lastEntry = lastObj.getCatalogEntry();
        
//         console.log(`  - Ultimo oggetto (${lastEntry.code}): gestendo junctions normali`);
        
//         if (lastEntry.juncts.length > 1) {
//             // Per profili lineari, mantieni solo la giunzione di ingresso (sinistra)
//             const modifiedLastEntry = {
//                 ...lastEntry,
//                 juncts: [lastEntry.juncts[0]], // Prima junction (sinistra)
//                 line_juncts: lastEntry.line_juncts // MANTIENI tutte le line junctions
//             };
//             lastObj.setCatalogEntry(modifiedLastEntry);
//         }
//     }
    
//     console.log(`✅ Gestione junctions completata - line junctions mantenute su tutti i pezzetti`);
// }


// /**
//  * Verifica se un codice profilo supporta la composizione
//  */
// export function isCompositeProfileSupported(code: string): boolean {
//     const supportedBaseCodes = ['XNR01L', 'XNS01L'];
//     return supportedBaseCodes.some(baseCode => code.startsWith(baseCode));
// }

// /**
//  * Estrae il codice base da un codice profilo (es: XNR01L_500 -> XNR01L)
//  */
// export function extractBaseCode(code: string): string {
//     const supportedBaseCodes = ['XNR01L', 'XNS01L'];
//     for (const baseCode of supportedBaseCodes) {
//         if (code.startsWith(baseCode)) {
//             return baseCode;
//         }
//     }
//     return code; // Fallback se non riconosciuto
// }