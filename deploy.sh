#!/usr/bin/env bash

# shellcheck disable=SC1091
source .env.development

npx supabase db dump --local -f /tmp/roles.sql --role-only
npx supabase db dump --local -f /tmp/schema.sql
npx supabase db dump --local -f /tmp/data.sql --use-copy --data-only --schema public

psql-17 \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'DROP TABLE families CASCADE' \
  --command 'DROP TABLE family_objects CASCADE' \
  --command 'DROP TABLE objects CASCADE' \
  --command 'DROP TABLE object_junctions CASCADE' \
  --command 'DROP TABLE object_curve_junctions CASCADE' \
  --command 'DROP TABLE junctions CASCADE' \
  --command 'DROP TABLE systems CASCADE' \
  --command 'DROP TABLE joiners CASCADE' \
  --file /tmp/roles.sql \
  --file /tmp/schema.sql \
  --command 'SET session_replication_role = replica' \
  --command 'ALTER VIEW view_junctions SET (security_invoker = true);' \
  --command 'ALTER VIEW view_curves SET (security_invoker = true);' \
  --file /tmp/data.sql \
  --dbname "$PRODUCTION_SUPABASE_CONNSTRING"
