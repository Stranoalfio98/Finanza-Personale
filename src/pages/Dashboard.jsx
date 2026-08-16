// Placeholder con dati finti — collegheremo Supabase e il design vero
// una volta pronto lo schema e fatto il primo giro di anteprima.
export default function Dashboard() {
  const fakeAccounts = [
    { name: 'Postepay Evolution', balance: 1230.5 },
    { name: 'Revolut', balance: 340.2 },
    { name: 'Trade Republic', balance: 2888.08 },
  ];

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Dati finti di esempio — verranno sostituiti dai dati reali via Supabase.</p>
      <ul>
        {fakeAccounts.map((a) => (
          <li key={a.name}>
            {a.name}: {a.balance.toFixed(2)} €
          </li>
        ))}
      </ul>
    </div>
  );
}
