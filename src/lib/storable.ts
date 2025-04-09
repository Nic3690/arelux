import { browser } from '$app/environment';
import { get, writable, type Writable } from 'svelte/store';

/**
 * Crea uno store Svelte che persiste nel localStorage del browser
 * @param key Chiave da utilizzare nel localStorage
 * @param data Valore iniziale dello store
 * @returns Store Svelte persistente
 */
export function storable<T>(key: string, data: T): Writable<T> & { update: (cb: (value: T) => T) => void } {
  const store = writable<T>(data);
  const { subscribe, set } = store;

  // Carica il valore dal localStorage se siamo nel browser e il valore esiste
  if (browser && localStorage[key]) {
    try {
      const storedValue = JSON.parse(localStorage[key]);
      set(storedValue);
    } catch (e) {
      console.error(`Errore nel parsing del valore in localStorage per la chiave ${key}:`, e);
    }
  }

  return {
    subscribe,
    set: (value: T) => {
      if (browser) {
        localStorage[key] = JSON.stringify(value);
      }
      set(value);
    },
    update: (cb: (value: T) => T) => {
      const currentValue = get(store);
      const updatedValue = cb(currentValue);
      
      if (browser) {
        localStorage[key] = JSON.stringify(updatedValue);
      }
      set(updatedValue);
    }
  };
}