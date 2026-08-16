import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Variabili VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY mancanti. Copia .env.example in .env e compilalo.'
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
