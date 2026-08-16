import { describe, it, expect } from "vitest";
import {
  MESI_CICLO,
  mensileEquivalente,
  totaleAbbonamentiMensile,
  sommaSplit,
  splitValido,
  budgetTeorico,
  rigaBudgetMensile,
  tabellaBudgetMensile,
  accumulatoObiettivo,
  statoVisibileObiettivo,
  progressoObiettivo,
  patrimonioNetto,
  validaTransazione,
  validaAuth,
} from "./calc.js";

describe("mensileEquivalente", () => {
  it("un abbonamento mensile resta invariato", () => {
    expect(mensileEquivalente({ importo: 13.99, frequenza: "Mensile" })).toBeCloseTo(13.99);
  });

  it("un abbonamento annuale viene diviso per 12", () => {
    expect(mensileEquivalente({ importo: 199, frequenza: "Annuale" })).toBeCloseTo(16.5833, 3);
  });

  it("un abbonamento trimestrale viene diviso per 3", () => {
    expect(mensileEquivalente({ importo: 30, frequenza: "Trimestrale" })).toBeCloseTo(10);
  });

  it("lancia un errore con una frequenza sconosciuta", () => {
    expect(() => mensileEquivalente({ importo: 10, frequenza: "Bisettimanale" })).toThrow();
  });
});

describe("totaleAbbonamentiMensile", () => {
  it("somma solo gli abbonamenti attivi", () => {
    const lista = [
      { importo: 10, frequenza: "Mensile", stato: "Attivo" },
      { importo: 120, frequenza: "Annuale", stato: "Attivo" }, // 10/mese
      { importo: 999, frequenza: "Mensile", stato: "Abbandonato" }, // escluso
    ];
    expect(totaleAbbonamentiMensile(lista)).toBeCloseTo(20);
  });

  it("ritorna 0 con lista vuota", () => {
    expect(totaleAbbonamentiMensile([])).toBe(0);
  });
});

describe("split budget", () => {
  it("sommaSplit somma le tre percentuali", () => {
    expect(sommaSplit({ Risparmio: 35, Bisogno: 22.7, Desiderio: 42.3 })).toBeCloseTo(100);
  });

  it("splitValido è vero quando la somma è 100", () => {
    expect(splitValido({ Risparmio: 35, Bisogno: 22.7, Desiderio: 42.3 })).toBe(true);
  });

  it("splitValido è falso quando la somma non è 100", () => {
    expect(splitValido({ Risparmio: 35, Bisogno: 20, Desiderio: 40 })).toBe(false);
  });

  it("budgetTeorico applica le percentuali all'entrata", () => {
    const t = budgetTeorico(1000, { Risparmio: 35, Bisogno: 22.7, Desiderio: 42.3 });
    expect(t.Risparmio).toBeCloseTo(350);
    expect(t.Bisogno).toBeCloseTo(227);
    expect(t.Desiderio).toBeCloseTo(423);
  });
});

describe("rigaBudgetMensile", () => {
  const ratio = { Risparmio: 50, Bisogno: 30, Desiderio: 20 };

  it("calcola nonAllocato positivo quando si spende meno del target", () => {
    const riga = rigaBudgetMensile({ mese: "Test", entrata: 1000, risReale: 100, bisReale: 100, desReale: 100 }, ratio);
    // teorico: 500 + 300 + 200 = 1000, effettivo: 300 -> nonAllocato 700
    expect(riga.nonAllocato).toBeCloseTo(700);
  });

  it("calcola nonAllocato negativo quando si sfora il budget", () => {
    const riga = rigaBudgetMensile({ mese: "Test", entrata: 100, risReale: 200, bisReale: 0, desReale: 0 }, ratio);
    // teorico totale: 50 + 30 + 20 = 100, effettivo: 200 -> nonAllocato -100
    expect(riga.nonAllocato).toBeCloseTo(-100);
  });
});

describe("tabellaBudgetMensile", () => {
  it("il cumulativo si somma riga dopo riga", () => {
    const ratio = { Risparmio: 100, Bisogno: 0, Desiderio: 0 };
    const mesi = [
      { mese: "Gen", entrata: 100, risReale: 50, bisReale: 0, desReale: 0 }, // +50
      { mese: "Feb", entrata: 100, risReale: 150, bisReale: 0, desReale: 0 }, // -50
      { mese: "Mar", entrata: 100, risReale: 0, bisReale: 0, desReale: 0 }, // +100
    ];
    const tabella = tabellaBudgetMensile(mesi, ratio);
    expect(tabella[0].cumulativo).toBeCloseTo(50);
    expect(tabella[1].cumulativo).toBeCloseTo(0);
    expect(tabella[2].cumulativo).toBeCloseTo(100);
  });

  it("con lista vuota ritorna tabella vuota", () => {
    expect(tabellaBudgetMensile([], { Risparmio: 100, Bisogno: 0, Desiderio: 0 })).toEqual([]);
  });
});

