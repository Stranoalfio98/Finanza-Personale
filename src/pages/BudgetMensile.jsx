import React, { useEffect, useState } from "react";
import { PALETTE, MACRO } from "../theme.js";
import { tabellaBudgetMensile, aggregaTransazioniPerMese, splitValido } from "../calc.js";
import { listaTransazioniPerBudget, getImpostazioni } from "../lib/api.js";

export default function BudgetMensile({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [righe, setRighe] = useState([]);
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const [transazioni, impostazioni] = await Promise.all([listaTransazioniPerBudget(), getImpostazioni()]);
      const ratioCorrente = {
        Risparmio: Number(impostazioni.split_risparmio),
        Bisogno: Number(impostazioni.split_bisogno),
        Desiderio: Number(impostazioni.split_desiderio),
      };
      const mesi = aggregaTransazioniPerMese(transazioni);
      setRighe(tabellaBudgetMensile(mesi, ratioCorrente));
      setRatio(ratioCorrente);
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare il budget mensile.");
    } finally {
      setCaricamento(false);
    }
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }

  if (errore) {
    return (
      <div style={{ fontSize: 13, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>
        {errore}
      </div>
    );
  }

  const CellMacro = ({ target, reale }) => {
    const sopra = reale > target;
    return (
      <td style={{ padding: "10px 14px", textAlign: "right" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: sopra ? MACRO.Desiderio[theme] : c.ink }}>€{reale.toFixed(0)}</div>
        <div style={{ fontSize: 11, color: c.inkSoft }}>su €{target.toFixed(0)}</div>
      </td>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {ratio && (
        <div style={{ fontSize: 12, color: c.inkSoft }}>
          Split {ratio.Risparmio}% 🟢 Risparmio · {ratio.Bisogno}% 🟣 Bisogno · {ratio.Desiderio}% 🔴 Desiderio, applicato all'entrata di ogni mese.
          {!splitValido(ratio) && (
            <span style={{ color: "#A6403A", marginLeft: 6 }}>⚠ le percentuali non sommano a 100 — controllalo nelle Impostazioni.</span>
          )}
        </div>
      )}

      {righe.length === 0 ? (
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 24, textAlign: "center", color: c.inkSoft, fontSize: 13 }}>
          Non ci sono ancora transazioni da raggruppare per mese. Aggiungine qualcuna nella pagina Transazioni.
        </div>
      ) : (
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.line}` }}>
                {["Mese", "Entrata", "🟢 Risparmio", "🟣 Bisogno", "🔴 Desiderio", "Non allocato", "Cumulativo"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "10px 14px", color: c.inkSoft, fontWeight: 500, fontSize: 11, letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.chiave} style={{ borderBottom: `1px solid ${c.line}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{r.mese}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>€{r.entrata.toFixed(0)}</td>
                  <CellMacro target={r.risT} reale={r.risReale} />
                  <CellMacro target={r.bisT} reale={r.bisReale} />
                  <CellMacro target={r.desT} reale={r.desReale} />
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: r.nonAllocato >= 0 ? MACRO.Risparmio[theme] : MACRO.Desiderio[theme] }}>
                    {r.nonAllocato >= 0 ? "+" : ""}€{r.nonAllocato.toFixed(0)}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, color: r.cumulativo >= 0 ? c.gold : MACRO.Desiderio[theme] }}>
                    €{r.cumulativo.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
