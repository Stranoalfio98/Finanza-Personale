import { describe, it, expect } from "vitest";
import { chiaviUltimiMesi, serieEntrateUscite, saldoFineMese, speseDelMesePerCategoria, budgetDelMese } from "./calc.js";

const T = (data, importo, macrocategoria, sottocategoria = "x") => ({ data, importo, categorie: { macrocategoria, sottocategoria } });

describe("chiaviUltimiMesi", () => {
  it("restituisce gli ultimi n mesi in ordine, a cavallo dell'anno", () => {
    expect(chiaviUltimiMesi(3, new Date(2026, 0, 15))).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
  it("con n = 1 restituisce il mese di oggi (ora locale)", () => {
    expect(chiaviUltimiMesi(1, new Date(2026, 9, 1, 0, 30))).toEqual(["2026-10"]);
  });
});

describe("serieEntrateUscite", () => {
  const tx = [T("2026-09-01", 1320, "Entrate"), T("2026-09-05", -100, "Risparmio"), T("2026-09-10", -50, "Desiderio"), T("2026-10-01", 1320, "Entrate")];
  it("calcola entrate, uscite e messo da parte per mese", () => {
    const s = serieEntrateUscite(tx, ["2026-09", "2026-10"]);
    expect(s[0]).toMatchObject({ entrate: 1320, uscite: 150, netto: 1170, mese: "Settembre 2026" });
    expect(s[1]).toMatchObject({ entrate: 1320, uscite: 0, netto: 1320 });
  });
  it("i mesi senza transazioni valgono zero", () => {
    expect(serieEntrateUscite(tx, ["2026-08"])[0]).toMatchObject({ entrate: 0, uscite: 0, netto: 0 });
  });
});

describe("saldoFineMese", () => {
  it("somma tutte le transazioni fino alla fine di ciascun mese", () => {
    const tx = [{ data: "2026-08-10", importo: 100 }, { data: "2026-09-02", importo: -30 }, { data: "2026-10-01", importo: "50.00" }];
    expect(saldoFineMese(tx, ["2026-08", "2026-09", "2026-10"])).toEqual([100, 70, 120]);
  });
});

describe("speseDelMesePerCategoria", () => {
  const tx = [
    T("2026-10-02", -40, "Desiderio", "🛒 Spesa"),
    T("2026-10-03", -20, "Desiderio", "🛒 Spesa"),
    T("2026-10-04", -70, "Desiderio", "🍕 Ristoranti"),
    T("2026-10-05", -150, "Risparmio", "🏦 ETF"),
    T("2026-10-06", 1320, "Entrate", "🤑 Stipendio"),
    T("2026-09-30", -999, "Desiderio", "🛒 Spesa"),
  ];
  const g = speseDelMesePerCategoria(tx, "2026-10");
  it("raggruppa per macrocategoria, in ordine fisso", () => {
    expect(g.map((x) => x.macro)).toEqual(["Risparmio", "Bisogno", "Desiderio"]);
  });
  it("somma le uscite per sottocategoria, dalla più alta", () => {
    const des = g.find((x) => x.macro === "Desiderio");
    expect(des.totale).toBe(130);
    expect(des.voci).toEqual([{ nome: "🍕 Ristoranti", importo: 70 }, { nome: "🛒 Spesa", importo: 60 }]);
  });
  it("ignora entrate e altri mesi; macrocategorie vuote restano a zero", () => {
    expect(g.find((x) => x.macro === "Bisogno")).toEqual({ macro: "Bisogno", totale: 0, voci: [] });
  });
});

describe("budgetDelMese", () => {
  const ratio = { Risparmio: 35, Bisogno: 22.7, Desiderio: 42.3 };
  const riga = { entrata: 1320, risReale: 250, bisReale: 140.2, desReale: 221.8 };

  it("calcola quanto resta in totale e al giorno", () => {
    const b = budgetDelMese(riga, ratio, 18, 31);
    expect(b.uscite).toBeCloseTo(612);
    expect(b.resta).toBeCloseTo(708);
    expect(b.alGiorno).toBeCloseTo(708 / 14); // dal 18 al 31 compresi
    expect(b.ritmo).toBeCloseTo((18 / 31) * 100);
  });

  it("per ogni macrocategoria: budget, speso, resta e avanzamento", () => {
    const r = budgetDelMese(riga, ratio, 18, 31).macro.find((m) => m.macro === "Risparmio");
    expect(r.budget).toBeCloseTo(462);
    expect(r.resta).toBeCloseTo(212);
    expect(r.avanzamento).toBeCloseTo(54.11, 1);
  });

  it("l'avanzamento non supera il 100% e il resta può diventare negativo", () => {
    const m = budgetDelMese({ entrata: 100, risReale: 0, bisReale: 0, desReale: 200 }, ratio, 5, 30).macro.find((x) => x.macro === "Desiderio");
    expect(m.avanzamento).toBe(100);
    expect(m.resta).toBeCloseTo(42.3 - 200);
  });

  it("senza entrate e senza spese tutto vale zero", () => {
    const b = budgetDelMese(null, ratio, 1, 31);
    expect(b).toMatchObject({ entrata: 0, uscite: 0, resta: 0, alGiorno: 0 });
    expect(b.macro.every((m) => m.avanzamento === 0)).toBe(true);
  });

  it("il resta al giorno non è mai negativo", () => {
    expect(budgetDelMese({ entrata: 100, risReale: 0, bisReale: 0, desReale: 300 }, ratio, 10, 30).alGiorno).toBe(0);
  });
});
