import React, { useEffect, useState } from "react";
import { PALETTE, MACRO, inputStyle } from "../theme.js";
import { validaTransazione, MESI_CICLO } from "../calc.js";
import { listaConti, creaConto, listaCategorie, listaTransazioni, creaTransazione, aggiornaTransazione, eliminaTransazione } from "../lib/api.js";

const OGGI = () => new Date().toISOString().slice(0, 10);

const FORM_VUOTO = { data: OGGI(), conto_id: "", categoria_id: "", descrizione: "", importo: "", ricorrente: false, frequenza: "Mensile" };

export default function Transazioni({ theme = "light" }) {
  const c = PALETTE[theme];

  const [conti, setConti] = useState([]);
  const [categorie, setCategorie] = useState([]);
  const [transazioni, setTransazioni] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState(null);

  const [form, setForm] = useState(FORM_VUOTO);
  const [erroriForm, setErroriForm] = useState({});
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  const [nuovoContoNome, setNuovoContoNome] = useState("");
  const [contoInCorso, setContoInCorso] = useState(false);

  const [apertaId, setApertaId] = useState(null);
  const [formModifica, setFormModifica] = useState(null);
  const [erroriModifica, setErroriModifica] = useState({});
  const [confermaElimina, setConfermaElimina] = useState(false);

  useEffect(() => {
    caricaTutto();
  }, []);

  async function caricaTutto() {
    setCaricamento(true);
    setErroreCaricamento(null);
    try {
      const [c1, c2, t1] = await Promise.all([listaConti(), listaCategorie(), listaTransazioni()]);
      setConti(c1);
      setCategorie(c2);
      setTransazioni(t1);
      setForm((f) => ({ ...f, conto_id: f.conto_id || c1[0]?.id || "", categoria_id: f.categoria_id || c2[0]?.id || "" }));
    } catch (err) {
      setErroreCaricamento(err.message || "Errore nel caricamento dei dati.");
    } finally {
      setCaricamento(false);
    }
  }

  async function handleAggiungiConto() {
    if (!nuovoContoNome.trim()) return;
    setContoInCorso(true);
    try {
      const nuovo = await creaConto(nuovoContoNome.trim());
      setConti([...conti, nuovo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setForm((f) => ({ ...f, conto_id: nuovo.id }));
      setNuovoContoNome("");
    } catch (err) {
      setErroreCaricamento(err.message || "Non sono riuscito a creare il conto.");
    } finally {
      setContoInCorso(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errori = validaTransazione({ importo: form.importo, descr: form.descrizione, cat: form.categoria_id, ricorrente: form.ricorrente, frequenza: form.frequenza });
    setErroriForm(errori);
    if (Object.keys(errori).length > 0) return;

    setSalvataggioInCorso(true);
    try {
      // il segno lo decide la categoria: Incasso = positivo, Pagamento = negativo
      const categoria = categorie.find((cat) => cat.id === form.categoria_id);
      const importoAssoluto = Math.abs(Number(form.importo));
      const importoFirmato = categoria?.tipo === "Incasso" ? importoAssoluto : -importoAssoluto;

      const nuova = await creaTransazione({ ...form, importo: importoFirmato });
      setTransazioni([nuova, ...transazioni]);
      setForm({ ...FORM_VUOTO, data: OGGI(), conto_id: form.conto_id, categoria_id: form.categoria_id });
      setErroriForm({});
    } catch (err) {
      setErroriForm({ generico: err.message || "Non sono riuscito a salvare la transazione." });
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  function apriDettaglio(t) {
    setApertaId(t.id);
    setFormModifica({
      data: t.data,
      conto_id: t.conto_id,
      categoria_id: t.categoria_id,
      descrizione: t.descrizione,
      importo: Math.abs(t.importo).toString(),
      ricorrente: t.ricorrente,
      frequenza: t.frequenza || "Mensile",
      stato_abbonamento: t.stato_abbonamento,
    });
    setErroriModifica({});
    setConfermaElimina(false);
  }

  async function salvaModifica() {
    const errori = validaTransazione({
      importo: formModifica.importo,
      descr: formModifica.descrizione,
      cat: formModifica.categoria_id,
      ricorrente: formModifica.ricorrente,
      frequenza: formModifica.frequenza,
    });
    setErroriModifica(errori);
    if (Object.keys(errori).length > 0) return;

    try {
      const categoria = categorie.find((cat) => cat.id === formModifica.categoria_id);
      const importoAssoluto = Math.abs(Number(formModifica.importo));
      const importoFirmato = categoria?.tipo === "Incasso" ? importoAssoluto : -importoAssoluto;

      const aggiornata = await aggiornaTransazione(apertaId, { ...formModifica, importo: importoFirmato });
      setTransazioni(transazioni.map((t) => (t.id === apertaId ? aggiornata : t)));
      setApertaId(null);
    } catch (err) {
      setErroriModifica({ generico: err.message || "Non sono riuscito a salvare le modifiche." });
    }
  }

  async function confermaEliminazione() {
    try {
      await eliminaTransazione(apertaId);
      setTransazioni(transazioni.filter((t) => t.id !== apertaId));
      setApertaId(null);
      setConfermaElimina(false);
    } catch (err) {
      setErroriModifica({ generico: err.message || "Non sono riuscito a eliminare la transazione." });
    }
  }

  function macroDiCategoria(categoriaId) {
    const cat = categorie.find((x) => x.id === categoriaId);
    return cat?.macrocategoria || "Entrate";
  }

  if (caricamento) {
    return <div style={{ color: c.inkSoft, fontSize: 13 }}>Caricamento…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {erroreCaricamento && (
        <div style={{ fontSize: 13, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "10px 14px" }}>
          {erroreCaricamento}
        </div>
      )}

      {/* Form nuova transazione */}
      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, padding: 20 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, marginBottom: 14 }}>Nuova transazione</div>

        {conti.length === 0 ? (
          <div style={{ fontSize: 13, color: c.inkSoft, marginBottom: 12 }}>
            Non hai ancora nessun conto. Creane uno per iniziare:
            <div style={{ display: "flex", gap: 8, marginTop: 8, maxWidth: 320 }}>
              <input value={nuovoContoNome} onChange={(e) => setNuovoContoNome(e.target.value)} placeholder="es. PostePay" style={inputStyle(c, false)} />
              <button
                onClick={handleAggiungiConto}
                disabled={contoInCorso}
                style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 500 }}
              >
                {contoInCorso ? "…" : "Crea"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <Campo label="Data">
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inputStyle(c, false)} />
              </Campo>
              <Campo label="Importo (€)" errore={erroriForm.importo}>
                <input type="number" step="0.01" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} style={inputStyle(c, erroriForm.importo)} placeholder="0.00" />
              </Campo>
              <Campo label="Descrizione" errore={erroriForm.descr}>
                <input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} style={inputStyle(c, erroriForm.descr)} placeholder="es. Spesa supermercato" />
              </Campo>
              <Campo label="Conto">
                <select value={form.conto_id} onChange={(e) => setForm({ ...form, conto_id: e.target.value })} style={inputStyle(c, false)}>
                  {conti.map((cn) => (
                    <option key={cn.id} value={cn.id}>
                      {cn.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Categoria" errore={erroriForm.cat}>
                <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle(c, erroriForm.cat)}>
                  {categorie.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {MACRO[cat.macrocategoria]?.emoji} {cat.sottocategoria}
                    </option>
                  ))}
                </select>
              </Campo>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="submit"
                  disabled={salvataggioInCorso}
                  style={{ width: "100%", background: c.gold, color: c.surface, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 500, opacity: salvataggioInCorso ? 0.6 : 1 }}
                >
                  {salvataggioInCorso ? "…" : "Aggiungi"}
                </button>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${c.line}`, marginTop: 16, paddingTop: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.ricorrente} onChange={(e) => setForm({ ...form, ricorrente: e.target.checked })} />
                È un abbonamento ricorrente
              </label>
              {form.ricorrente && (
                <select value={form.frequenza} onChange={(e) => setForm({ ...form, frequenza: e.target.value })} style={{ ...inputStyle(c, false), width: "auto", marginTop: 0 }}>
                  {Object.keys(MESI_CICLO).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ fontSize: 11, color: c.inkSoft, marginTop: 10 }}>
              Il segno lo decide la categoria scelta: se è di tipo "Incasso" la transazione è un'entrata, altrimenti un'uscita — inserisci sempre l'importo positivo.
            </div>

            {erroriForm.generico && <div style={{ fontSize: 12, color: "#A6403A", marginTop: 8 }}>{erroriForm.generico}</div>}
          </form>
        )}

        <div style={{ marginTop: conti.length > 0 ? 16 : 0, paddingTop: conti.length > 0 ? 14 : 0, borderTop: conti.length > 0 ? `1px solid ${c.line}` : "none" }}>
          {conti.length > 0 && (
            <details>
              <summary style={{ fontSize: 12, color: c.inkSoft, cursor: "pointer" }}>+ nuovo conto</summary>
              <div style={{ display: "flex", gap: 8, marginTop: 8, maxWidth: 320 }}>
                <input value={nuovoContoNome} onChange={(e) => setNuovoContoNome(e.target.value)} placeholder="es. N26" style={inputStyle(c, false)} />
                <button onClick={handleAggiungiConto} disabled={contoInCorso} style={{ background: c.gold, color: c.surface, borderRadius: 8, padding: "0 14px", fontSize: 13, fontWeight: 500 }}>
                  {contoInCorso ? "…" : "Crea"}
                </button>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Tabella transazioni */}
      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${c.line}` }}>
              {["Data", "Conto", "Descrizione", "Categoria", "Importo"].map((h) => (
                <th key={h} style={{ textAlign: h === "Importo" ? "right" : "left", padding: "10px 16px", color: c.inkSoft, fontWeight: 500, fontSize: 11, letterSpacing: 0.4 }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transazioni.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "24px 16px", textAlign: "center", color: c.inkSoft, fontSize: 13 }}>
                  Nessuna transazione ancora. Aggiungi la prima qui sopra.
                </td>
              </tr>
            )}
            {transazioni.map((t) => (
              <tr key={t.id} onClick={() => apriDettaglio(t)} style={{ borderBottom: `1px solid ${c.line}`, cursor: "pointer" }}>
                <td style={{ padding: "10px 16px", color: c.inkSoft, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {new Date(t.data).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                </td>
                <td style={{ padding: "10px 16px", color: c.inkSoft }}>{t.conti?.nome}</td>
                <td style={{ padding: "10px 16px" }}>{t.descrizione}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: c.bg, border: `1px solid ${c.line}` }}>
                    {MACRO[t.categorie?.macrocategoria]?.emoji} {t.categorie?.sottocategoria}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: t.importo < 0 ? c.ink : MACRO.Risparmio.light }}>
                  {t.importo < 0 ? "-" : "+"}€{Math.abs(t.importo).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dettaglio / modifica / elimina */}
      {apertaId && formModifica && (
        <div
          onClick={() => setApertaId(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.surfaceRaised, border: `1px solid ${c.line}`, borderRadius: 16, width: "min(420px, 90vw)", maxHeight: "85vh", overflowY: "auto", padding: 20 }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, marginBottom: 14 }}>Modifica transazione</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Campo label="Data">
                <input type="date" value={formModifica.data} onChange={(e) => setFormModifica({ ...formModifica, data: e.target.value })} style={inputStyle(c, false)} />
              </Campo>
              <Campo label="Importo (€)" errore={erroriModifica.importo}>
                <input type="number" step="0.01" value={formModifica.importo} onChange={(e) => setFormModifica({ ...formModifica, importo: e.target.value })} style={inputStyle(c, erroriModifica.importo)} />
              </Campo>
              <Campo label="Descrizione" errore={erroriModifica.descr}>
                <input value={formModifica.descrizione} onChange={(e) => setFormModifica({ ...formModifica, descrizione: e.target.value })} style={inputStyle(c, erroriModifica.descr)} />
              </Campo>
              <Campo label="Conto">
                <select value={formModifica.conto_id} onChange={(e) => setFormModifica({ ...formModifica, conto_id: e.target.value })} style={inputStyle(c, false)}>
                  {conti.map((cn) => (
                    <option key={cn.id} value={cn.id}>
                      {cn.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Categoria" errore={erroriModifica.cat}>
                <select value={formModifica.categoria_id} onChange={(e) => setFormModifica({ ...formModifica, categoria_id: e.target.value })} style={inputStyle(c, erroriModifica.cat)}>
                  {categorie.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {MACRO[cat.macrocategoria]?.emoji} {cat.sottocategoria}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            {erroriModifica.generico && <div style={{ fontSize: 12, color: "#A6403A", marginTop: 10 }}>{erroriModifica.generico}</div>}

            {!confermaElimina ? (
              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button onClick={salvaModifica} style={{ flex: 1, background: c.gold, color: c.surface, borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 500 }}>
                  Salva modifiche
                </button>
                <button onClick={() => setConfermaElimina(true)} style={{ border: `1px solid #A6403A`, color: "#A6403A", borderRadius: 8, padding: "9px 14px", fontSize: 13, background: "transparent" }}>
                  Elimina
                </button>
              </div>
            ) : (
              <div style={{ background: "#A6403A15", border: "1px solid #A6403A", borderRadius: 10, padding: 12, marginTop: 18 }}>
                <div style={{ fontSize: 12, marginBottom: 10 }}>Eliminare questa transazione? Non si può annullare.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setConfermaElimina(false)} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, border: `1px solid ${c.line}`, background: "transparent", color: c.ink }}>
                    Annulla
                  </button>
                  <button onClick={confermaEliminazione} style={{ flex: 1, borderRadius: 8, padding: "8px 0", fontSize: 12, background: "#A6403A", color: "#fff", fontWeight: 500 }}>
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

function Campo({ label, errore, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "#8890" }}>{label}</label>
      {children}
      {errore && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{errore}</div>}
    </div>
  );
}
