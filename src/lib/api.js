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

export async function eliminaConto(id) {
  const { error } = await supabase.from("conti").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Questo conto è usato da almeno una transazione, non puoi eliminarlo.");
    }
    throw error;
  }
}

/* ------------------------------------------------------------
   CATEGORIE
------------------------------------------------------------ */

export async function listaCategorie() {
  const { data, error } = await supabase.from("categorie").select("*").order("categoria").order("sottocategoria");
  if (error) throw error;
  return data;
}

export async function creaCategoria(input) {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("categorie")
    .insert({
      user_id: sessione.user.id,
      sottocategoria: input.sottocategoria.trim(),
      categoria: input.categoria.trim(),
      tipo: input.tipo,
      macrocategoria: input.macrocategoria,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Hai già una sottocategoria con questo nome.");
    }
    throw error;
  }
  return data;
}

export async function eliminaCategoria(id) {
  const { error } = await supabase.from("categorie").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Questa categoria è usata da almeno una transazione, non puoi eliminarla.");
    }
    throw error;
  }
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

/**
 * Stato di partenza di un addebito appena segnato come ricorrente:
 * eredita quello dell'ultimo addebito con la stessa descrizione, così
 * un nuovo addebito (o uno spuntato dopo, in modifica) non riattiva
 * mai da solo un abbonamento che avevi segnato come abbandonato.
 * `escludiId` serve in modifica, per non trovare la transazione stessa.
 */
async function statoAbbonamentoEreditato(descrizione, escludiId = null) {
  let query = supabase
    .from("transazioni")
    .select("stato_abbonamento")
    .eq("ricorrente", true)
    .ilike("descrizione", descrizione.trim())
    .order("data", { ascending: false })
    .limit(1);
  if (escludiId) query = query.neq("id", escludiId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0]?.stato_abbonamento ?? "Attivo";
}

export async function creaTransazione(input) {
  const { data: sessione } = await supabase.auth.getUser();

  const statoAbbonamento = input.ricorrente ? await statoAbbonamentoEreditato(input.descrizione) : null;

  const riga = {
    user_id: sessione.user.id,
    data: input.data,
    conto_id: input.conto_id,
    categoria_id: input.categoria_id,
    descrizione: input.descrizione,
    importo: input.importo,
    ricorrente: input.ricorrente ?? false,
    frequenza: input.ricorrente ? input.frequenza : null,
    stato_abbonamento: statoAbbonamento,
    obiettivo_id: input.obiettivo_id || null,
  };
  const { data, error } = await supabase.from("transazioni").insert(riga).select(SELECT_TRANSAZIONE).single();
  if (error) throw error;
  return data;
}

export async function aggiornaTransazione(id, input) {
  // Se era già un abbonamento, tiene il suo stato. Se viene spuntato
  // ora come abbonamento (stato ancora vuoto), lo eredita dagli
  // addebiti precedenti con la stessa descrizione, come alla creazione.
  let statoAbbonamento = null;
  if (input.ricorrente) {
    statoAbbonamento = input.stato_abbonamento || (await statoAbbonamentoEreditato(input.descrizione, id));
  }

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
      stato_abbonamento: statoAbbonamento,
      obiettivo_id: input.obiettivo_id || null,
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

export async function aggiornaImpostazioni(ratio) {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("impostazioni")
    .update({
      split_risparmio: ratio.Risparmio,
      split_bisogno: ratio.Bisogno,
      split_desiderio: ratio.Desiderio,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sessione.user.id)
    .select()
    .single();
  if (error) {
    if (error.code === "23514") {
      throw new Error("Le tre percentuali devono sommare a 100.");
    }
    throw error;
  }
  return data;
}

/* ------------------------------------------------------------
   PATRIMONIO: saldo totale, obiettivi, buoni fruttiferi
------------------------------------------------------------ */

export async function saldoContiTotale() {
  const { data, error } = await supabase.from("transazioni").select("importo");
  if (error) throw error;
  return data.reduce((s, t) => s + Number(t.importo), 0);
}

export async function listaObiettivi() {
  const { data, error } = await supabase.from("obiettivi").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export async function creaObiettivo(input) {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("obiettivi")
    .insert({ user_id: sessione.user.id, nome: input.nome.trim(), target: Number(input.target) })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aggiornaObiettivo(id, input) {
  const { data, error } = await supabase
    .from("obiettivi")
    .update({ nome: input.nome.trim(), target: Number(input.target) })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aggiornaStatoObiettivo(id, stato) {
  const { data, error } = await supabase.from("obiettivi").update({ stato }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function eliminaObiettivo(id) {
  // "Abbandona" per gli obiettivi cancella davvero (decisione esplicita,
  // diversa dagli abbonamenti) — le transazioni collegate NON vengono
  // toccate: la colonna obiettivo_id diventa solo NULL (ON DELETE SET NULL).
  const { error } = await supabase.from("obiettivi").delete().eq("id", id);
  if (error) throw error;
}

export async function listaVersamentiObiettivi() {
  const { data, error } = await supabase.from("transazioni").select("id, data, importo, obiettivo_id").not("obiettivo_id", "is", null);
  if (error) throw error;
  return data;
}

// La tabella si chiama ancora buoni_fruttiferi, ma ora contiene tutti i
// risparmi non spendibili (libretto, buoni, obbligazioni), distinti
// dalla colonna `tipo`. Prima quelli con scadenza, i senza in fondo.
export async function listaBuoni() {
  const { data, error } = await supabase.from("buoni_fruttiferi").select("*").order("scadenza", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function creaBuono(input) {
  const { data: sessione } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("buoni_fruttiferi")
    .insert({
      user_id: sessione.user.id,
      tipo: input.tipo || "Buono fruttifero",
      nome: input.nome.trim(),
      importo: Number(input.importo),
      scadenza: input.scadenza || null,
      stato: input.stato || "Bloccato",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aggiornaBuono(id, input) {
  const { data, error } = await supabase
    .from("buoni_fruttiferi")
    .update({ tipo: input.tipo, nome: input.nome.trim(), importo: Number(input.importo), scadenza: input.scadenza || null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function aggiornaStatoBuono(id, stato) {
  const { data, error } = await supabase.from("buoni_fruttiferi").update({ stato }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function eliminaBuono(id) {
  const { error } = await supabase.from("buoni_fruttiferi").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------
   ABBONAMENTI (derivati dalle transazioni ricorrenti)
------------------------------------------------------------ */

export async function listaTransazioniRicorrenti() {
  const { data, error } = await supabase
    .from("transazioni")
    .select("id, data, conto_id, categoria_id, descrizione, importo, ricorrente, frequenza, stato_abbonamento")
    .eq("ricorrente", true)
    .order("data", { ascending: false });
  if (error) throw error;
  return data;
}
