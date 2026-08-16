// calc.js
// Tutta la logica di calcolo del progetto vive qui, separata dall'interfaccia.
// Ogni funzione è pura (stessi input -> stesso output, nessun effetto
// collaterale) per poterla testare senza dover simulare React o il database.

/* ------------------------------------------------------------------
   ABBONAMENTI
------------------------------------------------------------------ */

// Mesi coperti da ogni ciclo di fatturazione, per normalizzare
// qualunque frequenza a un "costo mensile equivalente".
export const MESI_CICLO = { Mensile: 1, Trimestrale: 3, Semestrale: 6, Annuale: 12 };

/**
 * Costo mensile equivalente di un abbonamento, a prescindere dalla
 * frequenza con cui viene addebitato.
 * @param {{importo: number, frequenza: keyof typeof MESI_CICLO}} abbonamento
 */
export function mensileEquivalente(abbonamento) {
  const mesi = MESI_CICLO[abbonamento.frequenza];
  if (!mesi) {
    throw new Error(`Frequenza non valida: "${abbonamento.frequenza}"`);
  }
  return abbonamento.importo / mesi;
}

/**
 * Totale mensile di tutti gli abbonamenti attivi (gli abbandonati
 * non contano più nel costo corrente, ma restano nello storico).
 */
export function totaleAbbonamentiMensile(abbonamenti) {
  return abbonamenti.filter((a) => a.stato === "Attivo").reduce((s, a) => s + mensileEquivalente(a), 0);
}

/* ------------------------------------------------------------------
   BUDGET MENSILE (split Risparmio / Bisogno / Desiderio)
------------------------------------------------------------------ */

/**
 * Split di budget dato in percentuali (es. {Risparmio: 35, Bisogno: 22.7,
 * Desiderio: 42.3}). Deve sommare a 100 — la UI valida questo, qui lo
 * verifichiamo per non propagare uno split rotto nei calcoli.
 */
export function sommaSplit(ratio) {
  return ratio.Risparmio + ratio.Bisogno + ratio.Desiderio;
}

export function splitValido(ratio, tolleranza = 0.05) {
  return Math.abs(sommaSplit(ratio) - 100) <= tolleranza;
}

/**
 * Target teorico di spesa per ciascuna macrocategoria, dato l'incasso
 * del mese e lo split percentuale.
 */
export function budgetTeorico(entrata, ratio) {
  return {
    Risparmio: (entrata * ratio.Risparmio) / 100,
    Bisogno: (entrata * ratio.Bisogno) / 100,
    Desiderio: (entrata * ratio.Desiderio) / 100,
  };
}

/**
 * Riga di budget per un singolo mese: target teorico per categoria,
 * spesa effettiva, quanto è rimasto "non allocato" (positivo = sotto
 * budget, negativo = sopra budget).
 */
export function rigaBudgetMensile(mese, ratio) {
  const teorico = budgetTeorico(mese.entrata, ratio);
  const spesaIpotetica = teorico.Risparmio + teorico.Bisogno + teorico.Desiderio;
  const spesaEffettiva = mese.risReale + mese.bisReale + mese.desReale;
  return {
    ...mese,
    risT: teorico.Risparmio,
    bisT: teorico.Bisogno,
    desT: teorico.Desiderio,
    spesaIpotetica,
    spesaEffettiva,
    nonAllocato: spesaIpotetica - spesaEffettiva,
  };
}

/**
 * Tabella budget completa (una riga per mese) con la colonna
 * Cumulativo calcolata a cascata, esattamente come nel foglio Excel
 * originale "Dettagli Mesi".
 */
export function tabellaBudgetMensile(mesi, ratio) {
  let cumulativo = 0;
  return mesi.map((m) => {
    const riga = rigaBudgetMensile(m, ratio);
    cumulativo += riga.nonAllocato;
    return { ...riga, cumulativo };
  });
}

/* ------------------------------------------------------------------
   OBIETTIVI DI RISPARMIO
------------------------------------------------------------------ */

/** Somma dei versamenti di un obiettivo. */
export function accumulatoObiettivo(obiettivo) {
  return obiettivo.storico.reduce((s, h) => s + h.importo, 0);
}

/**
 * Stato "visibile" di un obiettivo: se l'accumulato ha raggiunto il
 * target, l'obiettivo va automaticamente in Archiviato, a prescindere
 * dallo stato manuale (Attivo/In pausa) che aveva prima.
 */
export function statoVisibileObiettivo(obiettivo) {
  return accumulatoObiettivo(obiettivo) >= obiettivo.target ? "Archiviato" : obiettivo.stato;
}

export function progressoObiettivo(obiettivo) {
  if (obiettivo.target <= 0) return 0;
  return Math.min(100, (accumulatoObiettivo(obiettivo) / obiettivo.target) * 100);
}

/* ------------------------------------------------------------------
   PATRIMONIO
------------------------------------------------------------------ */

/** Patrimonio netto totale: conti liquidi + buoni fruttiferi. */
export function patrimonioNetto(saldoConti, buoni) {
  const totBuoni = buoni.reduce((s, b) => s + b.importo, 0);
  return saldoConti + totBuoni;
}

/* ------------------------------------------------------------------
   VALIDAZIONE FORM TRANSAZIONE
------------------------------------------------------------------ */

/**
 * Valida i campi del form "nuova transazione". Ritorna un oggetto
 * di errori: vuoto {} se tutto è valido.
 */
export function validaTransazione(form) {
  const errori = {};
  const importo = Number(form.importo);
  if (!form.importo || Number.isNaN(importo) || importo <= 0) {
    errori.importo = "Inserisci un importo maggiore di zero";
  }
  if (!form.descr || !form.descr.trim()) {
    errori.descr = "La descrizione è obbligatoria";
  }
  if (!form.cat) {
    errori.cat = "Seleziona una categoria";
  }
  if (form.ricorrente && !MESI_CICLO[form.frequenza]) {
    errori.frequenza = "Seleziona una frequenza valida";
  }
  return errori;
}

/* ------------------------------------------------------------------
   VALIDAZIONE FORM AUTENTICAZIONE
------------------------------------------------------------------ */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida email e password per login/registrazione.
 * Ritorna un oggetto di errori: vuoto {} se tutto è valido.
 */
export function validaAuth(form) {
  const errori = {};
  if (!form.email || !EMAIL_REGEX.test(form.email.trim())) {
    errori.email = "Inserisci un indirizzo email valido";
  }
  if (!form.password || form.password.length < 8) {
    errori.password = "La password deve avere almeno 8 caratteri";
  }
  return errori;
}
