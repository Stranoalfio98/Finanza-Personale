import React, { useEffect, useState } from "react";
import { PALETTE, MACRO, inputStyle } from "../theme.js";
import { patrimonioNetto, collegaVersamentiAObiettivi, accumulatoObiettivo, statoVisibileObiettivo, progressoObiettivo, validaObiettivo, validaBuono } from "../calc.js";
import {
  saldoContiTotale,
  listaObiettivi,
  creaObiettivo,
  aggiornaStatoObiettivo,
  eliminaObiettivo,
  listaVersamentiObiettivi,
  listaBuoni,
  creaBuono,
  aggiornaStatoBuono,
  eliminaBuono,
} from "../lib/api.js";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {errore && (
        <div style={{ fontSize: 13, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>{errore}</div>
      )}

      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontSize: 13, color: c.inkSoft }}>Patrimonio netto totale</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 32, marginTop: 4 }}>€{netto.toLocaleString("it-IT", { minimumFractionDigits: 2 })}</div>
        <div style={{ fontSize: 12, color: c.inkSoft, marginTop: 2 }}>conti liquidi (€{saldo.toFixed(2)}) + buoni fruttiferi</div>
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
  const [nuovo, setNuovo] = useState({ nome: "", target: "" });
  const [erroriNuovo, setErroriNuovo] = useState({});
  const [inCorso, setInCorso] = useState(false);

  const [apertoId, setApertoId] = useState(null);
  const [confermaElimina, setConfermaElimina] = useState(false);

  const attivi = obiettivi.filter((o) => statoVisibileObiettivo(o) !== "Archiviato");
  const archiviati = obiettivi.filter((o) => statoVisibileObiettivo(o) === "Archiviato");
  const visibili = showArchivio ? archiviati : attivi;
  const aperto = obiettivi.find((o) => o.id === apertoId);

  async function creaNuovo() {
    const errori = validaObiettivo(nuovo);
    setErroriNuovo(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      await creaObiettivo(nuovo);
      await ricarica();
      setNuovo({ nome: "", target: "" });
      setNuovoVisibile(false);
    } catch (err) {
      setErroriNuovo({ generico: err.message || "Non sono riuscito a creare l'obiettivo." });
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
      setApertoId(null);
      setConfermaElimina(false);
      await ricarica();
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare l'obiettivo.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
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
            {erroriNuovo.nome && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriNuovo.nome}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Target (€)</label>
            <input type="number" value={nuovo.target} onChange={(e) => setNuovo({ ...nuovo, target: e.target.value })} style={inputStyle(c, erroriNuovo.target)} placeholder="1000" />
            {erroriNuovo.target && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriNuovo.target}</div>}
          </div>
          <button onClick={creaNuovo} disabled={inCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
            {inCorso ? "…" : "Crea"}
          </button>
          {erroriNuovo.generico && <div style={{ fontSize: 12, color: "#A6403A", width: "100%" }}>{erroriNuovo.generico}</div>}
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
              onClick={() => setApertoId(o.id)}
              style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, cursor: "pointer", opacity: inPausa ? 0.6 : 1, padding: 14, display: "flex", alignItems: "center", gap: 14 }}
            >
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 13 }}>{o.nome}</div>
                <div style={{ fontSize: 11, color: c.inkSoft }}>{stato}</div>
              </div>
              <div style={{ flex: 1, background: c.line, height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: stato === "Archiviato" ? MACRO.Risparmio[theme] : c.gold }} />
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, minWidth: 130, textAlign: "right" }}>
                €{accumulato.toLocaleString("it-IT")} / €{o.target.toLocaleString("it-IT")}
              </div>
            </div>
          );
        })}
      </div>

      {aperto && (
        <div
          onClick={() => {
            setApertoId(null);
            setConfermaElimina(false);
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.surfaceRaised, border: `1px solid ${c.line}`, borderRadius: 16, width: "min(420px, 90vw)", maxHeight: "80vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{aperto.nome}</div>
              <button onClick={() => setApertoId(null)} style={{ fontSize: 18, color: c.inkSoft, lineHeight: 1 }}>
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 16 }}>
              €{accumulatoObiettivo(aperto).toLocaleString("it-IT")} di €{aperto.target.toLocaleString("it-IT")} · {statoVisibileObiettivo(aperto)}
            </div>

            <div style={{ fontSize: 11, letterSpacing: 0.4, color: c.inkSoft, marginBottom: 8 }}>STORICO VERSAMENTI</div>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
              {aperto.storico.length === 0 && <div style={{ fontSize: 12, color: c.inkSoft, padding: "6px 0" }}>Nessun versamento ancora — collegane uno da Transazioni.</div>}
              {aperto.storico.map((h, i) => (
                <div key={h.id} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${c.line}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: c.inkSoft }}>{new Date(h.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>€{Math.abs(h.importo).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {statoVisibileObiettivo(aperto) !== "Archiviato" && !confermaElimina && (
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

            {confermaElimina && (
              <div style={{ background: "#A6403A15", border: "1px solid #A6403A", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 10 }}>
                  Eliminare definitivamente <strong>{aperto.nome}</strong>? Non si può annullare — i versamenti già fatti restano comunque nelle tue transazioni.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfermaElimina(false)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
                    Annulla
                  </button>
                  <button onClick={() => abbandona(aperto)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, background: "#A6403A", color: "#fff", fontWeight: 500 }}>
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
   BUONI FRUTTIFERI
----------------------------------------------------------------*/
const STATI_BUONO = ["Bloccato", "In scadenza", "Scambiato"];

function SezioneBuoni({ c, theme, buoni, setBuoni, setErrore }) {
  const [nuovoVisibile, setNuovoVisibile] = useState(false);
  const [nuovo, setNuovo] = useState({ nome: "", importo: "", scadenza: "" });
  const [erroriNuovo, setErroriNuovo] = useState({});
  const [inCorso, setInCorso] = useState(false);

  async function crea() {
    const errori = validaBuono(nuovo);
    setErroriNuovo(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      const creato = await creaBuono(nuovo);
      setBuoni([...buoni, creato].sort((a, b) => a.scadenza.localeCompare(b.scadenza)));
      setNuovo({ nome: "", importo: "", scadenza: "" });
      setNuovoVisibile(false);
    } catch (err) {
      setErroriNuovo({ generico: err.message || "Non sono riuscito a creare il buono." });
    } finally {
      setInCorso(false);
    }
  }

  async function cambiaStato(b, stato) {
    try {
      const aggiornato = await aggiornaStatoBuono(b.id, stato);
      setBuoni(buoni.map((x) => (x.id === b.id ? aggiornato : x)));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito ad aggiornare il buono.");
    }
  }

  async function rimuovi(b) {
    try {
      await eliminaBuono(b.id);
      setBuoni(buoni.filter((x) => x.id !== b.id));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare il buono.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>Buoni fruttiferi</div>
        <button onClick={() => setNuovoVisibile(!nuovoVisibile)} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
          + Nuovo buono
        </button>
      </div>

      {nuovoVisibile && (
        <div style={{ background: c.surface, border: `1px dashed ${c.lineStrong}`, borderRadius: 12, padding: 14, marginBottom: 12, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Nome</label>
            <input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} style={inputStyle(c, erroriNuovo.nome)} placeholder="es. Buono Fruttifero C" />
            {erroriNuovo.nome && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriNuovo.nome}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Importo (€)</label>
            <input type="number" value={nuovo.importo} onChange={(e) => setNuovo({ ...nuovo, importo: e.target.value })} style={inputStyle(c, erroriNuovo.importo)} placeholder="3000" />
            {erroriNuovo.importo && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriNuovo.importo}</div>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: c.inkSoft }}>Scadenza</label>
            <input type="date" value={nuovo.scadenza} onChange={(e) => setNuovo({ ...nuovo, scadenza: e.target.value })} style={inputStyle(c, erroriNuovo.scadenza)} />
            {erroriNuovo.scadenza && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriNuovo.scadenza}</div>}
          </div>
          <button onClick={crea} disabled={inCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
            {inCorso ? "…" : "Crea"}
          </button>
          {erroriNuovo.generico && <div style={{ fontSize: 12, color: "#A6403A", width: "100%" }}>{erroriNuovo.generico}</div>}
        </div>
      )}

      {buoni.length === 0 && <div style={{ fontSize: 13, color: c.inkSoft }}>Nessun buono fruttifero ancora.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {buoni.map((b) => (
          <div key={b.id} style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14 }}>{b.nome}</div>
              <div style={{ fontSize: 12, color: c.inkSoft }}>scade il {new Date(b.scadenza).toLocaleDateString("it-IT")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>€{Number(b.importo).toLocaleString("it-IT")}</span>
              <button onClick={() => rimuovi(b)} aria-label={`Rimuovi ${b.nome}`} style={{ color: c.inkSoft, fontSize: 16, lineHeight: 1 }}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
