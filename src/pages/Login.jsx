import React, { useState } from "react";
import { PALETTE, FONTS, inputStyle } from "../theme.js";
import { validaAuth } from "../calc.js";

export default function Login({ auth }) {
  const [theme] = useState("light");
  const [modalita, setModalita] = useState("accedi"); // "accedi" | "registrati"
  const [form, setForm] = useState({ email: "", password: "" });
  const [erroriForm, setErroriForm] = useState({});
  const [inCorso, setInCorso] = useState(false);
  const [confermaInviata, setConfermaInviata] = useState(false);

  const c = PALETTE[theme];

  async function handleSubmit(e) {
    e.preventDefault();
    const errori = validaAuth(form);
    setErroriForm(errori);
    if (Object.keys(errori).length > 0) return;

    setInCorso(true);
    const ok =
      modalita === "accedi"
        ? await auth.accedi(form.email.trim(), form.password)
        : await auth.registrati(form.email.trim(), form.password);
    setInCorso(false);

    if (ok && modalita === "registrati") {
      setConfermaInviata(true);
    }
  }

  return (
    <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 16, width: "min(380px, 90vw)", padding: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: `1.5px solid ${c.gold}`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <img src="/logo.png" alt="Bilancio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: c.ink }}>Bilancio</div>
          <div style={{ fontSize: 12, color: c.inkSoft }}>libretto di finanza personale</div>
        </div>

        {confermaInviata ? (
          <div style={{ fontSize: 13, color: c.ink, textAlign: "center", lineHeight: 1.6 }}>
            Ti abbiamo inviato un'email di conferma a <strong>{form.email}</strong>. Apri il link dentro per attivare l'account, poi torna qui ad accedere.
            <button
              onClick={() => {
                setConfermaInviata(false);
                setModalita("accedi");
              }}
              style={{ display: "block", margin: "16px auto 0", color: c.gold, fontSize: 13 }}
            >
              Torna al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={inputStyle(c, erroriForm.email)}
                placeholder="tu@esempio.com"
                autoComplete="email"
              />
              {erroriForm.email && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriForm.email}</div>}
            </div>
            <div>
              <label style={{ fontSize: 11, color: c.inkSoft }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={inputStyle(c, erroriForm.password)}
                placeholder="almeno 8 caratteri"
                autoComplete={modalita === "accedi" ? "current-password" : "new-password"}
              />
              {erroriForm.password && <div style={{ fontSize: 11, color: "#A6403A", marginTop: 3 }}>{erroriForm.password}</div>}
            </div>

            {auth.errore && (
              <div style={{ fontSize: 12, color: "#A6403A", background: "#A6403A15", border: "1px solid #A6403A40", borderRadius: 8, padding: "8px 10px" }}>
                {auth.errore}
              </div>
            )}

            <button
              type="submit"
              disabled={inCorso}
              style={{
                background: c.gold,
                color: c.surface,
                borderRadius: 8,
                padding: "10px 0",
                fontSize: 14,
                fontWeight: 500,
                marginTop: 6,
                opacity: inCorso ? 0.6 : 1,
                textAlign: "center",
              }}
            >
              {inCorso ? "Un attimo…" : modalita === "accedi" ? "Accedi" : "Crea account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setModalita(modalita === "accedi" ? "registrati" : "accedi");
                setErroriForm({});
              }}
              style={{ fontSize: 12, color: c.inkSoft, marginTop: 4, textAlign: "center" }}
            >
              {modalita === "accedi" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
