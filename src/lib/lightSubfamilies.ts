import type { Family, FamilyEntry, CatalogEntry } from '../app';

export interface LightSubfamily {
  code: string;
  displayName: string;
  iconItem: string; // Codice del primo item per l'icona
  models: Array<{
    baseModel: string;
    power: number;
    sampleCode: string; // Un codice esempio per questo modello
  }>;
}

export function extractSubfamilies(family: Family, catalog: Record<string, CatalogEntry>): Map<string, LightSubfamily> {
  const subfamilies = new Map<string, LightSubfamily>();
  
  // Raggruppa per sottofamiglia
  for (const item of family.items) {
    const match = item.code.match(/^([A-Z]+\d+[A-Z]*)\s+([A-Z]{2})\s+/);
    
    if (match) {
      const baseModel = match[1];
      const subfamilyCode = match[2];
      const power = Math.abs(catalog[item.code]?.power || 0);
      
      if (!subfamilies.has(subfamilyCode)) {
        subfamilies.set(subfamilyCode, {
          code: subfamilyCode,
          displayName: getSubfamilyName(subfamilyCode),
          iconItem: item.code,
          models: []
        });
      }
      
      const subfamily = subfamilies.get(subfamilyCode)!;
      
      // Aggiungi modello se non esiste già
      if (!subfamily.models.some(m => m.baseModel === baseModel)) {
        subfamily.models.push({
          baseModel,
          power,
          sampleCode: item.code
        });
      }
    }
  }
  
  // Ordina i modelli per potenza
  for (const subfamily of subfamilies.values()) {
    subfamily.models.sort((a, b) => a.power - b.power);
  }
  
  return subfamilies;
}

// Mappatura nomi sottofamiglie
const SUBFAMILY_NAMES: Record<string, string> = {
  'OP': 'Proiettori lineari',
  'GB': 'Sferiche',
  'SU': 'Sospensione',
  'SP': 'Proiettori orientabili',
};

const SUBFAMILY_ORDER: Record<string, number> = {
  'OP': 1,
  'GB': 2,
  'SU': 3,
  'SP': 4,
};

export function getSubfamilyName(code: string): string {
  return SUBFAMILY_NAMES[code] || code;
}

export function sortSubfamilies(subfamilies: LightSubfamily[]): LightSubfamily[] {
  return subfamilies.sort((a, b) => {
    const orderA = SUBFAMILY_ORDER[a.code] || 999;
    const orderB = SUBFAMILY_ORDER[b.code] || 999;
    return orderA - orderB;
  });
}

// Funzione per verificare se una famiglia ha sottofamiglie
export function hasLightSubfamilies(family: Family): boolean {
  return family.items.some(item => /^[A-Z]+\d+[A-Z]*\s+[A-Z]{2}\s+/.test(item.code));
}