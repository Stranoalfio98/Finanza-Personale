import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ComposedChart, AreaChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, LabelList } from "recharts";
import { PALETTE, MACRO } from "../theme.js";
import {
  aggregaTransazioniPerMese,
  raggruppaAbbonamenti,
  totaleAbbonamentiAttivi,
  mensileEquivalente,
  etichettaMese,
  chiaviUltimiMesi,
  serieEntrateUscite,
  saldoFineMese,
  speseDelMesePerCategoria,
  budgetDelMese,
  collegaVersamentiAObiettivi,
  accumulatoObiettivo,
  statoVisibileObiettivo,
  progressoObiettivo,
  progressoVoce,
} from "../calc.js";
import { listaTransazioniDashboard, getImpostazioni, listaTransazioniRicorrenti, listaObiettivi, listaVersamentiObiettivi, listaBuoni } from "../lib/api.js";

/* ---------------------------------------------------------------
   Formattazione
----------------------------------------------------------------*/
const euro = (v, decimali = 2) => {
  const n = Number(v) || 0;
  return (n < 0 ? "−" : "") + "€" + Math.abs(n).toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });
};
const conSegno = (v, decimali = 2) => (v >= 0 ? "+" : "") + euro(v, decimali);
const percento = (parte, tot) => (tot > 0 ? Math.round((parte / tot) * 100) : 0);

// Le sottocategorie iniziano con un'emoji (es. "🛒 Spesa Alimentare"):
// la separiamo dal nome per usarla come icona.
function separaEmoji(testo = "") {
  const m = testo.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
  return m ? { emoji: m[1], nome: m[2] } : { emoji: "•", nome: testo };
}

// Colori in più rispetto a theme.js, solo per la Dashboard.
const EXTRA = {
  light: { inkMute: "#8A919C", lineSoft: "#E8E2D0", shadow: "0 1px 0 #DAD3BE, 0 12px 32px -22px rgba(28,42,58,0.4)" },
  dark: { inkMute: "#6F7888", lineSoft: "#253040", shadow: "0 1px 0 #2C3646, 0 12px 32px -22px rgba(0,0,0,0.65)" },
};

