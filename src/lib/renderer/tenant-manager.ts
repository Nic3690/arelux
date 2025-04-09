import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';

// Template per email.txt
const EMAIL_TXT_TEMPLATE = `
Gentile Cliente,

In allegato trova la fattura per il suo recente ordine.

Grazie per aver scelto i nostri prodotti.

Cordiali saluti,
Il Team
`;

// Template per email.html
const EMAIL_HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <p>Gentile Cliente,</p>
    <p>In allegato trova la fattura per il suo recente ordine.</p>
    <p>Grazie per aver scelto i nostri prodotti.</p>
    <p>Cordiali saluti,<br>Il Team</p>
    <div class="footer">
      <p>Questa è un'email automatica. Si prega di non rispondere.</p>
    </div>
  </div>
</body>
</html>
`;

// Template per subject
const EMAIL_SUBJ_TEMPLATE = 'Fattura Ordine';

// Tipi per tenant
export interface Tenant {
  code: string;
  name: string;
  created_at?: string;
}

// Tipo per il risultato delle operazioni
export interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * Configura un nuovo tenant in Supabase
 * @param tenantCode - Codice univoco del tenant (es. 'arelux-italia')
 * @param tenantName - Nome visualizzato del tenant
 * @param logoFile - File logo del tenant (opzionale)
 */
export async function setupNewTenant(
  tenantCode: string, 
  tenantName: string, 
  logoFile: File | null = null
): Promise<OperationResult> {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY as string;
  
  if (!supabaseUrl || !supabaseKey) {
    return { 
      success: false, 
      message: 'Configurazione Supabase mancante. Verifica le variabili d\'ambiente.'
    };
  }
  
  // Valida il codice tenant
  if (!/^[a-z0-9-]+$/.test(tenantCode)) {
    return {
      success: false,
      message: 'Il codice tenant deve contenere solo lettere minuscole, numeri e trattini.'
    };
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Crea un nuovo bucket per il tenant
    const { error: bucketError } = await supabase.storage.createBucket(tenantCode, {
      public: false
    });
    
    if (bucketError) throw new Error(`Errore nella creazione del bucket: ${bucketError.message}`);
    
    // 2. Crea le directory necessarie
    const directories = ['models', 'simple', 'images'];
    for (const dir of directories) {
      const { error: dirError } = await supabase.storage
        .from(tenantCode)
        .upload(`${dir}/.keep`, new Blob(['']), {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (dirError) throw new Error(`Errore nella creazione della directory ${dir}: ${dirError.message}`);
    }
    
    // 3. Crea i file necessari
    const files = [
      { name: 'email.txt', content: EMAIL_TXT_TEMPLATE, type: 'text/plain' },
      { name: 'email.html', content: EMAIL_HTML_TEMPLATE, type: 'text/html' },
      { name: 'email.subj', content: EMAIL_SUBJ_TEMPLATE, type: 'text/plain' }
    ];
    
    for (const file of files) {
      const { error: fileError } = await supabase.storage
        .from(tenantCode)
        .upload(file.name, new Blob([file.content]), {
          contentType: file.type,
          upsert: true
        });
        
      if (fileError) throw new Error(`Errore nel caricamento del file ${file.name}: ${fileError.message}`);
    }
    
    // 4. Carica il logo se fornito
    if (logoFile) {
      const logoFileName = `${tenantCode}.jpg`;
      const { error: logoError } = await supabase.storage
        .from(tenantCode)
        .upload(logoFileName, logoFile, {
          upsert: true
        });
        
      if (logoError) throw new Error(`Errore nel caricamento del logo: ${logoError.message}`);
    }
    
    // 5. Registra il tenant nel database (assumi che esista una tabella 'tenants')
    const { error: dbError } = await supabase
      .from('tenants')
      .insert([{ 
        code: tenantCode, 
        name: tenantName,
        created_at: new Date().toISOString() 
      }]);
      
    if (dbError) throw new Error(`Errore nella registrazione del tenant nel DB: ${dbError.message}`);
    
    return {
      success: true,
      message: `Tenant ${tenantName} (${tenantCode}) configurato con successo!`
    };
  } catch (error: unknown) {
    console.error('Errore nella configurazione del tenant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return {
      success: false,
      message: `Errore: ${errorMessage}`
    };
  }
}

/**
 * Ottiene l'elenco di tutti i tenant disponibili
 */
export async function getTenants(): Promise<Tenant[]> {
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL as string,
    import.meta.env.PUBLIC_SUPABASE_KEY as string
  );
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('code, name')
      .order('name');
      
    if (error) throw error;
    
    return data || [];
  } catch (error: unknown) {
    console.error('Errore nel recupero dei tenant:', error);
    return [];
  }
}