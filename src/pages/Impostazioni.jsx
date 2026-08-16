import React, { useEffect, useState } from "react";
import { PALETTE, MACRO, inputStyle } from "../theme.js";
import { sommaSplit, splitValido, validaConto, validaCategoria } from "../calc.js";
import { listaConti, creaConto, eliminaConto, listaCategorie, creaCategoria, eliminaCategoria, getImpostazioni, aggiornaImpostazioni } from "../lib/api.js";

export default function Impostazioni({ theme = "light" }) {
  const c = PALETTE[theme];

  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState(null);

  const [conti, setConti] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    carica();
  }, []);

  async function carica() {
    setCaricamento(true);
    setErrore(null);
    try {
      const [c1, c2, imp] = await Promise.all([listaConti(), listaCategorie(), getImpostazioni()]);
      setConti(c1);
      setCategorie(c2);
      setRatio({ Risparmio: Number(imp.split_risparmio), Bisogno: Number(imp.split_bisogno), Desiderio: Number(imp.split_desiderio) });
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a caricare le impostazioni.");
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

      <SezioneConti c={c} conti={conti} setConti={setConti} setErrore={setErrore} />
      <SezioneSplit c={c} theme={theme} ratio={ratio} setRatio={setRatio} setErrore={setErrore} />
      <SezioneCategorie c={c} theme={theme} categorie={categorie} setCategorie={setCategorie} setErrore={setErrore} />
    </div>
  );
}

