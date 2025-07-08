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

export class TemperatureManager {
	static getAvailableTemperatures(family: Family): TemperatureConfig[] {
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
	
	// FIX: Ritorna l'oggetto TemperatureConfig completo, non solo il suffix
	static getCurrentTemperature(code: string): TemperatureConfig | null {
		for (const tempConfig of TEMPERATURE_CONFIGS) {
			if (code.includes(tempConfig.suffix) && 
				this.isValidTemperatureSuffix(code, tempConfig.suffix)) {
				return tempConfig; // FIX: era tempConfig.suffix
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
		return availableTemps.length > 1;
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
}