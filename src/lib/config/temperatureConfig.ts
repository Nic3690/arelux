import type { Family } from "../../app";

export interface TemperatureConfig {
	suffix: string;
	label: string;
	kelvin: number;
	priority: number;
}

export const TEMPERATURE_CONFIGS: TemperatureConfig[] = [
	{ suffix: 'UWW', label: '2700K', kelvin: 2700, priority: 1 },
	{ suffix: 'WW', label: '3000K', kelvin: 3000, priority: 2 },
	{ suffix: 'NW', label: '4000K', kelvin: 4000, priority: 3 },
	// Aggiungi qui altre temperature future
];

// Configurazione per famiglie che dovrebbero avere varianti di temperatura
const FAMILY_TEMPERATURE_CONFIG: Record<string, string[]> = {
	// Famiglie XNET luci dovrebbero avere UWW e WW
	'XNET': ['UWW', 'WW'],
	// Aggiungi altre famiglie che necessitano temperature specifiche
};

// Cache per varianti generate dinamicamente
const generatedVariants = new Map<string, any[]>();
const generatedCatalogEntries = new Map<string, any>();

export class TemperatureManager {
	
	static getExpectedTemperatures(family: Family): string[] {
		// Logica per determinare quali temperature dovrebbe avere una famiglia
		const familyKey = this.getFamilyConfigKey(family);
		const expected = FAMILY_TEMPERATURE_CONFIG[familyKey] || [];
		
		console.log('🌡️ Temperature aspettate per', family.displayName, ':', expected);
		
		return expected;
	}
	
	private static getFamilyConfigKey(family: Family): string {
		// DEBUG: Aggiungi logging per capire la struttura delle famiglie
		console.log('🔍 Analizzando famiglia:', {
			code: family.code,
			displayName: family.displayName,
			system: family.system,
			group: family.group,
			items: family.items.map(i => i.code)
		});
		
		// Logica più ampia per XNET - proviamo diversi pattern
		if (family.system === 'XNET' || family.system === 'XNet') {
			// Controlla se è una famiglia di luci/LED
			const isLightFamily = 
				family.displayName.toLowerCase().includes('led') || 
				family.displayName.toLowerCase().includes('luce') ||
				family.displayName.toLowerCase().includes('light') ||
				family.group.toLowerCase().includes('luc') ||
				family.group.toLowerCase().includes('led') ||
				family.group.toLowerCase().includes('light') ||
				family.items.some(item => 
					item.code.toLowerCase().includes('led') ||
					item.code.toLowerCase().includes('ww') ||
					item.code.toLowerCase().includes('nw')
				);
			
			console.log('🔍 XNET famiglia luci?', isLightFamily);
			
			if (isLightFamily) {
				console.log('✅ Famiglia XNET luci identificata:', family.displayName);
				return 'XNET';
			}
		}
		
		console.log('❌ Famiglia non configurata per temperature:', family.displayName);
		return family.system; // fallback al sistema
	}
	
	static getAvailableTemperatures(family: Family): TemperatureConfig[] {
		const expectedTemps = this.getExpectedTemperatures(family);
		
		if (expectedTemps.length === 0) {
			// Logica originale per famiglie senza configurazione specifica
			return this.getActualAvailableTemperatures(family);
		}
		
		// Per famiglie configurate, ritorna le temperature aspettate
		return TEMPERATURE_CONFIGS.filter(temp => 
			expectedTemps.includes(temp.suffix)
		).sort((a, b) => a.priority - b.priority);
	}
	
	private static getActualAvailableTemperatures(family: Family): TemperatureConfig[] {
		const codes = family.items.map(item => item.code);
		const availableTemps: TemperatureConfig[] = [];
		
		for (const tempConfig of TEMPERATURE_CONFIGS) {
			const hasThisTemp = codes.some(code => 
				code.includes(tempConfig.suffix) && 
				this.isValidTemperatureSuffix(code, tempConfig.suffix)
			);
			
			if (hasThisTemp) {
				availableTemps.push(tempConfig);
			}
		}
		
		return availableTemps.sort((a, b) => a.priority - b.priority);
	}
	
	private static isValidTemperatureSuffix(code: string, suffix: string): boolean {
		const regex = new RegExp(`\\b${suffix}\\b|${suffix}(?=[^A-Z])|${suffix}$`);
		return regex.test(code);
	}
	
	static getCurrentTemperature(code: string): TemperatureConfig | null {
		for (const tempConfig of TEMPERATURE_CONFIGS) {
			if (code.includes(tempConfig.suffix) && 
				this.isValidTemperatureSuffix(code, tempConfig.suffix)) {
				return tempConfig; // Ritorna l'oggetto completo
			}
		}
		return null;
	}
	
