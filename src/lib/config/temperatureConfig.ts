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
];

const FAMILY_TEMPERATURE_CONFIG: Record<string, string[]> = {
	'XNET': ['UWW', 'WW'],
};

// NUOVO: Configurazione per oggetti specifici che hanno temperature diverse dalla famiglia
const OBJECT_TEMPERATURE_CONFIG: Record<string, string[]> = {
	'XNRS01': ['UWW', 'WW', 'NW'],
	'XNRS02': ['UWW', 'WW', 'NW'],
	'XNRS03': ['UWW', 'WW', 'NW'],
	// Aggiungi qui altre luci con configurazioni specifiche
};

const generatedVariants = new Map<string, any[]>();
const generatedCatalogEntries = new Map<string, any>();

export class TemperatureManager {
	
	static getExpectedTemperatures(family: Family, itemCode?: string): string[] {
		if (itemCode) {
			if (OBJECT_TEMPERATURE_CONFIG[itemCode]) {
				return OBJECT_TEMPERATURE_CONFIG[itemCode];
			}

			let baseCode = itemCode;

			const parts = baseCode.split(' ');
			const mainCode = parts[0];

			baseCode = mainCode.replace(/UWW[R]?$/g, '');
			baseCode = baseCode.replace(/WW[R]?$/g, '');
			baseCode = baseCode.replace(/NW[R]?$/g, '');

			
			if (OBJECT_TEMPERATURE_CONFIG[baseCode]) {
				return OBJECT_TEMPERATURE_CONFIG[baseCode];
			}
		}

		const familyKey = this.getFamilyConfigKey(family);
		const expected = FAMILY_TEMPERATURE_CONFIG[familyKey] || [];
		
		return expected;
	}
	
	private static getFamilyConfigKey(family: Family): string {
		if (family.system === 'XNET' || family.system === 'XNet') {
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

			if (isLightFamily) {
				return 'XNET';
			}
		}

		return family.system;
	}
	
	static getAvailableTemperatures(family: Family, itemCode?: string): TemperatureConfig[] {
		const expectedTemps = this.getExpectedTemperatures(family, itemCode);
		
		if (expectedTemps.length === 0) {
			return this.getActualAvailableTemperatures(family);
		}

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
		const regex = new RegExp(`\\b${suffix}\\b|${suffix}(?=[^A-Z])|${suffix}$|${suffix}R\\b`);
		return regex.test(code);
	}
	
	static getCurrentTemperature(code: string): TemperatureConfig | null {
		for (const tempConfig of TEMPERATURE_CONFIGS) {
			if (code.includes(tempConfig.suffix) && 
				this.isValidTemperatureSuffix(code, tempConfig.suffix)) {
				return tempConfig;
			}
		}
		return null;
	}
	
	static switchTemperature(code: string, newTemperature: TemperatureConfig): string {
		const currentTemp = this.getCurrentTemperature(code);
		
		if (currentTemp) {
			const regex = new RegExp(`${currentTemp.suffix}(R?)`, 'g');
			return code.replace(regex, newTemperature.suffix + '$1');
		}
		
		return code + newTemperature.suffix;
	}
	
	static hasTemperatureVariants(family: Family, itemCode?: string): boolean {
		const availableTemps = this.getAvailableTemperatures(family, itemCode);
		const hasVariants = availableTemps.length > 1;
		
		return hasVariants;
	}

	static getEnhancedCatalog(originalCatalog: any): any {
		const enhancedCatalog = { ...originalCatalog };

		for (const [itemCode, catalogEntry] of generatedCatalogEntries.entries()) {
			enhancedCatalog[itemCode] = catalogEntry;
		}
		
		return enhancedCatalog;
	}

	private static createCatalogEntry(baseItem: any, baseCatalogEntry: any, newCode: string): any {
		return {
			...baseCatalogEntry,
			code: newCode,
		};
	}

	static getBaseCodeForResources(code: string): string {
		if (code.includes('UWW')) {
			const result = code.replace(/UWW(R?)/g, 'WW$1');
			return result;
		}

		if (code.includes('NW')) {
			const result = code.replace(/NW(R?)/g, 'WW$1');
			return result;
		}
		return code;
	}

	static getEnhancedFamily(family: Family, originalCatalog?: any): Family {
		const cacheKey = `${family.code}_enhanced`;
		
		if (generatedVariants.has(cacheKey)) {
			return {
				...family,
				items: [...family.items, ...generatedVariants.get(cacheKey)!]
			};
		}
		
		const newItems: any[] = [];

		for (const baseItem of family.items) {
			const parts = baseItem.code.split(' ');
			const mainCode = parts[0];
			
			let extractedBase = mainCode.replace(/UWW[R]?$/g, '');
			extractedBase = extractedBase.replace(/WW[R]?$/g, '');
			extractedBase = extractedBase.replace(/NW[R]?$/g, '');
			
			const expectedTemps = this.getExpectedTemperatures(family, extractedBase);
			
			if (expectedTemps.length <= 1) {
				continue;
			}
			
			const currentTemp = this.getCurrentTemperature(baseItem.code);

			for (const expectedSuffix of expectedTemps) {
				if (currentTemp && currentTemp.suffix === expectedSuffix) {
					continue;
				}
				
				const missingTempConfig = TEMPERATURE_CONFIGS.find(t => t.suffix === expectedSuffix);
				if (!missingTempConfig) continue;
				
				const newCode = currentTemp ? 
					this.switchTemperature(baseItem.code, missingTempConfig) :
					baseItem.code + missingTempConfig.suffix;

				if (family.items.some(item => item.code === newCode) || 
					newItems.some(item => item.code === newCode)) {
					continue;
				}
				
				const newItem = {
					...baseItem,
					code: newCode,
					desc1: this.updateDescriptionTemperature(baseItem.desc1, currentTemp, missingTempConfig),
					desc2: this.updateDescriptionTemperature(baseItem.desc2, currentTemp, missingTempConfig),
					color: baseItem.color,
					_isGenerated: true
				};
				
				newItems.push(newItem);

				if (originalCatalog && originalCatalog[baseItem.code]) {
					const catalogEntry = this.createCatalogEntry(baseItem, originalCatalog[baseItem.code], newCode);
					generatedCatalogEntries.set(newCode, catalogEntry);
				}
			}
		}

		generatedVariants.set(cacheKey, newItems);
		
		const enhancedFamily = {
			...family,
			items: [...family.items, ...newItems]
		};
		
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
		const suffixRegex = new RegExp(`${oldTemp.suffix}(R?)`, 'g');
		
		return description
			.replace(suffixRegex, newTemp.suffix + '$1')
			.replace(new RegExp(oldTemp.label, 'g'), newTemp.label)
			.replace(new RegExp(oldTemp.kelvin.toString(), 'g'), newTemp.kelvin.toString());
	}

	static isGeneratedItem(itemCode: string): boolean {
		return generatedCatalogEntries.has(itemCode);
	}
}