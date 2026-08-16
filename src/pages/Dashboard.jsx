import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient.js';
import { computeGoalProgress, computeGoalAccumulated } from '../calc.js';

function formatEuro(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');

      const { data: accountRows, error: accountsError } = await supabase
        .from('account_balances')
        .select('*');

      const { data: goalRows, error: goalsError } = await supabase.from('goals').select('*');
      const { data: txRows, error: txError } = await supabase
        .from('transactions')
        .select('amount, goal_id');

      if (cancelled) return;

      if (accountsError || goalsError || txError) {
        setErrorMessage((accountsError || goalsError || txError).message || 'Errore nel caricamento');
        setStatus('error');
        return;
      }

      const goalsWithProgress = (goalRows || []).map((g) => {
        const accumulated = computeGoalAccumulated(
          g.id,
          (txRows || []).map((t) => ({ amount: t.amount, goalId: t.goal_id }))
        );
        return { ...g, accumulated, ...computeGoalProgress({ targetAmount: g.target_amount, accumulatedAmount: accumulated }) };
      });

      setAccounts(accountRows || []);
      setGoals(goalsWithProgress);
      setStatus('ready');
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="page-head">
        <h2>Dashboard</h2>
        <p>Saldi conti e progresso obiettivi, in tempo reale.</p>
      </div>

      {status === 'loading' && (
        <p className="state-message"><Loader2 size={14} className="spin" style={{ verticalAlign: 'middle', marginRight: 6 }} />Caricamento…</p>
      )}
      {status === 'error' && (
        <p className="state-message error">
          Non riesco a leggere i dati da Supabase ({errorMessage}). Controlla schema.sql, seed.sql e .env.
        </p>
      )}

      {status === 'ready' && (
        <>
          <div className="stat-grid">
            {accounts.map((a) => (
              <div className="stat-card" key={a.account_id}>
                <div className="stat-label">{a.name}</div>
                <div className={`stat-value mono ${a.current_balance >= 0 ? 'positive' : 'negative'}`}>
                  {formatEuro(a.current_balance)}
                </div>
              </div>
            ))}
            {accounts.length === 0 && <p className="state-message">Nessun conto trovato — hai eseguito seed.sql?</p>}
          </div>

          <div className="section-title">Obiettivi</div>
          <div className="stat-grid">
            {goals.map((g) => (
              <div className="goal-card" key={g.id}>
                <div className="stat-label">
                  <span>{g.name}</span>
                </div>
                <div className="stat-value mono positive">
                  {formatEuro(g.accumulated)}{' '}
                  <span className="dim" style={{ fontSize: '0.8rem' }}>/ {formatEuro(g.target_amount)}</span>
                </div>
                <div className="goal-bar-track">
                  <div
                    className={`goal-bar-fill${g.completed ? ' completed' : ''}`}
                    style={{ width: `${Math.round(g.percent * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
