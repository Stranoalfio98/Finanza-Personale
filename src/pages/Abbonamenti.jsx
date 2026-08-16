import React, { useEffect, useState } from "react";
import { PALETTE, MACRO } from "../theme.js";
import { raggruppaAbbonamenti, totaleAbbonamentiAttivi, mensileEquivalente } from "../calc.js";
import { listaTransazioniRicorrenti, aggiornaTransazione } from "../lib/api.js";

export default function Abbonamenti({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [gruppi, setGruppi] = useState([]);
  const [apertaChiave, setApertaChiave] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const transazioni = await listaTransazioniRicorrenti();
      setGruppi(raggruppaAbbonamenti(transazioni));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare gli abbonamenti.");
    } finally {
      setCaricamento(false);
    }
  }

  async function toggleStato(gruppo) {
    const ultima = gruppo.storico[0];
    const nuovoStato = gruppo.stato === "Attivo" ? "Abbandonato" : "Attivo";
    setInCorso(true);
    try {
      await aggiornaTransazione(ultima.id, {
        data: ultima.data,
        conto_id: ultima.conto_id,
        categoria_id: ultima.categoria_id,
        descrizione: ultima.descrizione,
        importo: ultima.importo,
        ricorrente: true,
        frequenza: ultima.frequenza,
        stato_abbonamento: nuovoStato,
      });
      await carica();
      setApertaChiave(null);
    } catch (err) {
      setErrore(err.message || "Non sono riuscito ad aggiornare l'abbonamento.");
    } finally {
      setInCorso(false);
    }
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }

  const totale = totaleAbbonamentiAttivi(gruppi);
  const attivi = gruppi.filter((g) => g.stato === "Attivo").length;
  const abbandonati = gruppi.length - attivi;
  const aperto = gruppi.find((g) => g.chiave === apertaChiave);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {errore && (
        <div style={{ fontSize: 13, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>{errore}</div>
      )}

      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: c.inkSoft }}>Totale mensile equivalente</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30 }}>€{totale.toFixed(2)}</div>
        </div>
        <div style={{ fontSize: 13, color: c.inkSoft, textAlign: "right" }}>
          {attivi} attivi · {abbandonati} abbandonati
          <br />
          €{(totale * 12).toFixed(0)} / anno
        </div>
      </div>

      {gruppi.length === 0 ? (
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 24, textAlign: "center", color: c.inkSoft, fontSize: 13 }}>
          Nessun abbonamento ancora. Nella pagina Transazioni, quando aggiungi una spesa, spunta "È un abbonamento ricorrente" per vederla qui.
        </div>
      ) : (
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.line}` }}>
                {["", "Servizio", "Frequenza", "Equiv. mensile"].map((h, i) => (
                  <th key={i} style={{ textAlign: i === 3 ? "right" : "left", padding: "10px 16px", color: c.inkSoft, fontWeight: 500, fontSize: 11, letterSpacing: 0.4 }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruppi.map((g) => (
                <tr key={g.chiave} onClick={() => setApertaChiave(g.chiave)} style={{ borderBottom: `1px solid ${c.line}`, cursor: "pointer", opacity: g.stato === "Abbandonato" ? 0.55 : 1 }}>
                  <td style={{ padding: "10px 16px" }}>
                    <span title={g.stato} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: g.stato === "Attivo" ? MACRO.Risparmio[theme] : MACRO.Desiderio[theme] }} />
                  </td>
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                    {g.nome}
                    {g.nuovoAddebitoDaAbbandonato && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: c.gold }}>● nuovo addebito, ancora segnato abbandonato</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: c.bg, border: `1px solid ${c.line}`, color: c.inkSoft }}>{g.frequenza}</span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>
                    €{mensileEquivalente({ importo: g.importo, frequenza: g.frequenza }).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {aperto && (
        <div onClick={() => setApertaChiave(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.surfaceRaised, border: `1px solid ${c.line}`, borderRadius: 16, width: "min(420px, 90vw)", maxHeight: "80vh", overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: aperto.stato === "Attivo" ? MACRO.Risparmio[theme] : MACRO.Desiderio[theme] }} />
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{aperto.nome}</div>
              </div>
              <button onClick={() => setApertaChiave(null)} aria-label="Chiudi" style={{ fontSize: 18, color: c.inkSoft, lineHeight: 1 }}>
                ×
              </button>
            </div>
            <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 16 }}>
              {aperto.frequenza.toLowerCase()} · {aperto.stato}
            </div>

            {aperto.nuovoAddebitoDaAbbandonato && (
              <div style={{ fontSize: 12, background: `${c.gold}15`, border: `1px solid ${c.gold}60`, borderRadius: 8, padding: "8px 10px", marginBottom: 14 }}>
                È arrivato un nuovo addebito mentre questo abbonamento era segnato come abbandonato. Se è tornato attivo per davvero, riattivalo qui sotto.
              </div>
            )}

            <div style={{ fontSize: 11, letterSpacing: 0.4, color: c.inkSoft, marginBottom: 8 }}>STORICO ADDEBITI</div>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
              {aperto.storico.map((h, i) => (
                <div key={h.id} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${c.line}` : "none", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: c.inkSoft }}>{new Date(h.data).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>€{Math.abs(h.importo).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => toggleStato(aperto)}
              disabled={inCorso}
              style={{
                width: "100%",
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 13,
                fontWeight: 500,
                opacity: inCorso ? 0.6 : 1,
                background: aperto.stato === "Attivo" ? "transparent" : c.gold,
                color: aperto.stato === "Attivo" ? MACRO.Desiderio[theme] : c.surface,
                border: aperto.stato === "Attivo" ? `1px solid ${MACRO.Desiderio[theme]}` : "none",
              }}
            >
              {inCorso ? "…" : aperto.stato === "Attivo" ? "Abbandona abbonamento" : "Riattiva abbonamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
