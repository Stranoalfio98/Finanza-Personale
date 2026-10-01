import { describe, it, expect } from "vitest";
import { accumulatoObiettivo, progressoObiettivo, statoVisibileObiettivo, collegaVersamentiAObiettivi, validaBuono, patrimonioNetto, TIPI_PATRIMONIO, progressoVoce } from "./calc.js";

// Test aggiunti dopo il bug degli obiettivi: i versamenti arrivano dalle
// transazioni come uscite (importo negativo), e la barra risultava piena
// con "-200 / 3000".
describe("obiettivi con versamenti negativi (come arrivano dalle transazioni)", () => {
  const obiettivo = { target: 3000, stato: "Attivo", storico: [{ importo: -200 }] };

  it("l'accumulato è positivo anche se il versamento è un'uscita", () => {
    expect(accumulatoObiettivo(obiettivo)).toBe(200);
  });

  it("il progresso è circa il 6,7%, non una barra piena", () => {
    expect(progressoObiettivo(obiettivo)).toBeCloseTo(6.667, 2);
  });

  it("somma versamenti negativi e positivi tutti come soldi messi da parte", () => {
    const o = { target: 1000, stato: "Attivo", storico: [{ importo: -200 }, { importo: -150 }, { importo: 50 }] };
    expect(accumulatoObiettivo(o)).toBe(400);
  });

  it("resta Attivo finché non raggiunge il target", () => {
    expect(statoVisibileObiettivo(obiettivo)).toBe("Attivo");
  });

  it("va in Archiviato quando i versamenti negativi raggiungono il target", () => {
    const o = { target: 300, stato: "Attivo", storico: [{ importo: -150 }, { importo: -150 }] };
    expect(statoVisibileObiettivo(o)).toBe("Archiviato");
  });

  it("accetta importi e target arrivati come stringhe da Supabase", () => {
    const o = { target: "3000.00", stato: "Attivo", storico: [{ importo: "-200.00" }] };
    expect(accumulatoObiettivo(o)).toBe(200);
    expect(progressoObiettivo(o)).toBeCloseTo(6.667, 2);
    expect(statoVisibileObiettivo(o)).toBe("Attivo");
  });

  it("il progresso non è mai negativo né oltre il 100%", () => {
    expect(progressoObiettivo({ target: 100, stato: "Attivo", storico: [] })).toBe(0);
    expect(progressoObiettivo({ target: 100, stato: "Attivo", storico: [{ importo: -500 }] })).toBe(100);
  });

  it("funziona dall'inizio alla fine con collegaVersamentiAObiettivi", () => {
    const [o] = collegaVersamentiAObiettivi(
      [{ id: "A", nome: "Norvegia", target: 3000, stato: "Attivo" }],
      [{ id: "1", data: "2026-09-01", importo: -200, obiettivo_id: "A" }]
    );
    expect(accumulatoObiettivo(o)).toBe(200);
    expect(progressoObiettivo(o)).toBeCloseTo(6.667, 2);
  });
});

describe("libretto, buoni e obbligazioni", () => {
  it("validaBuono: un libretto non ha bisogno della scadenza", () => {
    expect(validaBuono({ tipo: "Libretto", nome: "Libretto Postale", importo: "15000", scadenza: "" })).toEqual({});
  });

  it("validaBuono: le obbligazioni non hanno bisogno della scadenza", () => {
    expect(validaBuono({ tipo: "Obbligazioni", nome: "BTP", importo: "5000" })).toEqual({});
  });

  it("validaBuono: un buono fruttifero richiede ancora la scadenza", () => {
    expect(validaBuono({ tipo: "Buono fruttifero", nome: "Buono", importo: "1000", scadenza: "" }).scadenza).toBeDefined();
  });

  it("validaBuono: senza tipo si comporta come prima (buono fruttifero)", () => {
    expect(validaBuono({ nome: "Buono", importo: "1000", scadenza: "" }).scadenza).toBeDefined();
    expect(validaBuono({ nome: "Buono", importo: "1000", scadenza: "2030-01-01" })).toEqual({});
  });

  it("validaBuono: rifiuta un tipo sconosciuto", () => {
    expect(validaBuono({ tipo: "Crypto", nome: "X", importo: "10" }).tipo).toBeDefined();
  });

  it("TIPI_PATRIMONIO contiene i quattro tipi", () => {
    expect(TIPI_PATRIMONIO).toEqual(["Buono fruttifero", "Libretto", "Obbligazioni", "Fondo trading"]);
  });

  it("patrimonioNetto somma conti e tutte le voci, anche con importi in stringa", () => {
    const voci = [
      { tipo: "Libretto", importo: "12000.00" },
      { tipo: "Buono fruttifero", importo: 5000 },
      { tipo: "Obbligazioni", importo: "3000" },
    ];
    expect(patrimonioNetto(2033, voci)).toBe(22033);
  });
});

describe("fondo trading e target sulle voci di patrimonio", () => {
  it("Fondo trading è un tipo valido e non richiede scadenza", () => {
    expect(validaBuono({ tipo: "Fondo trading", nome: "Capitale trading", importo: "2500", target: "10000" })).toEqual({});
  });

  it("il target è facoltativo", () => {
    expect(validaBuono({ tipo: "Libretto", nome: "Libretto", importo: "100", target: "" })).toEqual({});
  });

  it("un target zero o negativo è un errore", () => {
    expect(validaBuono({ tipo: "Fondo trading", nome: "X", importo: "10", target: "0" }).target).toBeDefined();
    expect(validaBuono({ tipo: "Fondo trading", nome: "X", importo: "10", target: "-5" }).target).toBeDefined();
  });

  it("progressoVoce è null senza target", () => {
    expect(progressoVoce({ importo: 500, target: null })).toBeNull();
  });

  it("progressoVoce calcola percentuale e quanto manca", () => {
    const p = progressoVoce({ importo: "2500.00", target: "10000.00" });
    expect(p.percentuale).toBeCloseTo(25);
    expect(p.mancante).toBe(7500);
    expect(p.raggiunto).toBe(false);
  });

  it("progressoVoce: oltre il target resta al 100% e risulta raggiunto", () => {
    const p = progressoVoce({ importo: 12000, target: 10000 });
    expect(p.percentuale).toBe(100);
    expect(p.raggiunto).toBe(true);
    expect(p.mancante).toBe(0);
  });

  it("il fondo trading conta nel patrimonio netto", () => {
    expect(patrimonioNetto(1000, [{ tipo: "Fondo trading", importo: "2500" }])).toBe(3500);
  });
});
