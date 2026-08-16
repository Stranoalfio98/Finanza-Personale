import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { validateAmount } from '../calc.js';

const today = () => new Date().toISOString().slice(0, 10);

function formatEuro(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function InserimentoDati() {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [type, setType] = useState('uscita');
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [goalId, setGoalId] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadLists() {
    setLoadingLists(true);
    const [{ data: acc }, { data: cat }, { data: g }] = await Promise.all([
      supabase.from('accounts').select('id, name').order('name'),
      supabase.from('categories').select('id, subcategory, category, kind').order('category'),
      supabase.from('goals').select('id, name').order('name'),
    ]);
    setAccounts(acc || []);
    setCategories(cat || []);
    setGoals(g || []);
    setLoadingLists(false);
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('transactions')
      .select(
        `id, date, type, amount, description,
         account:accounts!account_id(name),
         category:categories!category_id(subcategory),
         from_account:accounts!from_account_id(name),
         to_account:accounts!to_account_id(name)`
      )
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentTx(data || []);
  }

  useEffect(() => {
    loadLists();
    loadRecent();
  }, []);

  const filteredCategories = categories.filter((c) =>
    type === 'entrata' ? c.kind === 'incasso' : c.kind === 'pagamento'
  );

  function resetAfterSubmit() {
    setAmount('');
    setDescription('');
    setNote('');
    setGoalId('');
    // conto, categoria e data restano: velocizza inserimenti multipli dello stesso giorno/conto
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const parsedAmount = parseFloat(amount);
    try {
      validateAmount(parsedAmount);
    } catch (err) {
      setError(err.message);
      return;
    }

    if (type !== 'giroconto' && (!accountId || !categoryId)) {
      setError('Seleziona conto e categoria.');
      return;
    }
    if (type === 'giroconto' && (!fromAccountId || !toAccountId)) {
      setError('Seleziona conto origine e destinazione.');
      return;
    }
    if (type === 'giroconto' && fromAccountId === toAccountId) {
      setError('Conto origine e destinazione devono essere diversi.');
      return;
    }
    if (!description.trim()) {
      setError('Aggiungi una descrizione.');
      return;
    }

    setSaving(true);

    const payload =
      type === 'giroconto'
        ? {
            date,
            type,
            amount: parsedAmount,
            description: description.trim(),
            note: note.trim() || null,
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            goal_id: goalId || null,
          }
        : {
            date,
            type,
            amount: parsedAmount,
            description: description.trim(),
            note: note.trim() || null,
            account_id: accountId,
            category_id: categoryId,
          };

    const { error: insertError } = await supabase.from('transactions').insert(payload);
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess('Transazione salvata.');
    resetAfterSubmit();
    loadRecent();
  }

  return (
    <div>
      <div className="page-head">
        <h2>Inserimento Dati</h2>
        <p>Registra entrate, uscite e giroconti.</p>
      </div>

      <div className="form-card">
        <div className="type-switch">
          {['entrata', 'uscita', 'giroconto'].map((t) => (
            <button
              key={t}
              type="button"
              className={`type-btn ${t}${type === t ? ' active ' + t : ''}`}
              onClick={() => setType(t)}
            >
              {t === 'entrata' ? 'Entrata' : t === 'uscita' ? 'Uscita' : 'Giroconto'}
            </button>
          ))}
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <label className="field">
              <span>Data</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="field">
              <span>Importo (€)</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </label>
          </div>

          {type !== 'giroconto' && (
            <div className="form-row">
              <label className="field">
                <span>Conto</span>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                  <option value="">Seleziona…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Categoria</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="">Seleziona…</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.subcategory} — {c.category}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {type === 'giroconto' && (
            <>
              <div className="form-row">
                <label className="field">
                  <span>Da conto</span>
                  <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} required>
                    <option value="">Seleziona…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>A conto</span>
                  <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} required>
                    <option value="">Seleziona…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Obiettivo collegato (opzionale)</span>
                <select value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="">Nessuno</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="field">
            <span>Descrizione</span>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Spesa alimentare, Stipendio, Bonifico Trade Republic…" required />
          </label>

          <label className="field">
            <span>Nota (opzionale)</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error && <p className="state-message error">{error}</p>}
          {success && <p className="state-message text-positive">{success}</p>}

          <button type="submit" className="btn-primary" disabled={saving || loadingLists}>
            {saving ? 'Salvataggio…' : 'Salva transazione'}
          </button>
        </form>
      </div>

      <div className="section-title">Ultime transazioni</div>
      {recentTx.length === 0 && <p className="state-message">Nessuna transazione ancora.</p>}
      {recentTx.length > 0 && (
        <table className="tx-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrizione</th>
              <th>Conto / Categoria</th>
              <th style={{ textAlign: 'right' }}>Importo</th>
            </tr>
          </thead>
          <tbody>
            {recentTx.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.date).toLocaleDateString('it-IT')}</td>
                <td><span className="tag">{t.type}</span></td>
                <td>{t.description}</td>
                <td>
                  {t.type === 'giroconto'
                    ? `${t.from_account?.name || '—'} → ${t.to_account?.name || '—'}`
                    : `${t.account?.name || '—'} · ${t.category?.subcategory || '—'}`}
                </td>
                <td
                  className={`mono ${
                    t.type === 'uscita' ? 'text-negative' : t.type === 'entrata' ? 'text-positive' : ''
                  }`}
                  style={{ textAlign: 'right' }}
                >
                  {formatEuro(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
