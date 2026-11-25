import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Search from './pages/Search';
import Requests from './pages/Requests';
import Sessions from './pages/Sessions';
import Wallet from './pages/Wallet';
import Admin from './pages/Admin';

// Protege rutas: exige sesión y, además, perfil creado.
function Private({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <p className="center">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile && window.location.pathname !== '/perfil') return <Navigate to="/perfil" replace />;
  return children;
}

export default function App() {
  const { user, profile, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <span className="brand">⏳ SkillBarter</span>
        {user && profile && (
          <nav>
            <NavLink to="/buscar">Buscar</NavLink>
            <NavLink to="/solicitudes">Solicitudes</NavLink>
            <NavLink to="/sesiones">Sesiones</NavLink>
            <NavLink to="/billetera">Billetera</NavLink>
            {profile.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            <NavLink to="/perfil">Mi perfil</NavLink>
          </nav>
        )}
        {user && (
          <button className="link" onClick={logout}>
            Salir ({profile?.displayName || user.email})
          </button>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/buscar" replace /> : <Login />} />
          <Route path="/perfil" element={<Private><Profile /></Private>} />
          <Route path="/buscar" element={<Private><Search /></Private>} />
          <Route path="/solicitudes" element={<Private><Requests /></Private>} />
          <Route path="/sesiones" element={<Private><Sessions /></Private>} />
          <Route path="/billetera" element={<Private><Wallet /></Private>} />
          <Route path="/admin" element={<Private>{profile?.role === 'admin' ? <Admin /> : <Navigate to="/buscar" replace />}</Private>} />
          <Route path="*" element={<Navigate to="/buscar" replace />} />
        </Routes>
      </main>
    </>
  );
}
