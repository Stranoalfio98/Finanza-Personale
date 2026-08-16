// calc.js
// Logica di calcolo pura, senza dipendenze da React o Supabase.
// Ogni funzione qui deve essere testabile passando solo dati semplici.

/**
 * Valida un importo di transazione. Blocca importi negativi o a zero,
 * come richiesto fin dal primo giorno.
 */
export function validateAmount(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new Error('Importo non valido: deve essere un numero');
  }
  if (amount <= 0) {
    throw new Error('Importo non valido: deve essere maggiore di zero');
  }
  return true;
}

/**
 * Calcola il saldo corrente di un conto a partire dal saldo iniziale
 * e dalla lista di transazioni. Rispecchia la view `account_balances` in SQL.
 *
 * @param {string} accountId
 * @param {number} startingBalance
 * @param {Array} transactions - { type: 'entrata'|'uscita'|'giroconto', amount, accountId, fromAccountId, toAccountId }
 */
export function computeAccountBalance(accountId, startingBalance, transactions) {
  return transactions.reduce((balance, t) => {
    if (t.type === 'entrata' && t.accountId === accountId) return balance + t.amount;
    if (t.type === 'uscita' && t.accountId === accountId) return balance - t.amount;
    if (t.type === 'giroconto' && t.fromAccountId === accountId) return balance - t.amount;
    if (t.type === 'giroconto' && t.toAccountId === accountId) return balance + t.amount;
    return balance;
  }, startingBalance);
}

/**
 * Calcola il patrimonio netto:
 * saldo conti + valore investimenti + valore BFP - debiti
 */
export function computeNetWorth({ accountsTotal = 0, investmentsValue = 0, bfpValue = 0, debtsTotal = 0 }) {
  return accountsTotal + investmentsValue + bfpValue - debtsTotal;
}

/**
 * Stato di un budget mensile per macrocategoria: quanto puoi ancora spendere
 * e se hai superato la soglia.
 */
export function computeBudgetStatus({ monthlyIncome, targetPercent, spentAmount }) {
  if (monthlyIncome < 0) throw new Error('monthlyIncome non può essere negativo');
  if (targetPercent < 0 || targetPercent > 1) throw new Error('targetPercent deve essere tra 0 e 1');

  const targetAmount = monthlyIncome * targetPercent;
  const remaining = targetAmount - spentAmount;
  const percentUsed = targetAmount === 0 ? 0 : spentAmount / targetAmount;

  let status = 'ok';
  if (percentUsed >= 1) status = 'superato';
  else if (percentUsed >= 0.8) status = 'attenzione';

  return { targetAmount, remaining, percentUsed, status };
}

/**
 * Progresso di un obiettivo di risparmio.
 */
export function computeGoalProgress({ targetAmount, accumulatedAmount }) {
  if (targetAmount <= 0) throw new Error('targetAmount deve essere maggiore di zero');
  const percent = Math.min(accumulatedAmount / targetAmount, 1);
  const missing = Math.max(targetAmount - accumulatedAmount, 0);
  return { percent, missing, completed: accumulatedAmount >= targetAmount };
}

/**
 * Valore lordo -> netto di un BFP, applicando la tassazione agevolata 12.5%
 * sulla sola plusvalenza (capitale - valore attuale).
 */
export function computeBfpNetValue({ capital, currentValueEstimate, taxRate = 0.125 }) {
  const gain = Math.max(currentValueEstimate - capital, 0);
  const tax = gain * taxRate;
  return currentValueEstimate - tax;
}