export default function Dashboard({ theme = "light" }) {
  const c = PALETTE[theme];
  const x = EXTRA[theme];
  const col = {
    ris: MACRO.Risparmio[theme],
    bis: MACRO.Bisogno[theme],
    des: MACRO.Desiderio[theme],
    ent: MACRO.Entrate[theme],
  };

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);
  const [dati, setDati] = useState(null);
  const [mesiGrafico, setMesiGrafico] = useState(6);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const [transazioni, impostazioni, ricorrenti, obiettivi, versamenti, voci] = await Promise.all([
        listaTransazioniDashboard(),
        getImpostazioni(),
        listaTransazioniRicorrenti(),
        listaObiettivi(),
        listaVersamentiObiettivi(),
        listaBuoni(),
      ]);
      setDati({ transazioni, impostazioni, ricorrenti, obiettivi, versamenti, voci });
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare la dashboard.");
    } finally {
      setCaricamento(false);
    }
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }
  if (errore || !dati) {
    return (
      <div style={{ fontSize: 13, color: col.des, background: `${col.des}15`, border: `1px solid ${col.des}40`, borderRadius: 8, padding: "10px 14px" }}>
        {errore || "Nessun dato da mostrare."}
      </div>
    );
  }

  /* ---------------- calcoli ---------------- */
  const oggi = new Date();
  const chiaveOggi = chiaviUltimiMesi(1, oggi)[0]; // ora locale, non UTC
  const giorno = oggi.getDate();
  const giorniMese = new Date(oggi.getFullYear(), oggi.getMonth() + 1, 0).getDate();
  const nomeMese = etichettaMese(chiaveOggi).split(" ")[0];
  const nomeMeseMin = nomeMese.toLowerCase();

  const { transazioni, impostazioni, ricorrenti, obiettivi, versamenti, voci } = dati;
  const ratio = {
    Risparmio: Number(impostazioni.split_risparmio),
    Bisogno: Number(impostazioni.split_bisogno),
    Desiderio: Number(impostazioni.split_desiderio),
  };

  const disponibile = transazioni.reduce((s, t) => s + (Number(t.importo) || 0), 0);
  const nonSpendibile = voci.reduce((s, v) => s + (Number(v.importo) || 0), 0);
  const patrimonio = disponibile + nonSpendibile;

  const chiavi12 = chiaviUltimiMesi(12, oggi);
  const serie12 = serieEntrateUscite(transazioni, chiavi12);
  const meseCorrente = serie12[serie12.length - 1];
  const sparkSaldo = saldoFineMese(transazioni, chiavi12).map((v, i) => ({ chiave: chiavi12[i], saldo: v }));
  const serieGrafico = serie12.slice(-mesiGrafico).map((r) => ({ ...r, corto: r.mese.slice(0, 3) }));
  // tacche "tonde" sull'asse verticale (ogni 500 € o 1.000 €)
  const valoriAsse = serieGrafico.flatMap((r) => [r.entrate, r.uscite, r.netto]);
  const maxAsse = Math.max(0, ...valoriAsse), minAsse = Math.min(0, ...valoriAsse);
  const passo = maxAsse - minAsse > 4000 ? 1000 : 500;
  const tacche = [];
  for (let v = Math.floor(minAsse / passo) * passo; v <= Math.ceil(maxAsse / passo) * passo || tacche.length < 2; v += passo) tacche.push(v);

  const rigaMese = aggregaTransazioniPerMese(transazioni).find((r) => r.chiave === chiaveOggi) || null;
  const budget = budgetDelMese(rigaMese, ratio, giorno, giorniMese);
  const categorie = speseDelMesePerCategoria(transazioni, chiaveOggi);
  const maxCategoria = Math.max(0, ...categorie.flatMap((g) => g.voci.map((v) => v.importo)));

  const gruppiAbb = raggruppaAbbonamenti(ricorrenti);
  const abbAttivi = gruppiAbb.filter((g) => g.stato === "Attivo");
  const totAbb = totaleAbbonamentiAttivi(gruppiAbb);

  const traguardi = [
    ...collegaVersamentiAObiettivi(obiettivi, versamenti)
      .filter((o) => statoVisibileObiettivo(o) !== "Archiviato")
      .map((o) => ({ id: o.id, nome: o.nome, accumulato: accumulatoObiettivo(o), target: Number(o.target), pct: progressoObiettivo(o), pausa: o.stato === "In pausa" })),
    ...voci
      .filter((v) => progressoVoce(v))
      .map((v) => {
        const p = progressoVoce(v);
        return { id: `voce-${v.id}`, nome: v.nome, accumulato: Number(v.importo), target: Number(v.target), pct: p.percentuale, pausa: false };
      }),
  ];

  const ultime = transazioni.slice(0, 5);

  const vars = {
    "--bg": c.bg,
    "--surface": c.surface,
    "--raised": c.surfaceRaised,
    "--ink": c.ink,
    "--ink-soft": c.inkSoft,
    "--ink-mute": x.inkMute,
    "--line": c.line,
    "--line-soft": x.lineSoft,
    "--gold": c.gold,
    "--gold-soft": `${c.gold}1F`,
    "--ris": col.ris,
    "--bis": col.bis,
    "--des": col.des,
    "--ent": col.ent,
    "--shadow": x.shadow,
  };
  const colMacro = { Risparmio: "var(--ris)", Bisogno: "var(--bis)", Desiderio: "var(--des)" };

  return (
    <div className="db" style={vars}>
      <style>{CSS}</style>

      <div className="db-greet">
        <div>
          <h1>{etichettaMese(chiaveOggi)}</h1>
          <p>
            Giorno {giorno} di {giorniMese}
          </p>
        </div>
      </div>

      <div className="db-grid">
        {/* DISPONIBILE */}
        <section className="db-card db-hero">
          <div className="db-hero-top">
            <div>
              <div className="db-label">Disponibile sui conti</div>
              <div className="db-hint">Il massimo che puoi spendere o mettere da parte. Libretto, buoni e fondo trading sono esclusi.</div>
            </div>
            <span className="db-wallet" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h12v4" />
                <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z" />
                <circle cx="16" cy="14" r="1.2" fill="currentColor" />
              </svg>
            </span>
          </div>

          <NumeroAdattivo valore={disponibile} max={48} colore={disponibile < 0 ? col.des : c.ink} />

          {meseCorrente.entrate > 0 || meseCorrente.uscite > 0 ? (
            <div className="db-row-wrap">
              <span className={`db-pill ${meseCorrente.netto < 0 ? "down" : "up"}`}>
                {meseCorrente.netto < 0 ? "↓ " : "↑ "}
                {conSegno(meseCorrente.netto)} questo mese
              </span>
              <span className="db-small">entrate − uscite di {nomeMeseMin}</span>
            </div>
          ) : (
            <span className="db-small">Nessuna transazione ancora a {nomeMeseMin}.</span>
          )}

          <div style={{ height: 56 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkSaldo} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
                <defs>
                  <linearGradient id="db-spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={c.gold} stopOpacity={0.22} />
                    <stop offset="1" stopColor={c.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="saldo" stroke={c.gold} strokeWidth={2} fill="url(#db-spark)" isAnimationActive={false} dot={false} activeDot={{ r: 4, fill: c.gold, stroke: c.surfaceRaised, strokeWidth: 2 }} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="db-tip">
                        <b>Fine {etichettaMese(payload[0].payload.chiave).toLowerCase()}</b>
                        <div className="db-tip-r">
                          <span>Disponibile</span>
                          <span>{euro(payload[0].value)}</span>
                        </div>
                      </div>
                    ) : null
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="db-small" style={{ marginTop: -8 }}>andamento negli ultimi 12 mesi</div>
        </section>

        {/* KPI */}
        <div className="db-kpis">
          <section className="db-card db-kpi">
            <div className="db-label">
              <i className="db-dot" style={{ background: "var(--ent)" }} />
              Entrate di {nomeMeseMin}
            </div>
            <div className="db-kpi-v">{euro(meseCorrente.entrate)}</div>
            <div className="db-small">media ultimi 6 mesi {euro(media(serie12.slice(-7, -1).map((r) => r.entrate)), 0)}</div>
            <MiniBarre valori={serie12.slice(-6).map((r) => r.entrate)} colore="var(--ent)" etichette={[serie12[6].mese.slice(0, 3), serie12[11].mese.slice(0, 3)]} />
          </section>

          <section className="db-card db-kpi">
            <div className="db-label">
              <i className="db-dot" style={{ background: "var(--des)" }} />
              Uscite di {nomeMeseMin}
            </div>
            <div className="db-kpi-v">{euro(meseCorrente.uscite)}</div>
            {meseCorrente.uscite > 0 && (
              <div className="db-stack" aria-hidden="true">
                {categorie.map((g) => (g.totale > 0 ? <span key={g.macro} style={{ width: `${(g.totale / meseCorrente.uscite) * 100}%`, background: colMacro[g.macro] }} /> : null))}
              </div>
            )}
            <div className="db-small">{meseCorrente.entrate > 0 ? `${percento(meseCorrente.uscite, meseCorrente.entrate)}% delle entrate · mese in corso` : "mese in corso"}</div>
            <MiniBarre valori={serie12.slice(-6).map((r) => r.uscite)} colore="var(--des)" etichette={[serie12[6].mese.slice(0, 3), serie12[11].mese.slice(0, 3)]} />
          </section>

          <section className="db-card db-kpi">
            <div className="db-label">
              <i className="db-dot" style={{ background: "var(--gold)" }} />
              Patrimonio totale
            </div>
            <div className="db-kpi-v">{euro(patrimonio)}</div>
            <div className="db-small">di cui {euro(nonSpendibile, 0)} non spendibili</div>
            <div>
              <div className="db-stack" style={{ height: 10 }} aria-hidden="true">
                {patrimonio > 0 && <span style={{ width: `${Math.max(0, (disponibile / patrimonio) * 100)}%`, background: "var(--ink-soft)" }} />}
                {patrimonio > 0 && <span style={{ width: `${(nonSpendibile / patrimonio) * 100}%`, background: "var(--gold)" }} />}
              </div>
              <div className="db-mini-l">
                <span>conti {percento(Math.max(0, disponibile), patrimonio)}%</span>
                <span>non spendibile {percento(nonSpendibile, patrimonio)}%</span>
              </div>
            </div>
          </section>
        </div>

        {/* BUDGET DEL MESE */}
        <section className="db-card db-budget">
          <div className="db-h">
            <h2>Budget di {nomeMeseMin}</h2>
            <span className="db-legend-pace">
              <i />
              dove dovresti essere oggi
            </span>
          </div>
          {budget.entrata > 0 ? (
            <div className="db-left-big">
              <span className="amt" style={{ color: budget.resta < 0 ? col.des : c.ink }}>
                {euro(budget.resta)}
              </span>
              <span className="txt">
                {budget.resta >= 0
                  ? `ti restano da spendere o risparmiare fino al ${giorniMese} ${nomeMeseMin}, circa ${euro(budget.alGiorno, 0)} al giorno`
                  : `hai già superato le entrate di ${nomeMeseMin}`}
              </span>
            </div>
          ) : (
            <div className="db-small">Non hai ancora entrate registrate a {nomeMeseMin}: il budget si calcola appena aggiungi lo stipendio o un'altra entrata.</div>
          )}
          <div className="db-meters">
            {budget.macro.map((m) => {
              const nota =
                budget.entrata <= 0
                  ? ""
                  : m.macro === "Risparmio"
                  ? m.avanzamento < budget.ritmo
                    ? "Sei un po' indietro sul risparmio di questo mese."
                    : "Risparmio in linea con il mese."
                  : m.resta < 0
                  ? "Budget superato."
                  : m.avanzamento > budget.ritmo
                  ? "Stai spendendo più in fretta del previsto."
                  : "Nei limiti per questo punto del mese.";
              return (
                <div key={m.macro}>
                  <div className="db-meter-h">
                    <span className="who">
                      <i style={{ background: colMacro[m.macro] }} />
                      {m.macro} <span className="perc">{m.percentuale}%</span>
                    </span>
                    <span className="vals">
                      <b>{euro(m.speso)}</b> di {euro(m.budget)}
                    </span>
                  </div>
                  <div className="db-track">
                    <div className="db-fill" style={{ width: `${m.avanzamento}%`, background: colMacro[m.macro] }} />
                    <div className="db-pace" style={{ left: `calc(${budget.ritmo}% - 1px)` }} />
                  </div>
                  <div className="db-meter-f">
                    {m.resta >= 0 ? "Restano " : "Sforato di "}
                    <b>{euro(Math.abs(m.resta))}</b>
                    {nota ? ` · ${nota}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* OBIETTIVI */}
        <section className="db-card db-goal">
          <div className="db-h">
            <h2>Obiettivi</h2>
            <span className="db-small">da Patrimonio</span>
          </div>
          {traguardi.length === 0 ? (
            <div className="db-small">Nessun obiettivo attivo. Puoi crearne uno in Patrimonio.</div>
          ) : (
            <div className="db-goals">
              {traguardi.map((g) => (
                <div key={g.id} style={{ opacity: g.pausa ? 0.6 : 1 }}>
                  <div className="db-goal-h">
                    <span>
                      {g.nome}
                      {g.pausa ? " · in pausa" : ""}
                    </span>
                    <span>
                      {euro(g.accumulato, 0)} / {euro(g.target, 0)}
                    </span>
                  </div>
                  <div className="db-track" style={{ height: 8 }}>
                    <div className="db-fill" style={{ width: `${g.pct}%`, background: "var(--gold)" }} />
                  </div>
                  <div className="db-meter-f">
                    {g.pct.toFixed(0)}% · mancano {euro(Math.max(0, g.target - g.accumulato), 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DOVE VANNO I SOLDI */}
        <section className="db-card db-cat">
          <div className="db-h">
            <h2>Dove vanno i soldi</h2>
            <span className="db-small">
              {nomeMeseMin} · tutte le uscite · {euro(meseCorrente.uscite)}
            </span>
          </div>
          {meseCorrente.uscite === 0 ? (
            <div className="db-small">Nessuna uscita ancora a {nomeMeseMin}.</div>
          ) : (
            <div className="db-macro-cols">
              {categorie.map((g) => (
                <div key={g.macro} className="db-mcol" style={{ "--mc": colMacro[g.macro] }}>
                  <div className="db-mcol-h">
                    <span className="n">
                      <i />
                      {g.macro}
                    </span>
                    <span className="t">
                      {euro(g.totale)}
                      <small>{percento(g.totale, meseCorrente.uscite)}%</small>
                    </span>
                  </div>
                  {g.voci.length === 0 && <div className="db-small">Nessuna uscita.</div>}
                  {g.voci.map((v) => (
                    <div key={v.nome} className="db-catrow">
                      <span className="name">{v.nome}</span>
                      <span className="amt">
                        {euro(v.importo)}
                        <span className="pct">{percento(v.importo, meseCorrente.uscite)}%</span>
                      </span>
                      <div className="bar">
                        <span style={{ width: `${maxCategoria > 0 ? (v.importo / maxCategoria) * 100 : 0}%`, background: colMacro[g.macro] }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ENTRATE E USCITE */}
        <section className="db-card db-trend">
          <div className="db-h">
            <h2>Entrate e uscite</h2>
            <div className="db-seg" role="group" aria-label="Periodo">
              {[6, 12].map((n) => (
                <button key={n} type="button" aria-pressed={mesiGrafico === n} onClick={() => setMesiGrafico(n)}>
                  {n} mesi
                </button>
              ))}
            </div>
          </div>
          <div className="db-legend">
            <span>
              <i style={{ background: "var(--ent)" }} />
              Entrate
            </span>
            <span>
              <i style={{ background: "var(--des)" }} />
              Uscite
            </span>
            <span>
              <i className="line" style={{ background: "var(--gold)" }} />
              Messo da parte (entrate − uscite)
            </span>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serieGrafico} margin={{ top: 18, right: 8, bottom: 0, left: 4 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke={x.lineSoft} />
                <XAxis dataKey="corto" tick={{ fill: c.ink, fontSize: 13, fontWeight: 500 }} axisLine={{ stroke: c.line }} tickLine={false} />
                <YAxis
                  domain={[tacche[0], tacche[tacche.length - 1]]}
                  ticks={tacche}
                  tick={{ fill: c.inkSoft, fontSize: 12.5, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v < 0 ? "−" : ""}€${Math.abs(v).toLocaleString("it-IT")}`)}
                />
                <ReferenceLine y={0} stroke={c.line} />
                <Tooltip cursor={{ fill: `${c.gold}1F` }} content={<TooltipMese />} />
                <Bar dataKey="entrate" fill={col.ent} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                <Bar dataKey="uscite" fill={col.des} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                <Line dataKey="netto" stroke={c.gold} strokeWidth={2} dot={{ r: 4, fill: c.gold, stroke: c.surfaceRaised, strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false}>
                  <LabelList dataKey="netto" content={<EtichettaUltimo ultimo={serieGrafico.length - 1} oro={c.gold} testo={c.surfaceRaised} />} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="db-vals-wrap">
            <table className="db-vtab">
              <tbody>
                <tr>
                  <th />
                  {serieGrafico.map((r) => (
                    <th key={r.chiave} className={r.chiave === chiaveOggi ? "cur" : ""}>
                      {r.corto}
                    </th>
                  ))}
                </tr>
                <tr>
                  <td>
                    <i style={{ background: "var(--ent)" }} />
                    Entrate
                  </td>
                  {serieGrafico.map((r) => (
                    <td key={r.chiave} className={r.chiave === chiaveOggi ? "cur" : ""}>
                      {euro(r.entrate, 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <i style={{ background: "var(--des)" }} />
                    Uscite
                  </td>
                  {serieGrafico.map((r) => (
                    <td key={r.chiave} className={r.chiave === chiaveOggi ? "cur" : ""}>
                      {euro(r.uscite, 0)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>
                    <i style={{ background: "var(--gold)" }} />
                    Messo da parte
                  </td>
                  {serieGrafico.map((r) => (
                    <td key={r.chiave} className={r.chiave === chiaveOggi ? "cur" : ""}>
                      <span className={r.netto >= 0 ? "pos" : "neg"}>{conSegno(r.netto, 0)}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ABBONAMENTI */}
        <section className="db-card db-flat db-sub">
          <div className="db-h">
            <h2>Abbonamenti</h2>
            <span className="db-small">{abbAttivi.length} attivi</span>
          </div>
          <div className="db-sub-total">
            <span className="v">{euro(totAbb)}</span>
            <span className="db-small">al mese · {euro(totAbb * 12, 0)} l'anno</span>
          </div>
          {abbAttivi.length === 0 ? (
            <div className="db-small">Nessun abbonamento attivo.</div>
          ) : (
            <div className="db-list">
              {abbAttivi.slice(0, 5).map((g) => {
                const cat = separaEmoji(g.storico[0]?.categorie?.sottocategoria || "");
                return (
                  <Riga
                    key={g.chiave}
                    icona={cat.emoji !== "•" ? cat.emoji : "🔁"}
                    titolo={g.nome}
                    sotto={g.frequenza === "Mensile" ? "Mensile" : `${g.frequenza} · ${euro(g.importo)}`}
                    importo={euro(mensileEquivalente({ importo: g.importo, frequenza: g.frequenza }))}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ULTIME TRANSAZIONI */}
        <section className="db-card db-flat db-last">
          <div className="db-h">
            <h2>Ultime transazioni</h2>
          </div>
          {ultime.length === 0 ? (
            <div className="db-small">Nessuna transazione ancora.</div>
          ) : (
            <div className="db-list">
              {ultime.map((t) => {
                const cat = separaEmoji(t.categorie?.sottocategoria || "");
                const imp = Number(t.importo);
                const data = new Date(t.data).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
                return (
                  <Riga
                    key={t.id}
                    icona={cat.emoji}
                    titolo={t.descrizione}
                    sotto={`${data} · ${cat.nome}${t.conti?.nome ? ` · ${t.conti.nome}` : ""}`}
                    importo={conSegno(imp)}
                    entrata={imp > 0}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Componenti di supporto
----------------------------------------------------------------*/
function media(valori) {
  return valori.length ? valori.reduce((s, v) => s + v, 0) / valori.length : 0;
}

function MiniBarre({ valori, colore, etichette }) {
  const max = Math.max(...valori, 0);
  return (
    <div>
      <div className="db-mini">
        {valori.map((v, i) => (
          <span key={i} style={{ height: `${max > 0 ? Math.max(6, (v / max) * 100) : 6}%`, background: colore }} />
        ))}
      </div>
      <div className="db-mini-l">
        <span>{etichette[0].toLowerCase()}</span>
        <span>{etichette[1].toLowerCase()}</span>
      </div>
    </div>
  );
}

function Riga({ icona, titolo, sotto, importo, entrata = false }) {
  return (
    <div className="db-riga">
      <div className="l">
        <span className="ic" aria-hidden="true">
          {icona}
        </span>
        <div className="t">
          <div>{titolo}</div>
          <div>{sotto}</div>
        </div>
      </div>
      <span className={`a${entrata ? " in" : ""}`}>{importo}</span>
    </div>
  );
}

function TooltipMese({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="db-tip">
      <b>{r.mese}</b>
      <div className="db-tip-r">
        <span>
          <i style={{ background: "var(--ent)" }} />
          Entrate
        </span>
        <span>{euro(r.entrate)}</span>
      </div>
      <div className="db-tip-r">
        <span>
          <i style={{ background: "var(--des)" }} />
          Uscite
        </span>
        <span>{euro(r.uscite)}</span>
      </div>
      <div className="db-tip-r tot">
        <span>Messo da parte</span>
        <span>{conSegno(r.netto)}</span>
      </div>
    </div>
  );
}

// Pastiglia oro col valore "messo da parte" solo sull'ultimo mese.
function EtichettaUltimo({ x, y, value, index, ultimo, oro, testo }) {
  if (index !== ultimo || x == null || y == null) return null;
  const lbl = conSegno(value, 0);
  const w = lbl.length * 7.6 + 14;
  const left = Math.max(4, x - w - 18);
  return (
    <g>
      <rect x={left} y={y - 11} width={w} height={22} rx={11} fill={oro} />
      <text x={left + w / 2} y={y + 4} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={testo} fontFamily="Inter, sans-serif">
        {lbl}
      </text>
    </g>
  );
}

/**
 * Il saldo in grande: si rimpicciolisce da solo se non entra nella
 * card, invece di uscirne. Euro e centesimi più piccoli.
 */
function NumeroAdattivo({ valore, max = 48, min = 18, colore }) {
  const boxRef = useRef(null);
  const testoRef = useRef(null);
  const [intera, decimali] = Math.abs(valore).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split(",");

  useLayoutEffect(() => {
    const box = boxRef.current;
    const testo = testoRef.current;
    if (!box || !testo) return;
    function adatta() {
      let dim = max;
      testo.style.fontSize = `${dim}px`;
      while (testo.scrollWidth > box.clientWidth && dim > min) {
        dim -= 1;
        testo.style.fontSize = `${dim}px`;
      }
    }
    adatta();
    const oss = new ResizeObserver(adatta);
    oss.observe(box);
    if (document.fonts) document.fonts.ready.then(adatta);
    return () => oss.disconnect();
  }, [valore, max, min]);

  return (
    <div ref={boxRef} style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
      <span ref={testoRef} className="db-big" style={{ fontSize: max, color: colore }}>
        {valore < 0 ? "−" : ""}
        <span className="cur">€</span>
        {intera}
        <span className="dec">,{decimali}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------
   Stili della Dashboard (classi con prefisso db- per non toccare
   il resto del sito). I colori arrivano come variabili CSS dal tema.
----------------------------------------------------------------*/
const CSS = `
.db { display: flex; flex-direction: column; gap: 20px; max-width: 1180px; margin: 0 auto; color: var(--ink); font-variant-numeric: tabular-nums; }
.db h1, .db h2 { font-family: 'Fraunces', serif; font-weight: 500; margin: 0; }
.db h1 { font-size: 26px; }
.db h2 { font-size: 16px; }
.db-greet p { margin: 4px 0 0; color: var(--ink-soft); font-size: 14px; }

.db-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; }
.db-card { background: var(--raised); border: 1px solid var(--line); border-radius: 18px; padding: 20px; box-shadow: var(--shadow); min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.db-flat { background: var(--surface); box-shadow: none; }
.db-hero { grid-column: span 5; }
.db-kpis { grid-column: span 7; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.db-budget { grid-column: span 7; }
.db-goal { grid-column: span 5; }
.db-cat, .db-trend { grid-column: span 12; }
.db-sub, .db-last { grid-column: span 6; }
@media (max-width: 980px) {
  .db-hero, .db-kpis, .db-budget, .db-goal { grid-column: span 12; }
}
@media (max-width: 640px) {
  .db-kpis { grid-template-columns: minmax(0, 1fr); }
  .db-sub, .db-last { grid-column: span 12; }
}

.db-h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.db-label { font-size: 12px; font-weight: 500; color: var(--ink-soft); display: flex; align-items: center; }
.db-small { font-size: 12px; color: var(--ink-soft); }
.db-hint { font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; max-width: 42ch; margin-top: 4px; }
.db-row-wrap { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.db-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }

.db-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.db-wallet { width: 36px; height: 36px; border-radius: 10px; background: var(--gold-soft); color: var(--gold); display: grid; place-items: center; flex: none; }
.db-big { display: inline-block; white-space: nowrap; font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
.db-big .cur { font-size: .52em; font-weight: 500; vertical-align: .6em; margin-right: .1em; color: var(--ink-soft); }
.db-big .dec { font-size: .48em; font-weight: 500; vertical-align: .8em; color: var(--ink-soft); }
.db-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 4px 9px; border-radius: 20px; }
.db-pill.up { background: color-mix(in srgb, var(--ris) 14%, transparent); color: var(--ris); }
.db-pill.down { background: color-mix(in srgb, var(--des) 14%, transparent); color: var(--des); }

.db-kpi { gap: 8px; padding: 18px; justify-content: space-between; }
.db-kpi-v { font-size: 24px; font-weight: 600; letter-spacing: -0.01em; }
.db-stack { display: flex; height: 6px; border-radius: 4px; overflow: hidden; gap: 2px; background: var(--line-soft); }
.db-stack span { display: block; height: 100%; }
.db-mini { display: flex; align-items: flex-end; gap: 4px; height: 44px; margin-top: 6px; }
.db-mini span { flex: 1; border-radius: 3px 3px 0 0; opacity: .35; }
.db-mini span:last-child { opacity: 1; }
.db-mini-l { display: flex; justify-content: space-between; gap: 8px; font-size: 10.5px; color: var(--ink-mute); margin-top: 4px; }

.db-left-big { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.db-left-big .amt { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; }
.db-left-big .txt { color: var(--ink-soft); font-size: 13px; }
.db-meters { display: flex; flex-direction: column; gap: 16px; }
.db-meter-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 7px; font-size: 13px; flex-wrap: wrap; }
.db-meter-h .who { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.db-meter-h .who i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.db-meter-h .perc { color: var(--ink-mute); font-weight: 400; }
.db-meter-h .vals { font-size: 12px; color: var(--ink-soft); }
.db-meter-h .vals b { color: var(--ink); font-weight: 600; }
.db-track { position: relative; height: 10px; border-radius: 5px; background: var(--line-soft); }
.db-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 5px; transition: width .6s ease; }
.db-pace { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--ink); opacity: .55; border-radius: 1px; }
.db-meter-f { font-size: 11.5px; color: var(--ink-soft); margin-top: 6px; }
.db-meter-f b { color: var(--ink); font-weight: 500; }
.db-legend-pace { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ink-soft); }
.db-legend-pace i { width: 2px; height: 12px; background: var(--ink); opacity: .55; display: inline-block; }

.db-goals { display: flex; flex-direction: column; gap: 14px; }
.db-goal-h { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; margin-bottom: 6px; }
.db-goal-h span:last-child { color: var(--ink-soft); font-size: 12px; white-space: nowrap; }

.db-macro-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px 28px; }
@media (max-width: 860px) { .db-macro-cols { grid-template-columns: minmax(0, 1fr); } }
.db-mcol { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.db-mcol-h { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 8px; border-bottom: 2px solid var(--mc); }
.db-mcol-h .n { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; }
.db-mcol-h .n i { width: 10px; height: 10px; border-radius: 3px; background: var(--mc); display: inline-block; }
.db-mcol-h .t { font-size: 13px; font-weight: 600; }
.db-mcol-h .t small { font-weight: 400; color: var(--ink-soft); font-size: 11.5px; margin-left: 4px; }
.db-catrow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; font-size: 13px; }
.db-catrow .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-catrow .amt { font-weight: 500; white-space: nowrap; }
.db-catrow .pct { color: var(--ink-mute); font-weight: 400; font-size: 11.5px; margin-left: 6px; }
.db-catrow .bar { grid-column: 1 / -1; height: 8px; border-radius: 4px; background: var(--line-soft); overflow: hidden; }
.db-catrow .bar span { display: block; height: 100%; border-radius: 4px; transition: width .6s ease; }

.db-seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.db-seg button { font-size: 12px; padding: 5px 10px; color: var(--ink-soft); }
.db-seg button[aria-pressed="true"] { background: var(--gold); color: var(--surface); }
.db-legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--ink-soft); }
.db-legend span { display: inline-flex; align-items: center; gap: 6px; }
.db-legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.db-legend i.line { height: 2px; width: 14px; border-radius: 1px; }

.db-vals-wrap { overflow-x: auto; min-width: 0; width: 100%; }
.db-vtab { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 520px; }
.db-vtab th, .db-vtab td { padding: 7px 6px; text-align: right; white-space: nowrap; }
.db-vtab th { font-weight: 500; color: var(--ink-soft); font-size: 11.5px; letter-spacing: .03em; text-transform: uppercase; }
.db-vtab th:first-child, .db-vtab td:first-child { text-align: left; color: var(--ink-soft); font-weight: 500; }
.db-vtab tr + tr td { border-top: 1px solid var(--line-soft); }
.db-vtab td i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 6px; }
.db-vtab .pos { color: var(--ris); font-weight: 600; }
.db-vtab .neg { color: var(--des); font-weight: 600; }
.db-vtab .cur { background: var(--gold-soft); }

.db-tip { background: var(--raised); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 12px; box-shadow: 0 8px 24px -12px rgba(0,0,0,.4); min-width: 170px; color: var(--ink); }
.db-tip b { display: block; font-family: 'Fraunces', serif; font-weight: 500; font-size: 13px; margin-bottom: 6px; }
.db-tip-r { display: flex; justify-content: space-between; gap: 14px; }
.db-tip-r i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 6px; }
.db-tip-r.tot { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--line); font-weight: 600; }

.db-sub-total { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.db-sub-total .v { font-size: 26px; font-weight: 600; }
.db-list { display: flex; flex-direction: column; }
.db-riga { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line-soft); font-size: 13px; }
.db-riga:first-child { border-top: 0; padding-top: 0; }
.db-riga .l { display: flex; align-items: center; gap: 10px; min-width: 0; }
.db-riga .ic { width: 30px; height: 30px; border-radius: 9px; background: var(--surface); border: 1px solid var(--line); display: grid; place-items: center; font-size: 14px; flex: none; }
.db-riga .t { min-width: 0; }
.db-riga .t div:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-riga .t div:last-child { font-size: 11.5px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-riga .a { font-weight: 500; white-space: nowrap; }
.db-riga .a.in { color: var(--ris); }
@media (prefers-reduced-motion: reduce) { .db-fill, .db-catrow .bar span { transition: none; } }
`;
