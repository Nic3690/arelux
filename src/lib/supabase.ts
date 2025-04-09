import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/dbschema';
import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * Singleton del client Supabase
 */
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Errori delle operazioni Supabase
 */
export const supabaseError: Writable<string | null> = writable(null);

/**
 * Stato di caricamento delle operazioni Supabase
 */
export const supabaseLoading: Writable<boolean> = writable(false);

/**
 * Ottiene o crea un'istanza del client Supabase
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_KEY) {
      throw new Error('Variabili d\'ambiente Supabase mancanti');
    }
    
    supabaseClient = createClient<Database>(
      PUBLIC_SUPABASE_URL, 
      PUBLIC_SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          storageKey: 'app_supabase_auth',
        },
        global: {
          headers: {
            'x-app-version': '1.0.0',
          },
        },
      }
    );
  }

  return supabaseClient;
}

/**
 * Funzione helper per eseguire query con gestione degli errori e stato di caricamento
 * @param queryFn Funzione che esegue la query Supabase
 * @returns Promise con il risultato della query
 */
export async function executeQuery<T>(
  queryFn: () => Promise<T>
): Promise<T> {
  supabaseError.set(null);
  supabaseLoading.set(true);
  
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    const message = error instanceof Error 
      ? error.message 
      : 'Si è verificato un errore imprevisto';
      
    supabaseError.set(message);
    console.error('Errore Supabase:', error);
    throw error;
  } finally {
    supabaseLoading.set(false);
  }
}

/**
 * Ottiene l'URL pubblico di un file nello storage Supabase
 * @param tenant Tenant corrente
 * @param path Percorso del file nello storage
 * @returns URL pubblico del file
 */
export function getPublicFileUrl(tenant: string, path: string): string {
  const supabase = getSupabase();
  return supabase.storage.from(tenant).getPublicUrl(path).data.publicUrl;
}

/**
 * Carica un file nello storage Supabase con gestione degli errori
 * @param tenant Tenant corrente
 * @param path Percorso del file nello storage
 * @param file File da caricare
 * @param options Opzioni di caricamento
 * @returns Promise con l'URL pubblico del file caricato
 */
export async function uploadFile(
  tenant: string, 
  path: string, 
  file: File,
  options = { upsert: true }
): Promise<string> {
  return executeQuery(async () => {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.storage
      .from(tenant)
      .upload(path, file, options);
      
    if (error) {
      throw new Error(`Errore nel caricamento del file: ${error.message}`);
    }
    
    return getPublicFileUrl(tenant, path);
  });
}

/**
 * Esegue il logout dell'utente corrente
 */
export async function logout(): Promise<void> {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  
  // Aggiorna la pagina per assicurare che tutti gli stati vengano reimpostati
  if (browser) {
    window.location.href = '/';
  }
}