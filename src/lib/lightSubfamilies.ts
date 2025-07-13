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
  
  // Codici sottofamiglia validi
  const VALID_SUBFAMILY_CODES = ['OP', 'GB', 'SU', 'SP'];
  
  // Raggruppa per sottofamiglia
  for (const item of family.items) {
    let baseModel: string | null = null;
    let subfamilyCode: string | null = null;
    let isCurved = false;
    
    // Controlla se è una luce curva
    isCurved = item.code.includes('WWR') || item.code.includes('UWWR');
    
    // Strategia: cerca i codici sottofamiglia validi nel codice item
    for (const code of VALID_SUBFAMILY_CODES) {
      // Pattern 1: codice sottofamiglia con spazio prima
      let regex = new RegExp(`^([A-Z]+\\d+)(?:[U]?WW[R]?)?\\s+${code}(?:\\s|$|[A-Z])`);
      let match = item.code.match(regex);
      
      if (!match) {
        // Pattern 2: codice sottofamiglia senza spazio
        regex = new RegExp(`^([A-Z]+\\d+)(?:[U]?WW[R]?)?${code}(?:[A-Z]*)?(?:\\s|$)`);
        match = item.code.match(regex);
      }
      
      if (match) {
        baseModel = match[1];
        subfamilyCode = code;
        break;
      }
    }
    
    if (baseModel && subfamilyCode) {
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
      
      // Crea il baseModel normalizzato con distinzione dritta/curva
      const normalizedBaseModel = isCurved ? `${baseModel}R` : baseModel;
      
      // Verifica se questo modello esiste già
      const existingModel = subfamily.models.find(m => 
        m.baseModel === normalizedBaseModel && m.power === power
      );
      
      if (!existingModel) {
        subfamily.models.push({
          baseModel: normalizedBaseModel,
          power,
          sampleCode: item.code
        });
      }
    }
  }
  
  // Ordina i modelli per potenza e poi per tipo (dritte prima delle curve)
  for (const subfamily of subfamilies.values()) {
    subfamily.models.sort((a, b) => {
      // Prima ordina per potenza
      if (a.power !== b.power) {
        return a.power - b.power;
      }
      // A parità di potenza, metti le dritte prima delle curve
      const aIsCurved = a.baseModel.endsWith('R');
      const bIsCurved = b.baseModel.endsWith('R');
      if (aIsCurved && !bIsCurved) return 1;
      if (!aIsCurved && bIsCurved) return -1;
      return 0;
    });
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
  const VALID_SUBFAMILY_CODES = ['OP', 'GB', 'SU', 'SP'];
  
  return family.items.some(item => {
    // Cerca uno dei codici sottofamiglia validi nel codice item
    return VALID_SUBFAMILY_CODES.some(code => {
      // Pattern 1: con spazio
      const regex1 = new RegExp(`\\s+${code}(?:\\s|$|[A-Z])`);
      // Pattern 2: senza spazio
      const regex2 = new RegExp(`[A-Z]${code}(?:[A-Z]*)?(?:\\s|$)`);
      
      return regex1.test(item.code) || regex2.test(item.code);
    });
  });
}