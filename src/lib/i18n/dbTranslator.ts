import { _, locale } from 'svelte-i18n';
import { get, derived } from 'svelte/store';

// Definisci i tipi per le traduzioni
type DatabaseTerms = Record<string, string>;

/**
 * Ottiene le traduzioni del database per la lingua corrente
 */
function getDatabaseTerms(): DatabaseTerms | null {
    const currentLocale = get(locale);
    
    if (!currentLocale || currentLocale === 'it') {
        return null;
    }
    
    try {
        // Usa svelte-i18n per ottenere le traduzioni dai file JSON
        const translationFunction = get(_);
        const terms = translationFunction('database.terms', { default: "" });
        
        // Verifica che sia un oggetto con chiavi stringa
        if (terms && typeof terms === 'object' && !Array.isArray(terms)) {
            const typedTerms = terms as Record<string, unknown>;
            const validTerms: DatabaseTerms = {};
            
            // Filtra solo le proprietà che sono stringhe
            for (const [key, value] of Object.entries(typedTerms)) {
                if (typeof value === 'string') {
                    validTerms[key] = value;
                }
            }
            
            return Object.keys(validTerms).length > 0 ? validTerms : null;
        }
        
        return null;
    } catch (error) {
        console.warn('Errore nel caricamento delle traduzioni del database:', error);
        return null;
    }
}

/**
 * Store reattivo per le traduzioni del database
 * Si aggiorna automaticamente quando cambia la lingua
 */
export const databaseTerms = derived([locale, _], () => getDatabaseTerms());

/**
 * Traduce automaticamente i testi del database sostituendo parole chiave
 * con le loro traduzioni corrispondenti dai file JSON
 */
export function translateDatabaseText(text: string): string {
    const currentLocale = get(locale);
    
    // Se siamo in italiano o il testo è vuoto, ritorna il testo originale
    if (!text || currentLocale === 'it' || !currentLocale) {
        return text;
    }
    
    // Ottieni le traduzioni dai file JSON
    const translations = getDatabaseTerms();
    
    if (!translations || Object.keys(translations).length === 0) {
        return text;
    }
    
    let translatedText = text;
    
    // Applica le traduzioni sostituendo le parole chiave
    // Ordina le chiavi per lunghezza decrescente per evitare sostituzioni parziali
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    
    for (const italianTerm of sortedKeys) {
        const translatedTerm = translations[italianTerm];
        
        // Verifica che translatedTerm sia una stringa (già garantito da getDatabaseTerms)
        if (typeof translatedTerm !== 'string') {
            continue;
        }
        
        // Crea una regex che trova la parola italiana rispettando i confini delle parole
        // e considerando maiuscole/minuscole
        const regex = new RegExp(`\\b${escapeRegExp(italianTerm)}\\b`, 'gi');
        
        translatedText = translatedText.replace(regex, (match: string) => {
            // Mantieni il case del testo originale
            if (match === match.toUpperCase()) {
                return translatedTerm.toUpperCase();
            } else if (match === match.toLowerCase()) {
                return translatedTerm.toLowerCase();
            } else if (match[0] === match[0].toUpperCase()) {
                return translatedTerm.charAt(0).toUpperCase() + translatedTerm.slice(1).toLowerCase();
            }
            return translatedTerm;
        });
    }
    
    return translatedText;
}

/**
 * Store derivato che traduce un testo e si aggiorna automaticamente
 * quando cambia la lingua
 */
export function createTranslatedTextStore(text: string) {
    return derived([locale, _], () => translateDatabaseText(text));
}

/**
 * Escapa i caratteri speciali per l'uso in regex
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Funzioni helper per traduzioni specifiche
 */
export function translateFamilyDisplayName(displayName: string): string {
    return translateDatabaseText(displayName);
}

export function translateObjectDescription(description: string): string {
    return translateDatabaseText(description);
}

export function translateFamilyGroup(groupName: string): string {
    return translateDatabaseText(groupName);
}