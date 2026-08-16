import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Mancano VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Controlla il file .env.local (in sviluppo) o le variabili d'ambiente configurate su Cloudflare Pages (in produzione)."
  );
}

export const supabase = createClient(url, key);
