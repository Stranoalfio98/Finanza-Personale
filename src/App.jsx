import React from "react";
import { useAuth } from "./lib/useAuth.js";
import Login from "./pages/Login.jsx";
import { PALETTE, FONTS } from "./theme.js";

export default function App() {
  const auth = useAuth();

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

  // Passo 3 continua da qui: le pagine vere (Dashboard, Transazioni,
  // Budget mensile, Abbonamenti, Patrimonio, Impostazioni) collegate
  // alle tabelle Supabase. Per ora solo la conferma che il login
  // funziona, prima di costruire il resto sopra queste fondamenta.
  const c = PALETTE.light;
  return (
    <div style={{ background: c.bg, minHeight: "100vh", padding: 24, fontFamily: "'Inter', sans-serif", color: c.ink }}>
      <style>{FONTS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${c.gold}`, overflow: "hidden" }}>
            <img src="/logo.png" alt="Bilancio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20 }}>Bilancio</div>
        </div>
        <button
          onClick={auth.esci}
          style={{ border: `1px solid ${c.line}`, color: c.inkSoft, borderRadius: 8, padding: "6px 12px", fontSize: 13, background: c.surfaceRaised }}
        >
          Esci
        </button>
      </div>
      <div style={{ fontSize: 13, color: c.inkSoft }}>
        Accesso riuscito come <strong style={{ color: c.ink }}>{auth.utente.email}</strong>. Le pagine vere arrivano nel prossimo passo.
      </div>
    </div>
  );
}
}
