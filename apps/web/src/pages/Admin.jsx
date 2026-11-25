import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fmtMinutes, useSkills } from '../hooks';
import ErrorBox from '../components/ErrorBox';

export default function Admin() {
  const { skills } = useSkills();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [skillList, setSkillList] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', category: '' });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, u, k] = await Promise.all([api('/api/admin/stats'), api('/api/admin/users'), api('/api/skills')]);
      setStats(s); setUsers(u); setSkillList(k);
    } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError(null);
    try { await fn(); await load(); } catch (err) { setError(err); }
  };

  const list = skillList || skills;

  return (
    <section>
      <h1>Panel de administración</h1>
      <ErrorBox error={error} />
      {stats && (
        <div className="grid stats">
          <div className="card"><p className="muted">Miembros</p><p className="big">{stats.users}</p></div>
          <div className="card"><p className="muted">Solicitudes abiertas</p><p className="big">{stats.openRequests}</p></div>
          <div className="card"><p className="muted">Sesiones completadas</p><p className="big">{stats.sessions.completed}</p></div>
          <div className="card"><p className="muted">Tiempo intercambiado</p><p className="big">{fmtMinutes(stats.minutesExchanged)}</p></div>
        </div>
      )}

      <div className="card">
        <h2>Catálogo de habilidades</h2>
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/api/skills', { method: 'POST', body: form }); setForm({ id: '', name: '', category: '' }); }); }}>
          <input placeholder="id (ej. ajedrez)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          <button type="submit">Agregar</button>
        </form>
        <ul className="chips">
          {list.map((s) => (
            <li key={s.id}>{s.name}
              <button className="x" title="Eliminar" onClick={() => run(() => api(`/api/skills/${s.id}`, { method: 'DELETE' }))}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Miembros</h2>
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.displayName}</td><td>{u.email}</td><td>{u.role}</td>
                <td>{u.disabled ? 'Deshabilitado' : 'Activo'}</td>
                <td>
                  <button className="secondary" onClick={() => run(() => api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { disabled: !u.disabled } }))}>
                    {u.disabled ? 'Habilitar' : 'Deshabilitar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}