	static switchTemperature(code: string, newTemperature: TemperatureConfig): string {
		const currentTemp = this.getCurrentTemperature(code);
		
		if (currentTemp) {
			return code.replace(
				new RegExp(currentTemp.suffix, 'g'), 
				newTemperature.suffix
			);
		}
		
		return code + newTemperature.suffix;
	}
	
	static hasTemperatureVariants(family: Family): boolean {
		const availableTemps = this.getAvailableTemperatures(family);
		const hasVariants = availableTemps.length > 1;
		
		console.log('🎛️ hasTemperatureVariants per', family.displayName, ':', {
			availableTemps: availableTemps.map(t => t.suffix),
			hasVariants
		});
		
		return hasVariants;
	}
	
	// NUOVO: Genera entry del catalog per item dinamici
	static getEnhancedCatalog(originalCatalog: any): any {
		const enhancedCatalog = { ...originalCatalog };
		
		// Aggiungi tutte le entry generate al catalog
		for (const [itemCode, catalogEntry] of generatedCatalogEntries.entries()) {
			enhancedCatalog[itemCode] = catalogEntry;
		}
		
		return enhancedCatalog;
	}
	
	// Helper per creare entry del catalog per item generati
	private static createCatalogEntry(baseItem: any, baseCatalogEntry: any, newCode: string): any {
		return {
			...baseCatalogEntry,
			code: newCode,
		};
	}
	
	// NUOVO: Metodo per ottenere il codice base per le risorse fisiche
	static getBaseCodeForResources(code: string): string {
		console.log('🔍 getBaseCodeForResources input:', code);
		
		// Se il codice contiene UWW (variante generata), sostituiscilo con WW (che esiste nel DB)
		if (code.includes('UWW')) {
			const result = code.replace(/UWW/g, 'WW');
			console.log('✅ UWW → WW conversion:', code, '→', result);
			return result;
		}
		
		// Per tutti gli altri casi, usa il codice originale
		console.log('✅ Using original code:', code);
		return code;
	}
	
