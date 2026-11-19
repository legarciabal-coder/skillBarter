import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { STATUS, useSkills } from '../hooks';
import ErrorBox from '../components/ErrorBox';

export default function Requests() {
  const { skills } = useSkills();
  const [items, setItems] = useState([]);
  const [filterSkill, setFilterSkill] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [form, setForm] = useState({ skillId: '', description: '', durationMinutes: 60 });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterSkill) params.set('skillId', filterSkill);
    if (onlyMine) params.set('mine', 'true');
    try {
      setItems(await api(`/api/requests?${params}`));
    } catch (err) {
      setError(err);
    }
  }, [filterSkill, onlyMine]);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/api/requests', { method: 'POST', body: { ...form, durationMinutes: Number(form.durationMinutes) } });
      setForm({ skillId: '', description: '', durationMinutes: 60 });
      load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <form className="card" onSubmit={create}>
        <h2>Nueva solicitud de aprendizaje</h2>
        <div className="row">
          <select value={form.skillId} onChange={(e) => setForm({ ...form, skillId: e.target.value })} required>
            <option value="">Habilidad…</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}>
            {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <textarea rows={3} placeholder="Cuéntanos qué quieres aprender…" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        <ErrorBox error={error} />
        <button type="submit">Publicar solicitud</button>
      </form>

      <div className="card row">
        <select value={filterSkill} onChange={(e) => setFilterSkill(e.target.value)}>
          <option value="">Todas las habilidades</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="inline">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Solo mías
        </label>
      </div>

      <div className="grid">
        {items.map((r) => (
          <article className="card" key={r.id}>
            <h3>{r.skillName} <span className={`badge ${r.status}`}>{STATUS[r.status]}</span></h3>
            <p>{r.description}</p>
            <p className="muted">{r.requesterName} · {r.durationMinutes} min</p>
          </article>
        ))}
        {items.length === 0 && <p className="muted">No hay solicitudes con estos filtros.</p>}
      </div>
    </section>
  );
}