/* ---------------------------------------------------------------
   CONTI
----------------------------------------------------------------*/
function SezioneConti({ c, conti, setConti, setErrore }) {
  const [nome, setNome] = useState("");
  const [erroreNome, setErroreNome] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  async function aggiungi() {
    const errori = validaConto(nome, conti.map((cn) => cn.nome));
    setErroreNome(errori.nome || null);
    if (errori.nome) return;

    setInCorso(true);
    try {
      const nuovo = await creaConto(nome.trim());
      setConti([...conti, nuovo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNome("");
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a creare il conto.");
    } finally {
      setInCorso(false);
    }
  }

  async function rimuovi(cn) {
    try {
      await eliminaConto(cn.id);
      setConti(conti.filter((x) => x.id !== cn.id));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare il conto.");
    }
  }

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 12 }}>Conti</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {conti.map((cn) => (
          <span key={cn.id} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 20, background: c.bg, border: `1px solid ${c.line}`, display: "flex", alignItems: "center", gap: 8 }}>
            {cn.nome}
            <button onClick={() => rimuovi(cn)} aria-label={`Rimuovi ${cn.nome}`} style={{ color: c.inkSoft, fontSize: 13, lineHeight: 1 }}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, maxWidth: 320 }}>
        <div style={{ flex: 1 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. N26" style={inputStyle(c, erroreNome)} />
          {erroreNome && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroreNome}</div>}
        </div>
        <button onClick={aggiungi} disabled={inCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 500, height: 38 }}>
          {inCorso ? "…" : "Aggiungi"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   SPLIT BUDGET
----------------------------------------------------------------*/
function SezioneSplit({ c, theme, ratio, setRatio, setErrore }) {
  const [locale, setLocale] = useState(ratio);
  const [salvataggio, setSalvataggio] = useState(false);
  const [salvato, setSalvato] = useState(false);

  const somma = sommaSplit(locale);
  const valido = splitValido(locale);

  async function salva() {
    if (!valido) return;
    setSalvataggio(true);
    setSalvato(false);
    try {
      await aggiornaImpostazioni(locale);
      setRatio(locale);
      setSalvato(true);
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a salvare lo split.");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 4 }}>Split budget mensile</div>
      <div style={{ fontSize: 12, color: c.inkSoft, marginBottom: 14 }}>Percentuale di entrata assegnata a ciascuna macrocategoria, usata nella pagina Budget mensile.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
        {Object.entries(locale).map(([macro, val]) => (
          <div key={macro}>
            <label style={{ fontSize: 12 }}>
              {MACRO[macro].emoji} {macro}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input type="number" step="0.1" value={val} onChange={(e) => setLocale({ ...locale, [macro]: Number(e.target.value) })} style={inputStyle(c, false)} />
              <span style={{ fontSize: 13, color: c.inkSoft }}>%</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, marginTop: 14, color: valido ? MACRO.Risparmio[theme] : MACRO.Desiderio[theme] }}>
        Totale: {somma.toFixed(1)}% {valido ? "✓" : "— deve fare 100%"}
      </div>

      <button
        onClick={salva}
        disabled={!valido || salvataggio}
        style={{ marginTop: 14, background: valido ? c.gold : c.line, color: valido ? c.surface : c.inkSoft, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500 }}
      >
        {salvataggio ? "Salvataggio…" : "Salva split"}
      </button>
      {salvato && <span style={{ marginLeft: 10, fontSize: 12, color: MACRO.Risparmio[theme] }}>✓ Salvato</span>}
    </div>
  );
}

/* ---------------------------------------------------------------
   CATEGORIE
----------------------------------------------------------------*/
const FORM_CATEGORIA_VUOTO = { sottocategoria: "", categoria: "", tipo: "Pagamento", macrocategoria: "Bisogno" };

function SezioneCategorie({ c, theme, categorie, setCategorie, setErrore }) {
  const [form, setForm] = useState(FORM_CATEGORIA_VUOTO);
  const [erroriForm, setErroriForm] = useState({});
  const [inCorso, setInCorso] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);

  const gruppi = ["Entrate", "Risparmio", "Bisogno", "Desiderio"].map((macro) => ({
    macro,
    voci: categorie.filter((cat) => cat.macrocategoria === macro),
  }));

  async function aggiungi() {
    const errori = validaCategoria(form);
    setErroriForm(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    try {
      const nuova = await creaCategoria(form);
      setCategorie([...categorie, nuova]);
      setForm(FORM_CATEGORIA_VUOTO);
      setMostraForm(false);
    } catch (err) {
      setErroriForm({ generico: err.message || "Non sono riuscito a creare la categoria." });
    } finally {
      setInCorso(false);
    }
  }

  async function rimuovi(cat) {
    try {
      await eliminaCategoria(cat.id);
      setCategorie(categorie.filter((x) => x.id !== cat.id));
    } catch (err) {
      setErrore(err.message || "Non sono riuscito a eliminare la categoria.");
    }
  }

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15 }}>Categorie</div>
        <button onClick={() => setMostraForm(!mostraForm)} style={{ fontSize: 12, color: c.gold }}>
          {mostraForm ? "Annulla" : "+ nuova categoria"}
        </button>
      </div>

      {mostraForm && (
        <div style={{ background: c.bg, border: `1px dashed ${c.lineStrong}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Sottocategoria</label>
              <input value={form.sottocategoria} onChange={(e) => setForm({ ...form, sottocategoria: e.target.value })} style={inputStyle(c, erroriForm.sottocategoria)} placeholder="es. Palestra" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Categoria</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={inputStyle(c, erroriForm.categoria)} placeholder="es. Sport & Fitness" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={inputStyle(c, false)}>
                <option value="Pagamento">Pagamento</option>
                <option value="Incasso">Incasso</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Macrocategoria</label>
              <select value={form.macrocategoria} onChange={(e) => setForm({ ...form, macrocategoria: e.target.value })} style={inputStyle(c, false)}>
                {["Entrate", "Risparmio", "Bisogno", "Desiderio"].map((m) => (
                  <option key={m} value={m}>
                    {MACRO[m].emoji} {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {erroriForm.generico && <div style={{ fontSize: 12, color: "#A6403A", marginTop: 8 }}>{erroriForm.generico}</div>}
          <button onClick={aggiungi} disabled={inCorso} style={{ marginTop: 12, background: c.gold, color: c.surface, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500 }}>
            {inCorso ? "…" : "Crea categoria"}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {gruppi.map((g) => (
          <div key={g.macro}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ color: MACRO[g.macro][theme], fontSize: 13 }}>{MACRO[g.macro].emoji}</span>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{g.macro}</div>
            </div>
            {g.voci.length === 0 && <div style={{ fontSize: 12, color: c.inkSoft }}>Nessuna categoria.</div>}
            {g.voci.map((v, i) => (
              <div key={v.id} style={{ padding: "6px 0", borderTop: i > 0 ? `1px solid ${c.line}` : "none", fontSize: 12, color: c.inkSoft, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {v.sottocategoria}
                <button onClick={() => rimuovi(v)} aria-label={`Rimuovi ${v.sottocategoria}`} style={{ color: c.inkSoft, fontSize: 13, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
