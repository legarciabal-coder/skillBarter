import { useState } from 'react';
import { api } from '../api';
import { DAYS, LEVELS, fmtMinutes, useSkills } from '../hooks';
import ErrorBox from '../components/ErrorBox';

function ProposeForm({ teacher, skillId, onDone }) {
  const [startAt, setStartAt] = useState('');
  const [durationMinutes, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/api/sessions', {
        method: 'POST',
        body: {
          teacherId: teacher.id,
          skillId,
          startAt: new Date(startAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          notes,
        },
      });
      setSent(true);
      onDone?.();
    } catch (err) {
      setError(err);
    }
  }

  if (sent) return <p className="ok">Propuesta enviada ✔ Revisa “Sesiones”.</p>;
  return (
    <form onSubmit={submit} className="row">
      <label>Fecha y hora
        <input type="datetime-local" required value={startAt} onChange={(e) => setStartAt(e.target.value)} />
      </label>
      <label>Duración
        <select value={durationMinutes} onChange={(e) => setDuration(e.target.value)}>
          {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </label>
      <label className="grow">Mensaje (opcional)
        <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
      </label>
      <button type="submit">Enviar propuesta</button>
      <ErrorBox error={error} />
    </form>
  );
}

export default function Search() {
  const { skills } = useSkills();
  const [skillId, setSkillId] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  async function search(e) {
    e.preventDefault();
    setError(null);
    setOpen(null);
    try {
      setResults(await api(`/api/matches?skillId=${encodeURIComponent(skillId)}`));
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
        {results?.map(({ user: u, score, breakdown, overlapMinutes, reasons }) => {
          const offer = u.offeredSkills.find((o) => o.skillId === skillId);
          return (
            <article className="card" key={u.id}>
              <h3>{u.displayName} <span className="badge open">{score} pts</span></h3>
              <p>{u.bio}</p>
              <p><strong>Nivel:</strong> {LEVELS[offer?.level]} · <strong>Horas en común:</strong> {fmtMinutes(overlapMinutes)}/sem</p>
              <ul className="reasons">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <p className="muted">
                {u.availability.length
                  ? u.availability.map((s) => `${DAYS[s.day].slice(0, 3)} ${s.start}-${s.end}`).join(' · ')
                  : 'Sin disponibilidad registrada'}
              </p>
              {open === u.id
                ? <ProposeForm teacher={u} skillId={skillId} />
                : <button type="button" onClick={() => setOpen(u.id)}>Proponer sesión</button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}