	// NUOVO: Genera varianti mancanti per una famiglia
	static getEnhancedFamily(family: Family, originalCatalog?: any): Family {
		const expectedTemps = this.getExpectedTemperatures(family);
		
		console.log('🔧 getEnhancedFamily per', family.displayName, 'temperature aspettate:', expectedTemps);
		
		if (expectedTemps.length <= 1) {
			console.log('❌ Nessuna temperatura configurata, famiglia non modificata');
			return family;
		}
		
		const cacheKey = `${family.code}_enhanced`;
		
		if (generatedVariants.has(cacheKey)) {
			console.log('💾 Usando varianti dalla cache');
			return {
				...family,
				items: [...family.items, ...generatedVariants.get(cacheKey)!]
			};
		}
		
		const actualTemps = this.getActualAvailableTemperatures(family);
		console.log('🌡️ Temperature attuali:', actualTemps.map(t => t.suffix));
		
		const missingTemps = expectedTemps.filter(expectedSuffix => 
			!actualTemps.some(actual => actual.suffix === expectedSuffix)
		);
		
		console.log('❓ Temperature mancanti:', missingTemps);
		
		if (missingTemps.length === 0) {
			console.log('✅ Tutte le temperature sono già presenti');
			return family;
		}
		
		const newItems: any[] = [];
		
		// IMPORTANTE: Se la famiglia ha configurazione colore, genera tutte le combinazioni
		if (family.needsColorConfig) {
			// Trova tutti i colori unici nella famiglia
			const uniqueColors = new Set(family.items.map(item => item.color).filter(c => c));
			console.log('🎨 Colori unici trovati:', Array.from(uniqueColors));
			
			for (const missingSuffix of missingTemps) {
				const missingTempConfig = TEMPERATURE_CONFIGS.find(t => t.suffix === missingSuffix);
				if (!missingTempConfig) continue;
				
				// Per ogni colore, genera la variante con la temperatura mancante
				for (const color of uniqueColors) {
					// Trova un item base con questo colore
					const baseItem = family.items.find(item => {
						const currentTemp = this.getCurrentTemperature(item.code);
						return currentTemp !== null && item.color === color;
					});
					
					if (!baseItem) {
						console.log(`⚠️ Nessun item base trovato per colore ${color}`);
						continue;
					}
					
					const newCode = this.switchTemperature(baseItem.code, missingTempConfig);
					
					console.log('🆕 Generando variante colore+temperatura:', {
						base: baseItem.code,
						nuovo: newCode,
						colore: color,
						temperatura: missingTempConfig.suffix
					});
					
					// Verifica che non esista già
					if (family.items.some(item => item.code === newCode) || 
						newItems.some(item => item.code === newCode)) {
						console.log('⚠️ Item già esistente, skip:', newCode);
						continue;
					}
					
					const newItem = {
						...baseItem,
						code: newCode,
						desc1: this.updateDescriptionTemperature(baseItem.desc1, this.getCurrentTemperature(baseItem.code), missingTempConfig),
						desc2: this.updateDescriptionTemperature(baseItem.desc2, this.getCurrentTemperature(baseItem.code), missingTempConfig),
						color: color, // Mantieni il colore
						_isGenerated: true
					};
					
					newItems.push(newItem);
					
					// Genera anche l'entry del catalog se disponibile
					if (originalCatalog && originalCatalog[baseItem.code]) {
						const catalogEntry = this.createCatalogEntry(baseItem, originalCatalog[baseItem.code], newCode);
						generatedCatalogEntries.set(newCode, catalogEntry);
						console.log('📋 Entry catalog generata per:', newCode);
					}
				}
			}
		} else {
			// Logica originale per famiglie senza configurazione colore
			for (const missingSuffix of missingTemps) {
				const missingTempConfig = TEMPERATURE_CONFIGS.find(t => t.suffix === missingSuffix);
				if (!missingTempConfig) continue;
				
				const baseItem = family.items.find(item => {
					const currentTemp = this.getCurrentTemperature(item.code);
					return currentTemp !== null;
				}) || family.items[0];
				
				if (!baseItem) continue;
				
				const newCode = this.switchTemperature(baseItem.code, missingTempConfig);
				
				console.log('🆕 Generando variante:', {
					base: baseItem.code,
					nuovo: newCode,
					temperatura: missingTempConfig.suffix
				});
				
				if (family.items.some(item => item.code === newCode)) {
					console.log('⚠️ Item già esistente, skip:', newCode);
					continue;
				}
				
				const newItem = {
					...baseItem,
					code: newCode,
					desc1: this.updateDescriptionTemperature(baseItem.desc1, this.getCurrentTemperature(baseItem.code), missingTempConfig),
					desc2: this.updateDescriptionTemperature(baseItem.desc2, this.getCurrentTemperature(baseItem.code), missingTempConfig),
					_isGenerated: true
				};
				
				newItems.push(newItem);
				
				if (originalCatalog && originalCatalog[baseItem.code]) {
					const catalogEntry = this.createCatalogEntry(baseItem, originalCatalog[baseItem.code], newCode);
					generatedCatalogEntries.set(newCode, catalogEntry);
				}
			}
		}
		
		console.log('✨ Varianti generate:', newItems.length);
		
		// Salva in cache
		generatedVariants.set(cacheKey, newItems);
		
		const enhancedFamily = {
			...family,
			items: [...family.items, ...newItems]
		};
		
		console.log('📦 Famiglia enhanced:', {
			original: family.items.length,
			generated: newItems.length,
			total: enhancedFamily.items.length
		});
		
		return enhancedFamily;
	}
	
	static createTemperatureVariants(baseItem: any, availableTemperatures: TemperatureConfig[]): any[] {
		const variants: any[] = [];
		const baseTemp = this.getCurrentTemperature(baseItem.code);
		
		for (const temp of availableTemperatures) {
			if (temp.suffix === baseTemp?.suffix) {
				continue;
			}
			
			const variantCode = this.switchTemperature(baseItem.code, temp);
			const variant = {
				...baseItem,
				code: variantCode,
				desc1: this.updateDescriptionTemperature(baseItem.desc1, baseTemp, temp),
				desc2: this.updateDescriptionTemperature(baseItem.desc2, baseTemp, temp),
			};
			
			variants.push(variant);
		}
		
		return variants;
	}
	
	private static updateDescriptionTemperature(
		description: string, 
		oldTemp: TemperatureConfig | null, 
		newTemp: TemperatureConfig
	): string {
		if (!description || !oldTemp) return description;
		
		return description
			.replace(new RegExp(oldTemp.suffix, 'g'), newTemp.suffix)
			.replace(new RegExp(oldTemp.label, 'g'), newTemp.label)
			.replace(new RegExp(oldTemp.kelvin.toString(), 'g'), newTemp.kelvin.toString());
	}
	
	// Metodo helper per verificare se un item è stato generato dinamicamente
	static isGeneratedItem(itemCode: string): boolean {
		return generatedCatalogEntries.has(itemCode);
	}
}