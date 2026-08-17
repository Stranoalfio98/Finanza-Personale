import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PALETTE, MACRO } from "../theme.js";
import { aggregaTransazioniPerMese, tabellaBudgetMensile, raggruppaAbbonamenti, totaleAbbonamentiAttivi } from "../calc.js";
import { saldoContiTotale, listaTransazioniPerBudget, getImpostazioni, listaTransazioniRicorrenti } from "../lib/api.js";

export default function Dashboard({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [trend, setTrend] = useState([]);
  const [speseReali, setSpeseReali] = useState({ Risparmio: 0, Bisogno: 0, Desiderio: 0 });
  const [budgetTeorico, setBudgetTeorico] = useState({ Risparmio: 0, Bisogno: 0, Desiderio: 0 });
  const [totAbbonamenti, setTotAbbonamenti] = useState(0);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const [s, transazioniBudget, impostazioni, ricorrenti] = await Promise.all([
        saldoContiTotale(),
        listaTransazioniPerBudget(),
        getImpostazioni(),
        listaTransazioniRicorrenti(),
      ]);

      const ratio = { Risparmio: Number(impostazioni.split_risparmio), Bisogno: Number(impostazioni.split_bisogno), Desiderio: Number(impostazioni.split_desiderio) };
      const mesi = aggregaTransazioniPerMese(transazioniBudget);
      const righe = tabellaBudgetMensile(mesi, ratio);

      setSaldo(s);
      setTrend(righe.slice(-6).map((r) => ({ mese: r.mese.split(" ")[0].slice(0, 3), entrate: r.entrata, spese: r.risReale + r.bisReale + r.desReale })));
      setSpeseReali({
        Risparmio: righe.reduce((sum, r) => sum + r.risReale, 0),
        Bisogno: righe.reduce((sum, r) => sum + r.bisReale, 0),
        Desiderio: righe.reduce((sum, r) => sum + r.desReale, 0),
      });
      setBudgetTeorico({
        Risparmio: righe.reduce((sum, r) => sum + r.risT, 0),
        Bisogno: righe.reduce((sum, r) => sum + r.bisT, 0),
        Desiderio: righe.reduce((sum, r) => sum + r.desT, 0),
      });
      setTotAbbonamenti(totaleAbbonamentiAttivi(raggruppaAbbonamenti(ricorrenti)));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare la dashboard.");
    } finally {
      setCaricamento(false);
    }
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {errore && (
        <div style={{ fontSize: 13, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>{errore}</div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div style={{ background: c.surface, border: `1px dashed ${c.lineStrong}`, borderRadius: 16, padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 220 }}>
          <div style={{ width: 132, height: 132, borderRadius: "50%", border: `2px solid ${c.gold}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: `1px solid ${c.gold}`, opacity: 0.5 }} />
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: c.inkSoft, marginBottom: 2 }}>SALDO</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 600, color: c.gold }}>
              €{saldo.toLocaleString("it-IT", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20, flex: 1, minWidth: 280 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 4 }}>Entrate vs Spese</div>
          <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 12 }}>ultimi {trend.length} mesi con dati</div>
          {trend.length === 0 ? (
            <div style={{ fontSize: 13, color: c.inkSoft, padding: "20px 0" }}>Nessuna transazione ancora — il grafico comparirà con i primi dati.</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={trend} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" stroke={c.line} vertical={false} />
                <XAxis dataKey="mese" tick={{ fill: c.inkSoft, fontSize: 11 }} axisLine={{ stroke: c.line }} tickLine={false} />
                <YAxis tick={{ fill: c.inkSoft, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: c.surfaceRaised, border: `1px solid ${c.line}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="entrate" fill={MACRO.Entrate[theme]} radius={[3, 3, 0, 0]} />
                <Bar dataKey="spese" fill={MACRO.Desiderio[theme]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20, flex: 2, minWidth: 280 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 14 }}>Ripartizione budget · da quando hai iniziato</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(speseReali).map(([macro, valore]) => {
              const teorico = budgetTeorico[macro];
              const pct = teorico > 0 ? Math.min(100, (valore / teorico) * 100) : 0;
              const sopra = valore > teorico;
              return (
                <div key={macro}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>
                      {MACRO[macro].emoji} {macro}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: c.inkSoft }}>
                      €{valore.toFixed(0)} / €{teorico.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ background: c.line, height: 8, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: sopra ? MACRO.Desiderio[theme] : MACRO[macro][theme], borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20, flex: 1, minWidth: 220, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: c.inkSoft }}>Abbonamenti attivi</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, marginTop: 4 }}>€{totAbbonamenti.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: c.inkSoft, marginTop: 2 }}>al mese, equivalente</div>
        </div>
      </div>
    </div>
  );
}
