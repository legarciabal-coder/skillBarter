import { useState } from 'react';
import { api } from '../api';
import { DAYS, LEVELS, useSkills } from '../hooks';
import ErrorBox from '../components/ErrorBox';

export default function Search() {
  const { skills, byId } = useSkills();
  const [skillId, setSkillId] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  async function search(e) {
    e.preventDefault();
    setError(null);
    try {
      setResults(await api(`/api/users?offers=${encodeURIComponent(skillId)}`));
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <form className="card row" onSubmit={search}>
        <label className="grow">¿Qué quieres aprender?
          <select value={skillId} onChange={(e) => setSkillId(e.target.value)} required>
            <option value="">Elige una habilidad…</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <button type="submit">Buscar quién la enseña</button>
      </form>
      <ErrorBox error={error} />
      {results && results.length === 0 && <p className="muted">Nadie ofrece esta habilidad todavía.</p>}
      <div className="grid">
        {results?.map((u) => {
          const offer = u.offeredSkills.find((o) => o.skillId === skillId);
          return (
            <article className="card" key={u.id}>
              <h3>{u.displayName}</h3>
              <p>{u.bio}</p>
              <p><strong>{byId[skillId]?.name}</strong> · {LEVELS[offer?.level]}</p>
              <p className="muted">
                {u.availability.length
                  ? u.availability.map((s) => `${DAYS[s.day].slice(0, 3)} ${s.start}-${s.end}`).join(' · ')
                  : 'Sin disponibilidad registrada'}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
