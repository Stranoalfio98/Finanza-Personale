import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  computeAccountBalance,
  computeNetWorth,
  computeBudgetStatus,
  computeGoalProgress,
  computeGoalAccumulated,
  computeBfpNetValue,
} from './calc.js';

describe('validateAmount', () => {
  it('accetta importi positivi', () => {
    expect(validateAmount(10)).toBe(true);
  });
  it('rifiuta zero', () => {
    expect(() => validateAmount(0)).toThrow();
  });
  it('rifiuta importi negativi', () => {
    expect(() => validateAmount(-5)).toThrow();
  });
});

describe('computeAccountBalance', () => {
  const transactions = [
    { type: 'entrata', amount: 1300, accountId: 'postepay' },
    { type: 'uscita', amount: 50, accountId: 'postepay' },
    { type: 'giroconto', amount: 200, fromAccountId: 'postepay', toAccountId: 'trade-republic' },
  ];

  it('somma entrate e sottrae uscite per il conto giusto', () => {
    expect(computeAccountBalance('postepay', 1000, transactions)).toBe(1000 + 1300 - 50 - 200);
  });

  it('un giroconto in entrata aumenta il saldo del conto destinazione', () => {
    expect(computeAccountBalance('trade-republic', 500, transactions)).toBe(500 + 200);
  });

  it('non tocca conti non coinvolti', () => {
    expect(computeAccountBalance('revolut', 300, transactions)).toBe(300);
  });
});

describe('computeNetWorth', () => {
  it('somma conti, investimenti e BFP, sottrae i debiti', () => {
    const result = computeNetWorth({
      accountsTotal: 5000,
      investmentsValue: 2000,
      bfpValue: 1000,
      debtsTotal: 500,
    });
    expect(result).toBe(7500);
  });

  it('funziona senza debiti', () => {
    expect(computeNetWorth({ accountsTotal: 1000, investmentsValue: 0, bfpValue: 0 })).toBe(1000);
  });
});

describe('computeBudgetStatus', () => {
  it('segnala "ok" sotto l\'80%', () => {
    const r = computeBudgetStatus({ monthlyIncome: 1000, targetPercent: 0.2, spentAmount: 100 });
    expect(r.status).toBe('ok');
    expect(r.targetAmount).toBe(200);
  });

  it('segnala "attenzione" tra 80% e 100%', () => {
    const r = computeBudgetStatus({ monthlyIncome: 1000, targetPercent: 0.2, spentAmount: 170 });
    expect(r.status).toBe('attenzione');
  });

  it('segnala "superato" oltre il target', () => {
    const r = computeBudgetStatus({ monthlyIncome: 1000, targetPercent: 0.2, spentAmount: 250 });
    expect(r.status).toBe('superato');
    expect(r.remaining).toBeLessThan(0);
  });

  it('rifiuta targetPercent fuori range', () => {
    expect(() =>
      computeBudgetStatus({ monthlyIncome: 1000, targetPercent: 1.5, spentAmount: 10 })
    ).toThrow();
  });
});

describe('computeGoalProgress', () => {
  it('calcola percentuale e importo mancante', () => {
    const r = computeGoalProgress({ targetAmount: 5000, accumulatedAmount: 1680 });
    expect(r.percent).toBeCloseTo(0.336);
    expect(r.missing).toBeCloseTo(3320);
    expect(r.completed).toBe(false);
  });

  it('non supera mai il 100%', () => {
    const r = computeGoalProgress({ targetAmount: 1000, accumulatedAmount: 5000 });
    expect(r.percent).toBe(1);
    expect(r.completed).toBe(true);
  });
});

describe('computeGoalAccumulated', () => {
  const transactions = [
    { amount: 200, goalId: 'norvegia' },
    { amount: 150, goalId: 'norvegia' },
    { amount: 300, goalId: 'etf' },
    { amount: 50, goalId: null },
  ];

  it('somma solo le transazioni collegate all\'obiettivo giusto', () => {
    expect(computeGoalAccumulated('norvegia', transactions)).toBe(350);
  });

  it('ritorna 0 se nessuna transazione è collegata', () => {
    expect(computeGoalAccumulated('fondo-emergenza', transactions)).toBe(0);
  });
});

describe('computeBfpNetValue', () => {
  it('applica il 12.5% solo sulla plusvalenza', () => {
    // capitale 1000, valore attuale 1200 -> plusvalenza 200 -> tassa 25 -> netto 1175
    expect(computeBfpNetValue({ capital: 1000, currentValueEstimate: 1200 })).toBeCloseTo(1175);
  });

  it('nessuna tassa se non c\'è plusvalenza', () => {
    expect(computeBfpNetValue({ capital: 1000, currentValueEstimate: 900 })).toBe(900);
  });
});
