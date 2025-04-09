import { browser } from '$app/environment';
import { get, writable, type Writable } from 'svelte/store';

/**
 * Prefisso utilizzato per tutte le chiavi nel localStorage,
 * utile per evitare conflitti con altre applicazioni
 */
const STORAGE_PREFIX = 'app_';

/**
 * Opzioni per configurare il comportamento dello store
 */
export interface StorableOptions<T> {
  /** Prefisso personalizzato per la chiave localStorage */
  prefix?: string;
  /** Funzione di validazione per il valore caricato */
  validate?: (value: unknown) => boolean;
  /** Funzione di serializzazione personalizzata */
  serialize?: (value: T) => string;
  /** Funzione di deserializzazione personalizzata */
  deserialize?: (value: string) => T;
}

/**
 * Crea uno store Svelte che persiste nel localStorage del browser
 * @param key Chiave da utilizzare nel localStorage
 * @param initialValue Valore iniziale dello store
 * @param options Opzioni di configurazione
 * @returns Store Svelte persistente
 */
export function storable<T>(
  key: string, 
  initialValue: T, 
  options: StorableOptions<T> = {}
): Writable<T> {
  // Configurazione opzioni con valori predefiniti
  const {
    prefix = STORAGE_PREFIX,
    validate = (_: unknown) => true,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  // Chiave completa per localStorage
  const storageKey = `${prefix}${key}`;
  
  // Crea lo store writable con il valore iniziale
  const store = writable<T>(initialValue);
  
  // Carica il valore dal localStorage se siamo nel browser
  if (browser) {
    const storedValue = localStorage.getItem(storageKey);
    
    if (storedValue !== null) {
      try {
        const parsedValue = deserialize(storedValue);
        
        // Valida il valore prima di impostarlo
        if (validate(parsedValue)) {
          store.set(parsedValue as T);
        } else {
          console.warn(`Valore in localStorage non valido per la chiave ${storageKey}`);
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error(`Errore nel parsing del valore in localStorage per la chiave ${storageKey}:`, e);
        localStorage.removeItem(storageKey);
      }
    }
  }

  // Funzione per salvare nel localStorage
  const saveToStorage = (value: T): void => {
    if (browser) {
      try {
        localStorage.setItem(storageKey, serialize(value));
      } catch (e) {
        console.error(`Errore nel salvataggio del valore in localStorage per la chiave ${storageKey}:`, e);
      }
    }
  };

  return {
    subscribe: store.subscribe,
    
    set: (value: T) => {
      saveToStorage(value);
      store.set(value);
    },
    
    update: (updater: (value: T) => T) => {
      const currentValue = get(store);
      const updatedValue = updater(currentValue);
      
      saveToStorage(updatedValue);
      store.set(updatedValue);
    }
  };
}

/**
 * Rimuove un valore specifico dal localStorage
 * @param key Chiave del valore da rimuovere
 * @param prefix Prefisso opzionale (usa lo stesso del createStore)
 */
export function clearStorable(key: string, prefix: string = STORAGE_PREFIX): void {
  if (browser) {
    localStorage.removeItem(`${prefix}${key}`);
  }
}

/**
 * Rimuove tutti i valori associati a questo prefisso dal localStorage
 * @param prefix Prefisso opzionale (usa lo stesso del createStore)
 */
export function clearAllStorables(prefix: string = STORAGE_PREFIX): void {
  if (browser) {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}