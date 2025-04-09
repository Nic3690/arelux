#!/usr/bin/env bash
set -euo pipefail

# Carica variabili d'ambiente
if [ -f .env.local ]; then
  source .env.local
elif [ -f .env.development ]; then
  source .env.development
else
  echo "Nessun file di environment trovato. Crea .env.local o .env.development"
  exit 1
fi

if [ -z "${PRODUCTION_SUPABASE_CONNSTRING:-}" ]; then
  echo "PRODUCTION_SUPABASE_CONNSTRING non è impostata"
  exit 1
fi

echo "Creazione backup del database locale..."
# Utilizza file temporanei con prefisso per facilità di gestione
BACKUP_DIR=$(mktemp -d -t supabase-backup-XXXXXX)
ROLES_FILE="$BACKUP_DIR/roles.sql"
SCHEMA_FILE="$BACKUP_DIR/schema.sql"
DATA_FILE="$BACKUP_DIR/data.sql"

# Crea backup del database locale
npx supabase db dump --local -f "$ROLES_FILE" --role-only
npx supabase db dump --local -f "$SCHEMA_FILE"
npx supabase db dump --local -f "$DATA_FILE" --use-copy --data-only --schema public

echo "Ripristino sul database di produzione..."
# Utilizza una transazione per garantire che tutte le operazioni vengano eseguite o nessuna
psql "$PRODUCTION_SUPABASE_CONNSTRING" << EOF
BEGIN;

-- Pulisci le tabelle esistenti
DROP TABLE IF EXISTS families CASCADE;
DROP TABLE IF EXISTS family_objects CASCADE;
DROP TABLE IF EXISTS objects CASCADE;
DROP TABLE IF EXISTS object_junctions CASCADE;
DROP TABLE IF EXISTS object_curve_junctions CASCADE;
DROP TABLE IF EXISTS junctions CASCADE;
DROP TABLE IF EXISTS systems CASCADE;
DROP TABLE IF EXISTS joiners CASCADE;

-- Importa lo schema
\i '$SCHEMA_FILE'

-- Imposta la modalità replica per ignorare i vincoli durante l'importazione
SET session_replication_role = replica;

-- Configura le viste per la sicurezza
ALTER VIEW IF EXISTS view_junctions SET (security_invoker = true);
ALTER VIEW IF EXISTS view_curves SET (security_invoker = true);

-- Importa i dati
\i '$DATA_FILE'

COMMIT;
EOF

# Pulizia dei file temporanei
rm -rf "$BACKUP_DIR"

echo "Deployment completato con successo!"