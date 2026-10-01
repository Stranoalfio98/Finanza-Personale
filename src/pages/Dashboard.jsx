import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PALETTE, MACRO } from "../theme.js";
import { aggregaTransazioniPerMese, tabellaBudgetMensile, raggruppaAbbonamenti, totaleAbbonamentiAttivi, meseChiave } from "../calc.js";
import { saldoContiTotale, listaTransazioniPerBudget, getImpostazioni, listaTransazioniRicorrenti } from "../lib/api.js";

export default function Dashboard({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [variazioneMese, setVariazioneMese] = useState(null);
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

      // Variazione del mese in corso: entrate meno uscite del mese, solo se
      // nel mese corrente c'è almeno una transazione.
      const meseCorrente = meseChiave(new Date().toISOString());
      const rigaMese = righe.find((r) => r.chiave === meseCorrente);
      setVariazioneMese(rigaMese ? rigaMese.entrata - (rigaMese.risReale + rigaMese.bisReale + rigaMese.desReale) : null);

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
        <CardSaldo c={c} theme={theme} saldo={saldo} variazioneMese={variazioneMese} />

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

/* ---------------------------------------------------------------
   CARD SALDO
   Numero in nero (rosso se negativo), oro solo sull'icona del
   portafoglio. Il numero si rimpicciolisce da solo se non entra
   nella larghezza della card, invece di uscirne.
----------------------------------------------------------------*/
const FORMATO_IT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const ROSSO = "#A6403A";

function CardSaldo({ c, theme, saldo, variazioneMese }) {
  const [intera, decimali] = Math.abs(saldo).toLocaleString("it-IT", FORMATO_IT).split(",");
  const negativo = saldo < 0;

  return (
    <div
      style={{
        background: c.surfaceRaised,
        border: `1px solid ${c.line}`,
        borderRadius: 18,
        padding: "20px 24px",
        flex: "0 1 340px",
        minWidth: 260,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 14,
        boxShadow: `0 1px 0 ${c.line}, 0 10px 30px -18px rgba(28,42,58,0.35)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: c.inkSoft }}>Saldo totale</span>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: `${c.gold}1F`, color: c.gold, display: "grid", placeItems: "center" }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h12v4" />
            <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z" />
            <circle cx="16" cy="14" r="1.2" fill="currentColor" />
          </svg>
        </span>
      </div>

      <NumeroAdattivo dimensioneMax={46} dipendenze={[saldo]}>
        <span style={{ color: negativo ? ROSSO : c.ink }}>
          {negativo ? "−" : ""}
          <span style={{ fontSize: "0.55em", fontWeight: 500, marginRight: "0.12em", verticalAlign: "0.55em", opacity: 0.75 }}>€</span>
          {intera}
          <span style={{ fontSize: "0.5em", fontWeight: 500, verticalAlign: "0.75em", marginLeft: "0.04em", opacity: 0.75 }}>,{decimali}</span>
        </span>
      </NumeroAdattivo>

      {variazioneMese !== null && <BadgeVariazione valore={variazioneMese} theme={theme} />}
    </div>
  );
}

function BadgeVariazione({ valore, theme }) {
  const giu = valore < 0;
  const colore = giu ? MACRO.Desiderio[theme] : MACRO.Risparmio[theme];
  return (
    <span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500, padding: "4px 9px", borderRadius: 20, background: `${colore}1F`, color: colore }}>
        {giu ? "↓ −€" : "↑ +€"}
        {Math.abs(valore).toLocaleString("it-IT", FORMATO_IT)} questo mese
      </span>
    </span>
  );
}

/**
 * Riduce la dimensione del testo finché non entra nella larghezza
 * disponibile. Si ricalcola quando cambia il valore o la larghezza
 * della card (es. ridimensionando la finestra o ruotando il telefono).
 */
function NumeroAdattivo({ dimensioneMax, dimensioneMin = 16, dipendenze, children }) {
  const boxRef = useRef(null);
  const testoRef = useRef(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const testo = testoRef.current;
    if (!box || !testo) return;

    function adatta() {
      let dim = dimensioneMax;
      testo.style.fontSize = `${dim}px`;
      while (testo.scrollWidth > box.clientWidth && dim > dimensioneMin) {
        dim -= 1;
        testo.style.fontSize = `${dim}px`;
      }
    }

    adatta();
    const osservatore = new ResizeObserver(adatta);
    osservatore.observe(box);
    if (document.fonts) document.fonts.ready.then(adatta);
    return () => osservatore.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensioneMax, dimensioneMin, ...dipendenze]);

  return (
    <div ref={boxRef} style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
      <span
        ref={testoRef}
        style={{
          display: "inline-block",
          whiteSpace: "nowrap",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          fontSize: dimensioneMax,
        }}
      >
        {children}
      </span>
    </div>
  );
}