describe("obiettivi di risparmio", () => {
  const obiettivoAperto = {
    target: 1000,
    stato: "Attivo",
    storico: [{ importo: 300 }, { importo: 200 }],
  };
  const obiettivoRaggiunto = {
    target: 500,
    stato: "Attivo",
    storico: [{ importo: 300 }, { importo: 200 }],
  };
  const obiettivoInPausa = {
    target: 1000,
    stato: "In pausa",
    storico: [{ importo: 100 }],
  };

  it("accumulatoObiettivo somma lo storico", () => {
    expect(accumulatoObiettivo(obiettivoAperto)).toBe(500);
  });

  it("statoVisibileObiettivo resta quello manuale se sotto target", () => {
    expect(statoVisibileObiettivo(obiettivoAperto)).toBe("Attivo");
    expect(statoVisibileObiettivo(obiettivoInPausa)).toBe("In pausa");
  });

  it("statoVisibileObiettivo diventa Archiviato quando l'accumulato raggiunge il target", () => {
    expect(statoVisibileObiettivo(obiettivoRaggiunto)).toBe("Archiviato");
  });

  it("statoVisibileObiettivo è Archiviato anche se lo stato manuale era In pausa", () => {
    const o = { target: 500, stato: "In pausa", storico: [{ importo: 500 }] };
    expect(statoVisibileObiettivo(o)).toBe("Archiviato");
  });

  it("progressoObiettivo è in percentuale e non supera 100", () => {
    expect(progressoObiettivo(obiettivoAperto)).toBeCloseTo(50);
    expect(progressoObiettivo(obiettivoRaggiunto)).toBe(100);
  });

  it("progressoObiettivo con target 0 non va in errore (divisione per zero)", () => {
    expect(progressoObiettivo({ target: 0, stato: "Attivo", storico: [] })).toBe(0);
  });
});

describe("patrimonioNetto", () => {
  it("somma saldo conti e buoni fruttiferi", () => {
    const buoni = [{ importo: 3593 }, { importo: 3980 }];
    expect(patrimonioNetto(2033, buoni)).toBe(2033 + 3593 + 3980);
  });

  it("funziona senza buoni fruttiferi", () => {
    expect(patrimonioNetto(1000, [])).toBe(1000);
  });
});

describe("validaTransazione", () => {
  it("nessun errore con dati validi", () => {
    const errori = validaTransazione({ importo: "10", descr: "Spesa", cat: "Ristoranti & Bar", ricorrente: false });
    expect(errori).toEqual({});
  });

  it("segnala importo mancante, zero o negativo", () => {
    expect(validaTransazione({ importo: "", descr: "x", cat: "y" }).importo).toBeDefined();
    expect(validaTransazione({ importo: "0", descr: "x", cat: "y" }).importo).toBeDefined();
    expect(validaTransazione({ importo: "-5", descr: "x", cat: "y" }).importo).toBeDefined();
  });

  it("segnala descrizione vuota o solo spazi", () => {
    expect(validaTransazione({ importo: "10", descr: "", cat: "y" }).descr).toBeDefined();
    expect(validaTransazione({ importo: "10", descr: "   ", cat: "y" }).descr).toBeDefined();
  });

  it("segnala categoria mancante", () => {
    expect(validaTransazione({ importo: "10", descr: "x", cat: "" }).cat).toBeDefined();
  });

  it("segnala frequenza mancante se marcato come ricorrente", () => {
    const errori = validaTransazione({ importo: "10", descr: "x", cat: "y", ricorrente: true, frequenza: "" });
    expect(errori.frequenza).toBeDefined();
  });

  it("non richiede frequenza se non ricorrente", () => {
    const errori = validaTransazione({ importo: "10", descr: "x", cat: "y", ricorrente: false });
    expect(errori.frequenza).toBeUndefined();
  });
});

describe("validaAuth", () => {
  it("nessun errore con email e password valide", () => {
    expect(validaAuth({ email: "utente@esempio.com", password: "almeno8car" })).toEqual({});
  });

  it("segnala email mancante o malformata", () => {
    expect(validaAuth({ email: "", password: "almeno8car" }).email).toBeDefined();
    expect(validaAuth({ email: "non-una-email", password: "almeno8car" }).email).toBeDefined();
    expect(validaAuth({ email: "manca@dominio", password: "almeno8car" }).email).toBeDefined();
  });

  it("segnala password mancante o troppo corta", () => {
    expect(validaAuth({ email: "utente@esempio.com", password: "" }).password).toBeDefined();
    expect(validaAuth({ email: "utente@esempio.com", password: "corta" }).password).toBeDefined();
  });

  it("accetta una email con spazi ai bordi", () => {
    expect(validaAuth({ email: "  utente@esempio.com  ", password: "almeno8car" })).toEqual({});
  });
});
