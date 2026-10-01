-- ============================================================
-- BILANCIO — Passo 6: fondo trading e target sulle voci
-- Da eseguire nell'SQL Editor di Supabase DOPO il passo 5,
-- e PRIMA di caricare su GitHub i nuovi file del sito.
-- ============================================================

-- nuovo tipo "Fondo trading"
alter table buoni_fruttiferi
  drop constraint if exists buoni_fruttiferi_tipo_check;

alter table buoni_fruttiferi
  add constraint buoni_fruttiferi_tipo_check
  check (tipo in ('Buono fruttifero', 'Libretto', 'Obbligazioni', 'Fondo trading'));

-- target facoltativo (es. 10.000 € per il fondo trading)
alter table buoni_fruttiferi
  add column if not exists target numeric(12, 2);

alter table buoni_fruttiferi
  drop constraint if exists buoni_target_positivo;

alter table buoni_fruttiferi
  add constraint buoni_target_positivo
  check (target is null or target > 0);
