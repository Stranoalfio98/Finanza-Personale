import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, TrendingUp, Wallet, Moon, Sun } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import InserimentoDati from './pages/InserimentoDati.jsx';
import Investimenti from './pages/Investimenti.jsx';
import Patrimonio from './pages/Patrimonio.jsx';

export default function App() {
  const [theme, setTheme] = useState('dark');

  return (
    <div className={`app-shell ${theme === 'light' ? 'light' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="brand-line1">Finanza</span>
          <span className="brand-line2">Personale</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/inserimento" className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <ListChecks size={16} /> Inserimento Dati
          </NavLink>
          <NavLink to="/investimenti" className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <TrendingUp size={16} /> Investimenti
          </NavLink>
          <NavLink to="/patrimonio" className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}>
            <Wallet size={16} /> Patrimonio
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button
            className="pill-icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Cambia tema"
          >
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inserimento" element={<InserimentoDati />} />
            <Route path="/investimenti" element={<Investimenti />} />
            <Route path="/patrimonio" element={<Patrimonio />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
