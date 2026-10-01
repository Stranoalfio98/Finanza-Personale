import React, { useEffect, useState } from "react";
import { PALETTE, MACRO, inputStyle } from "../theme.js";
import { patrimonioNetto, collegaVersamentiAObiettivi, accumulatoObiettivo, statoVisibileObiettivo, progressoObiettivo, validaObiettivo, validaBuono, TIPI_PATRIMONIO, progressoVoce } from "../calc.js";
import {
  saldoContiTotale,
  listaObiettivi,
  creaObiettivo,
  aggiornaObiettivo,
  aggiornaStatoObiettivo,
  eliminaObiettivo,
  listaVersamentiObiettivi,
  listaBuoni,
  creaBuono,
  aggiornaBuono,
  aggiornaStatoBuono,
  eliminaBuono,
} from "../lib/api.js";

const ROSSO = "#A6403A";
const euro = (v) => `€${Number(v).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Patrimonio({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [obiettivi, setObiettivi] = useState([]);
  const [buoni, setBuoni] = useState([]);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const [s, o, v, b] = await Promise.all([saldoContiTotale(), listaObiettivi(), listaVersamentiObiettivi(), listaBuoni()]);
      setSaldo(s);
      setObiettivi(collegaVersamentiAObiettivi(o, v));
      setBuoni(b);
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare il patrimonio.");
    } finally {
      setCaricamento(false);
    }
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }

  const netto = patrimonioNetto(saldo, buoni);
  const nonSpendibile = netto - saldo;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {errore && (
        <div style={{ fontSize: 13, color: ROSSO, background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>{errore}</div>
      )}

      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 13, color: c.inkSoft }}>Patrimonio netto totale</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, marginTop: 4 }}>{euro(netto)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 12, color: c.inkSoft, marginTop: 8 }}>
          <span>
            Conti, spendibile: <strong style={{ color: c.ink, fontWeight: 500 }}>{euro(saldo)}</strong>
          </span>
          <span>
            Libretto, buoni, obbligazioni e trading: <strong style={{ color: c.ink, fontWeight: 500 }}>{euro(nonSpendibile)}</strong>
          </span>
        </div>
      </div>

      <SezioneObiettivi c={c} theme={theme} obiettivi={obiettivi} setErrore={setErrore} ricarica={carica} />
      <SezioneBuoni c={c} theme={theme} buoni={buoni} setBuoni={setBuoni} setErrore={setErrore} />
    </div>
  );
}

/* ---------------------------------------------------------------
   OBIETTIVI
----------------------------------------------------------------*/
function SezioneObiettivi({ c, theme, obiettivi, setErrore, ricarica }) {
  const [showArchivio, setShowArchivio] = useState(false);
  const [nuovoVisibile, setNuovoVisibile] = useState(false);
  const [nuovo, setNuovo] = useState({ nome: "", target: "", iniziale: "" });
  const [erroriNuovo, setErroriNuovo] = useState({});
  const [inCorso, setInCorso] = useState(false);

  const [apertoId, setApertoId] = useState(null);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const [modifica, setModifica] = useState(null); // { nome, target } quando si sta modificando
  const [erroriModifica, setErroriModifica] = useState({});

  const attivi = obiettivi.filter((o) => statoVisibileObiettivo(o) !== "Archiviato");
  const archiviati = obiettivi.filter((o) => statoVisibileObiettivo(o) === "Archiviato");
  const visibili = showArchivio ? archiviati : attivi;
  const aperto = obiettivi.find((o) => o.id === apertoId);

  function apri(o) {
    setApertoId(o.id);
    setConfermaElimina(false);
    setModifica(null);
    setErroriModifica({});
  }

  function chiudi() {
    setApertoId(null);
    setConfermaElimina(false);
    setModifica(null);
  }

  async function creaNuovo() {
    const errori = validaObiettivo(nuovo);
    setErroriNuovo(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      await creaObiettivo(nuovo);
      await ricarica();
      setNuovo({ nome: "", target: "", iniziale: "" });
      setNuovoVisibile(false);
    } catch (err) {
      setErroriNuovo({ generico: err.message || "Non sono riuscito a creare l'obiettivo." });
    } finally {
      setInCorso(false);
    }
  }

  async function salvaModifica() {
    const errori = validaObiettivo(modifica);
    setErroriModifica(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      await aggiornaObiettivo(aperto.id, modifica);
      await ricarica();
      setModifica(null);
    } catch (err) {
      setErroriModifica({ generico: err.message || "Non sono riuscito a salvare le modifiche." });
    } finally {
      setInCorso(false);
    }
  }

  async function togglePausa(o) {
    try {
      await aggiornaStatoObiettivo(o.id, o.stato === "Attivo" ? "In pausa" : "Attivo");
      await ricarica();
    } catch (err) {
      setErrore(err.message || "Non sono riuscito ad aggiornare l'obiettivo.");
    }
  }

  async function abbandona(o) {
    try {
      await eliminaObiettivo(o.id);
      chiudi();
      await ricarica();
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare l'obiettivo.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>Obiettivi di risparmio</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowArchivio(!showArchivio)}
            style={{ border: `1px solid ${c.line}`, background: showArchivio ? c.gold : "transparent", color: showArchivio ? c.surface : c.inkSoft, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}
          >
            Archivio ({archiviati.length})
          </button>
          {!showArchivio && (
            <button onClick={() => setNuovoVisibile(!nuovoVisibile)} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
              + Nuovo obiettivo
            </button>
          )}
        </div>
      </div>

      {nuovoVisibile && (
        <div style={{ background: c.surface, border: `1px dashed ${c.lineStrong}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Nome obiettivo</label>
            <input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} style={inputStyle(c, erroriNuovo.nome)} placeholder="es. Fondo Auto" />
            {erroriNuovo.nome && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriNuovo.nome}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Target (€)</label>
            <input type="number" value={nuovo.target} onChange={(e) => setNuovo({ ...nuovo, target: e.target.value })} style={inputStyle(c, erroriNuovo.target)} placeholder="1000" />
            {erroriNuovo.target && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriNuovo.target}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Già accumulato (€, opzionale)</label>
            <input type="number" step="0.01" value={nuovo.iniziale} onChange={(e) => setNuovo({ ...nuovo, iniziale: e.target.value })} style={inputStyle(c, erroriNuovo.iniziale)} placeholder="0" />
            {erroriNuovo.iniziale && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriNuovo.iniziale}</div>}
          </div>
          <button onClick={creaNuovo} disabled={inCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
            {inCorso ? "…" : "Crea"}
          </button>
          {erroriNuovo.generico && <div style={{ fontSize: 12, color: ROSSO, width: "100%" }}>{erroriNuovo.generico}</div>}
        </div>
      )}

      {visibili.length === 0 && <div style={{ fontSize: 13, color: c.inkSoft, padding: "12px 0" }}>{showArchivio ? "Nessun obiettivo archiviato." : "Nessun obiettivo attivo."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibili.map((o) => {
          const accumulato = accumulatoObiettivo(o);
          const stato = statoVisibileObiettivo(o);
          const pct = progressoObiettivo(o);
          const inPausa = stato === "In pausa";
          return (
            <div
              key={o.id}
              onClick={() => apri(o)}
              style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, cursor: "pointer", opacity: inPausa ? 0.6 : 1, padding: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}
            >
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 13 }}>{o.nome}</div>
                <div style={{ fontSize: 11, color: c.inkSoft }}>
                  {stato} · {pct.toFixed(0)}%
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120, background: c.line, height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: stato === "Archiviato" ? MACRO.Risparmio[theme] : c.gold }} />
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, minWidth: 130, textAlign: "right" }}>
                €{accumulato.toLocaleString("it-IT")} / €{Number(o.target).toLocaleString("it-IT")}
              </div>
            </div>
          );
        })}
      </div>

      {aperto && (
        <div onClick={chiudi} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.surfaceRaised, border: `1px solid ${c.line}`, borderRadius: 16, width: "min(420px, 90vw)", maxHeight: "80vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{aperto.nome}</div>
              <button onClick={chiudi} aria-label="Chiudi" style={{ fontSize: 18, color: c.inkSoft, lineHeight: 1 }}>
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 16 }}>
              €{accumulatoObiettivo(aperto).toLocaleString("it-IT")} di €{Number(aperto.target).toLocaleString("it-IT")} · {statoVisibileObiettivo(aperto)}
            </div>

            {modifica && (
              <div style={{ background: c.bg, border: `1px dashed ${c.lineStrong}`, borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: c.inkSoft }}>Nome obiettivo</label>
                  <input value={modifica.nome} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} style={inputStyle(c, erroriModifica.nome)} />
                  {erroriModifica.nome && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriModifica.nome}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.inkSoft }}>Target (€)</label>
                  <input type="number" value={modifica.target} onChange={(e) => setModifica({ ...modifica, target: e.target.value })} style={inputStyle(c, erroriModifica.target)} />
                  {erroriModifica.target && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriModifica.target}</div>}
                </div>
                <div>
                  <label style={{ fontSize: 11, color: c.inkSoft }}>Già accumulato prima di Bilancio (€)</label>
                  <input type="number" step="0.01" value={modifica.iniziale} onChange={(e) => setModifica({ ...modifica, iniziale: e.target.value })} style={inputStyle(c, erroriModifica.iniziale)} placeholder="0" />
                  {erroriModifica.iniziale && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{erroriModifica.iniziale}</div>}
                  <div style={{ fontSize: 11, color: c.inkSoft, marginTop: 4 }}>
                    Quanto avevi già messo da parte nei mesi in cui non usavi il sito. Le transazioni collegate a questo obiettivo si sommano a questa cifra.
                  </div>
                </div>
                {erroriModifica.generico && <div style={{ fontSize: 12, color: ROSSO }}>{erroriModifica.generico}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setModifica(null)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
                    Annulla
                  </button>
                  <button onClick={salvaModifica} disabled={inCorso} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, background: c.gold, color: c.surface, fontWeight: 500, opacity: inCorso ? 0.6 : 1 }}>
                    {inCorso ? "…" : "Salva modifiche"}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: c.inkSoft }}>
                  Se alzi il target sopra quanto hai già accumulato, un obiettivo archiviato torna tra quelli attivi.
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, letterSpacing: 0.4, color: c.inkSoft, marginBottom: 8 }}>STORICO VERSAMENTI</div>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
              {aperto.storico.length === 0 && !(Number(aperto.iniziale) > 0) && <div style={{ fontSize: 12, color: c.inkSoft, padding: "6px 0" }}>Nessun versamento ancora — collegane uno da Transazioni.</div>}
              {aperto.storico.map((h, i) => (
                <div key={h.id} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${c.line}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: c.inkSoft }}>{new Date(h.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>€{Math.abs(h.importo).toFixed(2)}</span>
                </div>
              ))}
              {Number(aperto.iniziale) > 0 && (
                <div style={{ padding: "8px 0", borderTop: aperto.storico.length > 0 ? `1px solid ${c.line}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: c.inkSoft }}>Accumulato prima di Bilancio</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>€{Number(aperto.iniziale).toFixed(2)}</span>
                </div>
              )}
            </div>

            {!modifica && !confermaElimina && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => {
                    setModifica({ nome: aperto.nome, target: String(aperto.target), iniziale: Number(aperto.iniziale) > 0 ? String(aperto.iniziale) : "" });
                    setErroriModifica({});
                  }}
                  style={{ borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 500, background: c.gold, color: c.surface }}
                >
                  Modifica nome, target o già accumulato
                </button>
                {statoVisibileObiettivo(aperto) !== "Archiviato" && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => togglePausa(aperto)} style={{ flex: 1, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 500, border: `1px solid ${c.line}`, color: c.ink, background: "transparent" }}>
                      {aperto.stato === "Attivo" ? "Metti in pausa" : "Riprendi obiettivo"}
                    </button>
                    <button
                      onClick={() => setConfermaElimina(true)}
                      style={{ flex: 1, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 500, border: `1px solid ${MACRO.Desiderio[theme]}`, color: MACRO.Desiderio[theme], background: "transparent" }}
                    >
                      Abbandona obiettivo
                    </button>
                  </div>
                )}
              </div>
            )}

            {confermaElimina && (
              <div style={{ background: "#A6403A15", border: `1px solid ${ROSSO}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  Eliminare definitivamente <strong>{aperto.nome}</strong>? Non si può annullare — i versamenti già fatti restano comunque nelle tue transazioni.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfermaElimina(false)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
                    Annulla
                  </button>
                  <button onClick={() => abbandona(aperto)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, background: ROSSO, color: "#fff", fontWeight: 500 }}>
                    Sì, elimina
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   LIBRETTO, BUONI E OBBLIGAZIONI
   Soldi non spendibili: contano nel patrimonio totale, mai nel
   saldo dei conti né nel budget del mese. Non vanno inseriti come
   transazioni.
----------------------------------------------------------------*/
const STATI_BUONO = ["Bloccato", "In scadenza", "Scambiato"];
const FORM_BUONO_VUOTO = { tipo: "Buono fruttifero", nome: "", importo: "", scadenza: "", target: "" };

function ordinaPerScadenza(lista) {
  return [...lista].sort((a, b) => {
    if (!a.scadenza) return 1;
    if (!b.scadenza) return -1;
    return a.scadenza.localeCompare(b.scadenza);
  });
}

function SezioneBuoni({ c, theme, buoni, setBuoni, setErrore }) {
  const [nuovoVisibile, setNuovoVisibile] = useState(false);
  const [nuovo, setNuovo] = useState(FORM_BUONO_VUOTO);
  const [erroriNuovo, setErroriNuovo] = useState({});
  const [inCorso, setInCorso] = useState(false);

  const [modificaId, setModificaId] = useState(null);
  const [modifica, setModifica] = useState(null);
  const [erroriModifica, setErroriModifica] = useState({});
  const [eliminaId, setEliminaId] = useState(null);

  async function crea() {
    const errori = validaBuono(nuovo);
    setErroriNuovo(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      const creato = await creaBuono(nuovo);
      setBuoni(ordinaPerScadenza([...buoni, creato]));
      setNuovo(FORM_BUONO_VUOTO);
      setNuovoVisibile(false);
    } catch (err) {
      setErroriNuovo({ generico: err.message || "Non sono riuscito a salvare la voce." });
    } finally {
      setInCorso(false);
    }
  }

  function apriModifica(b) {
    setModificaId(b.id);
    setModifica({ tipo: b.tipo || "Buono fruttifero", nome: b.nome, importo: String(b.importo), scadenza: b.scadenza || "", target: b.target ? String(b.target) : "" });
    setErroriModifica({});
    setEliminaId(null);
  }

  async function salvaModifica() {
    const errori = validaBuono(modifica);
    setErroriModifica(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      const aggiornato = await aggiornaBuono(modificaId, modifica);
      setBuoni(ordinaPerScadenza(buoni.map((x) => (x.id === modificaId ? aggiornato : x))));
      setModificaId(null);
    } catch (err) {
      setErroriModifica({ generico: err.message || "Non sono riuscito a salvare le modifiche." });
    } finally {
      setInCorso(false);
    }
  }

  async function cambiaStato(b, stato) {
    try {
      const aggiornato = await aggiornaStatoBuono(b.id, stato);
      setBuoni(buoni.map((x) => (x.id === b.id ? aggiornato : x)));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito ad aggiornare lo stato.");
    }
  }

  async function rimuovi(b) {
    try {
      await eliminaBuono(b.id);
      setBuoni(buoni.filter((x) => x.id !== b.id));
      setEliminaId(null);
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare la voce.");
    }
  }

  const totale = buoni.reduce((s, b) => s + (Number(b.importo) || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>Libretto, buoni, obbligazioni e fondo trading</div>
        <button onClick={() => setNuovoVisibile(!nuovoVisibile)} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
          + Aggiungi
        </button>
      </div>
      <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 12 }}>
        Soldi che hai ma non puoi spendere subito. Contano nel patrimonio totale ({euro(totale)}), non nel saldo né nel budget del mese, quindi non vanno inseriti anche come transazioni. Puoi dare a una voce un target (es. Fondo trading a €10.000) per vedere quanto manca.
      </div>

      {nuovoVisibile && (
        <FormBuono c={c} valori={nuovo} setValori={setNuovo} errori={erroriNuovo} inCorso={inCorso} etichetta="Salva" onSalva={crea} onAnnulla={() => setNuovoVisibile(false)} />
      )}

      {buoni.length === 0 && <div style={{ fontSize: 13, color: c.inkSoft }}>Nessuna voce ancora.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {buoni.map((b) =>
          modificaId === b.id ? (
            <FormBuono key={b.id} c={c} valori={modifica} setValori={setModifica} errori={erroriModifica} inCorso={inCorso} etichetta="Salva modifiche" onSalva={salvaModifica} onAnnulla={() => setModificaId(null)} />
          ) : (
            <div key={b.id} style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, letterSpacing: 0.4, padding: "2px 7px", borderRadius: 20, border: `1px solid ${c.line}`, color: c.inkSoft, background: c.bg }}>{(b.tipo || "Buono fruttifero").toUpperCase()}</span>
                    <span style={{ fontSize: 14 }}>{b.nome}</span>
                  </div>
                  {b.scadenza && <div style={{ fontSize: 12, color: c.inkSoft, marginTop: 3 }}>scade il {new Date(b.scadenza).toLocaleDateString("it-IT")}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {(b.tipo || "Buono fruttifero") === "Buono fruttifero" && (
                    <select
                      value={b.stato}
                      onChange={(e) => cambiaStato(b, e.target.value)}
                      style={{ fontSize: 11, borderRadius: 20, background: c.bg, border: `1px solid ${c.line}`, color: c.inkSoft, padding: "3px 8px" }}
                    >
                      {STATI_BUONO.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>{euro(b.importo)}</span>
                  <button onClick={() => apriModifica(b)} style={{ fontSize: 12, color: c.gold }}>
                    Modifica
                  </button>
                  <button onClick={() => setEliminaId(b.id)} aria-label={`Elimina ${b.nome}`} style={{ color: c.inkSoft, fontSize: 16, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
              </div>
              <BarraTarget c={c} theme={theme} voce={b} />
              {eliminaId === b.id && (
                <div style={{ background: "#A6403A15", border: `1px solid ${ROSSO}`, borderRadius: 10, padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12 }}>
                    Eliminare <strong>{b.nome}</strong>? Non si può annullare.
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEliminaId(null)} style={{ borderRadius: 8, padding: "6px 12px", fontSize: 12, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
                      Annulla
                    </button>
                    <button onClick={() => rimuovi(b)} style={{ borderRadius: 8, padding: "6px 12px", fontSize: 12, background: ROSSO, color: "#fff", fontWeight: 500 }}>
                      Sì, elimina
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function FormBuono({ c, valori, setValori, errori, inCorso, etichetta, onSalva, onAnnulla }) {
  const serveScadenza = valori.tipo === "Buono fruttifero";
  return (
    <div style={{ background: c.surface, border: `1px dashed ${c.lineStrong}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: c.inkSoft }}>Tipo</label>
          <select value={valori.tipo} onChange={(e) => setValori({ ...valori, tipo: e.target.value })} style={inputStyle(c, errori.tipo)}>
            {TIPI_PATRIMONIO.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: c.inkSoft }}>Nome</label>
          <input
            value={valori.nome}
            onChange={(e) => setValori({ ...valori, nome: e.target.value })}
            style={inputStyle(c, errori.nome)}
            placeholder={{ Libretto: "es. Libretto Postale", Obbligazioni: "es. BTP Valore 2030", "Fondo trading": "es. Capitale trading" }[valori.tipo] || "es. Buono 3x4"}
          />
          {errori.nome && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{errori.nome}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, color: c.inkSoft }}>Importo (€)</label>
          <input type="number" step="0.01" value={valori.importo} onChange={(e) => setValori({ ...valori, importo: e.target.value })} style={inputStyle(c, errori.importo)} placeholder="3000" />
          {errori.importo && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{errori.importo}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, color: c.inkSoft }}>Scadenza{serveScadenza ? "" : " (opzionale)"}</label>
          <input type="date" value={valori.scadenza} onChange={(e) => setValori({ ...valori, scadenza: e.target.value })} style={inputStyle(c, errori.scadenza)} />
          {errori.scadenza && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{errori.scadenza}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, color: c.inkSoft }}>Target € (opzionale)</label>
          <input type="number" step="0.01" value={valori.target} onChange={(e) => setValori({ ...valori, target: e.target.value })} style={inputStyle(c, errori.target)} placeholder={valori.tipo === "Fondo trading" ? "10000" : "nessuno"} />
          {errori.target && <div style={{ fontSize: 11, color: ROSSO, marginTop: 3 }}>{errori.target}</div>}
        </div>
      </div>
      {errori.generico && <div style={{ fontSize: 12, color: ROSSO }}>{errori.generico}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onAnnulla} style={{ borderRadius: 8, padding: "8px 14px", fontSize: 13, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
          Annulla
        </button>
        <button onClick={onSalva} disabled={inCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, opacity: inCorso ? 0.6 : 1 }}>
          {inCorso ? "…" : etichetta}
        </button>
      </div>
    </div>
  );
}

/** Barra di avanzamento verso il target di una voce (solo se ha un target). */
function BarraTarget({ c, theme, voce }) {
  const p = progressoVoce(voce);
  if (!p) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ background: c.line, height: 8, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${p.percentuale}%`, height: "100%", background: p.raggiunto ? MACRO.Risparmio[theme] : c.gold }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 12, color: c.inkSoft }}>
        <span>
          {p.percentuale.toFixed(0)}% di {euro(voce.target)}
        </span>
        <span>{p.raggiunto ? "" : `mancano ${euro(p.mancante)}`}</span>
      </div>
      {p.raggiunto && (
        <div style={{ fontSize: 12, color: MACRO.Risparmio[theme], background: `${MACRO.Risparmio[theme]}15`, border: `1px solid ${MACRO.Risparmio[theme]}40`, borderRadius: 8, padding: "8px 10px" }}>
          Target raggiunto.{" "}
          {voce.tipo === "Fondo trading"
            ? "Da ora puoi registrare i nuovi profitti in Transazioni come entrata (📈 P/L Trading Profitto): conteranno come soldi da spendere."
            : "Puoi alzare il target o lasciarlo così."}
        </div>
      )}
    </div>
  );
}
