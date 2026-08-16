import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import InserimentoDati from './pages/InserimentoDati.jsx';
import Investimenti from './pages/Investimenti.jsx';
import Patrimonio from './pages/Patrimonio.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/inserimento">Inserimento Dati</NavLink>
        <NavLink to="/investimenti">Investimenti</NavLink>
        <NavLink to="/patrimonio">Patrimonio</NavLink>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inserimento" element={<InserimentoDati />} />
          <Route path="/investimenti" element={<Investimenti />} />
          <Route path="/patrimonio" element={<Patrimonio />} />
        </Routes>
      </main>
    </div>
  );
}
