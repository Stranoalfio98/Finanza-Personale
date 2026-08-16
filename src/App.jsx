import React, { useState } from "react";
import { useAuth } from "./lib/useAuth.js";
import Login from "./pages/Login.jsx";
import Transazioni from "./pages/Transazioni.jsx";
import BudgetMensile from "./pages/BudgetMensile.jsx";
import { PALETTE, FONTS } from "./theme.js";

const PAGINE = [
  { id: "transazioni", label: "Transazioni" },
  { id: "budget", label: "Budget mensile" },
];
// Le altre pagine (Dashboard, Abbonamenti, Patrimonio, Impostazioni)
// arrivano nei prossimi passi, una alla volta.

export default function App() {
  const auth = useAuth();
  const [pagina, setPagina] = useState("transazioni");
  const [theme] = useState("light");

  if (auth.caricamento) {
    return (
      <div style={{ background: PALETTE.light.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: PALETTE.light.inkSoft, fontFamily: "'Inter', sans-serif" }}>
        <style>{FONTS}</style>
        Caricamento…
      </div>
    );
  }

  if (!auth.utente) {
    return <Login auth={auth} />;
  }

  const c = PALETTE[theme];
  return (
    <div style={{ background: c.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: c.ink }}>
      <style>{FONTS}</style>

      <div style={{ borderBottom: `1px solid ${c.line}`, background: c.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${c.gold}`, overflow: "hidden" }}>
            <img src="/logo.png" alt="Bilancio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19 }}>Bilancio</div>
        </div>
        <button onClick={auth.esci} style={{ border: `1px solid ${c.line}`, color: c.inkSoft, borderRadius: 8, padding: "6px 12px", fontSize: 13, background: c.surfaceRaised }}>
          Esci
        </button>
      </div>

      <div style={{ borderBottom: `1px solid ${c.line}`, background: c.surface, display: "flex", gap: 4, padding: "0 20px", overflowX: "auto" }}>
        {PAGINE.map((p) => (
          <button
            key={p.id}
            onClick={() => setPagina(p.id)}
            style={{
              color: pagina === p.id ? c.gold : c.inkSoft,
              borderBottom: pagina === p.id ? `2px solid ${c.gold}` : "2px solid transparent",
              fontSize: 13,
              fontWeight: 500,
              padding: "12px 10px",
              whiteSpace: "nowrap",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {pagina === "transazioni" && <Transazioni theme={theme} />}
        {pagina === "budget" && <BudgetMensile theme={theme} />}
      </div>
    </div>
  );
}
