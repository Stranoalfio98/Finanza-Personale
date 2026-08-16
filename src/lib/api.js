import { supabase } from "./supabaseClient.js";

/* ------------------------------------------------------------
   CONTI
------------------------------------------------------------ */

export async function listaConti() {
  const { data, error } = await supabase.from("conti").select("*").order("nome");
  if (error) throw error;
  return data;
}

export async function creaConto(nome) {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("conti")
    .insert({ nome, user_id: sessione.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------
   CATEGORIE
------------------------------------------------------------ */

export async function listaCategorie() {
  const { data, error } = await supabase.from("categorie").select("*").order("categoria").order("sottocategoria");
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------
   TRANSAZIONI
------------------------------------------------------------ */

// Include i dati di conto e categoria già "espansi" (join), così
// le pagine non devono fare query separate per mostrare i nomi.
const SELECT_TRANSAZIONE = "*, conti(nome), categorie(sottocategoria, categoria, macrocategoria)";

export async function listaTransazioni({ limite = 100 } = {}) {
  const { data, error } = await supabase
    .from("transazioni")
    .select(SELECT_TRANSAZIONE)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function creaTransazione(input) {
  const { data: sessione } = await supabase.auth.getUser();
  const riga = {
    user_id: sessione.user.id,
    data: input.data,
    conto_id: input.conto_id,
    categoria_id: input.categoria_id,
    descrizione: input.descrizione,
    importo: input.importo,
    ricorrente: input.ricorrente ?? false,
    frequenza: input.ricorrente ? input.frequenza : null,
    stato_abbonamento: input.ricorrente ? "Attivo" : null,
  };
  const { data, error } = await supabase.from("transazioni").insert(riga).select(SELECT_TRANSAZIONE).single();
  if (error) throw error;
  return data;
}

export async function aggiornaTransazione(id, input) {
  const { data, error } = await supabase
    .from("transazioni")
    .update({
      data: input.data,
      conto_id: input.conto_id,
      categoria_id: input.categoria_id,
      descrizione: input.descrizione,
      importo: input.importo,
      ricorrente: input.ricorrente ?? false,
      frequenza: input.ricorrente ? input.frequenza : null,
      stato_abbonamento: input.ricorrente ? input.stato_abbonamento ?? "Attivo" : null,
    })
    .eq("id", id)
    .select(SELECT_TRANSAZIONE)
    .single();
  if (error) throw error;
  return data;
}

export async function eliminaTransazione(id) {
  const { error } = await supabase.from("transazioni").delete().eq("id", id);
  if (error) throw error;
}

// Versione leggera per il Budget mensile: solo i campi che servono
// per aggregare per mese, non l'intera riga con tutti i join.
export async function listaTransazioniPerBudget() {
  const { data, error } = await supabase.from("transazioni").select("data, importo, categorie(macrocategoria)").order("data", { ascending: true });
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------
   IMPOSTAZIONI
------------------------------------------------------------ */

export async function getImpostazioni() {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("impostazioni").select("*").eq("user_id", sessione.user.id).single();
  if (error) throw error;
  return data;
}
