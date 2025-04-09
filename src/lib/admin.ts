import { invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import { getSupabase } from '$lib';
import { toast } from 'svelte-sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './dbschema';

/**
 * Elimina un oggetto dal database
 * @param tenant Il tenant corrente
 * @param code Il codice dell'oggetto da eliminare
 */
export async function deleteObject(tenant: string, code: string): Promise<void> {
  const supabase = getSupabase();
  
  try {
    // Elimina tutte le relazioni dell'oggetto
    await Promise.all([
      supabase
        .from('object_junctions')
        .delete()
        .eq('tenant', tenant)
        .eq('object_code', code)
        .throwOnError(),
      
      supabase
        .from('object_curve_junctions')
        .delete()
        .eq('tenant', tenant)
        .eq('object_code', code)
        .throwOnError(),
      
      supabase
        .from('family_objects')
        .delete()
        .eq('tenant', tenant)
        .eq('objectcode', code)
        .throwOnError()
    ]);
    
    // Elimina l'oggetto stesso
    await supabase
      .from('objects')
      .delete()
      .eq('tenant', tenant)
      .eq('code', code)
      .throwOnError();
    
    await invalidateAll();
  } catch (error) {
    toast.error(`Errore durante l'eliminazione dell'oggetto: ${code}`);
    console.error('Errore durante l\'eliminazione dell\'oggetto:', error);
  }
}

/**
 * Elimina una famiglia dal database
 * @param tenant Il tenant corrente
 * @param code Il codice della famiglia da eliminare
 */
export async function deleteFamily(tenant: string, code: string): Promise<void> {
  // Verifica che la famiglia non abbia oggetti associati
  if (page.data.families[code].items.length !== 0) {
    toast.error("Questa famiglia ha ancora oggetti associati e non può essere eliminata");
    return;
  }
  
  try {
    await getSupabase()
      .from('families')
      .delete()
      .eq('tenant', tenant)
      .eq('code', code)
      .throwOnError();
    
    await invalidateAll();
  } catch (error) {
    toast.error(`Errore durante l'eliminazione della famiglia: ${code}`);
    console.error('Errore durante l\'eliminazione della famiglia:', error);
  }
}

interface FamilySettings {
  group: string;
  image: File;
  displayName: string;
  visible: boolean;
  hasModel: boolean;
  needsColorConfig: boolean;
  needsLengthConfig: boolean;
  needsCurveConfig: boolean;
  needsTemperatureConfig: boolean;
  needsLedConfig: boolean;
  ledFamily?: string;
  isLed: boolean;
  arbitraryLength: boolean;
}

/**
 * Crea una nuova famiglia nel database
 * @param tenant Il tenant corrente
 * @param system Il sistema corrente
 * @param settings Le impostazioni della famiglia
 */
export async function createFamily(
  tenant: string,
  system: string,
  settings: FamilySettings
): Promise<void> {
  const supabase = getSupabase();
  const code = crypto.randomUUID().replaceAll('-', '');
  
  try {
    // Carica l'immagine della famiglia
    await supabase.storage
      .from(tenant)
      .upload(`families/${code}.webp`, settings.image, { upsert: true });
    
    // Crea la famiglia nel database
    await supabase
      .from('families')
      .upsert({
        code,
        tenant,
        system,
        visible: settings.visible,
        displayname: settings.displayName,
        familygroup: settings.group,
        hasmodel: settings.hasModel,
        needscolorconfig: settings.needsColorConfig,
        needslengthconfig: settings.needsLengthConfig,
        needscurveconfig: settings.needsCurveConfig,
        needstemperatureconfig: settings.needsTemperatureConfig,
        needsledconfig: settings.needsLedConfig,
        ledfamily: settings.ledFamily,
        isled: settings.isLed,
        arbitrarylength: settings.arbitraryLength,
      })
      .throwOnError();
      
    toast.success(`Famiglia ${settings.displayName} creata con successo`);
  } catch (error) {
    toast.error("Si è verificato un errore durante la creazione della famiglia");
    console.error('Errore durante la creazione della famiglia:', error);
  }
}

/**
 * Crea un nuovo sistema nel database
 * @param tenant Il tenant corrente
 * @param code Il codice del sistema
 * @param image L'immagine del sistema
 */
export async function createSystem(tenant: string, code: string, image: File): Promise<void> {
  try {
    const supabase = getSupabase();
    
    // Crea il sistema nel database
    await supabase
      .from('systems')
      .upsert({ tenant, code })
      .throwOnError();
    
    // Carica l'immagine del sistema
    const res = await supabase.storage
      .from(tenant)
      .upload(`systems/${code}.jpg`, image, { upsert: true });

    if (res.error !== null) {
      throw new Error("Impossibile caricare l'immagine del sistema");
    }
    
    toast.success(`Sistema ${code} creato con successo`);
  } catch (error) {
    toast.error("Si è verificato un errore durante la creazione del sistema");
    console.error('Errore durante la creazione del sistema:', error);
  }
}