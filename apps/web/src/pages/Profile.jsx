import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { DAYS, LEVELS, useSkills } from '../hooks';
import ErrorBox from '../components/ErrorBox';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { skills, byId } = useSkills();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [offered, setOffered] = useState([]);
  const [wanted, setWanted] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [newOffer, setNewOffer] = useState({ skillId: '', level: 'intermediate' });
  const [newSlot, setNewSlot] = useState({ day: 1, start: '18:00', end: '20:00' });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio || '');
      setOffered(profile.offeredSkills || []);
      setWanted(profile.wantedSkills || []);
      setAvailability(profile.availability || []);
    }
  }, [profile]);

  const addOffer = () => {
    if (!newOffer.skillId || offered.some((o) => o.skillId === newOffer.skillId)) return;
    setOffered([...offered, newOffer]);
  };
  const toggleWanted = (id) =>
    setWanted(wanted.includes(id) ? wanted.filter((w) => w !== id) : [...wanted, id]);

  async function save(e) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const body = { displayName, bio, offeredSkills: offered, wantedSkills: wanted, availability };
      await api('/api/users/me', { method: profile ? 'PUT' : 'POST', body });
      await refreshProfile();
      setSaved(true);
      if (!profile) navigate('/buscar');
    } catch (err) {
      setError(err);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h1>{profile ? 'Mi perfil' : 'Completa tu perfil'}</h1>
      <label>Nombre público
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <label>Sobre mí
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>

      <fieldset>
        <legend>Habilidades que ofrezco</legend>
        <div className="row">
          <select value={newOffer.skillId} onChange={(e) => setNewOffer({ ...newOffer, skillId: e.target.value })}>
            <option value="">Elige habilidad…</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={newOffer.level} onChange={(e) => setNewOffer({ ...newOffer, level: e.target.value })}>
            {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" onClick={addOffer}>Añadir</button>
        </div>
        <ul className="chips">
          {offered.map((o) => (
            <li key={o.skillId}>
              {byId[o.skillId]?.name || o.skillId} · {LEVELS[o.level]}
              <button type="button" className="x" onClick={() => setOffered(offered.filter((x) => x.skillId !== o.skillId))}>×</button>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend>Temas que quiero aprender</legend>
        <div className="chips">
          {skills.map((s) => (
            <label key={s.id} className={`chip ${wanted.includes(s.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={wanted.includes(s.id)} onChange={() => toggleWanted(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Disponibilidad semanal</legend>
        <div className="row">
          <select value={newSlot.day} onChange={(e) => setNewSlot({ ...newSlot, day: Number(e.target.value) })}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <input type="time" value={newSlot.start} onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })} />
          <input type="time" value={newSlot.end} onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })} />
          <button type="button" onClick={() => setAvailability([...availability, newSlot])}>Añadir</button>
        </div>
        <ul className="chips">
          {availability.map((s, i) => (
            <li key={i}>
              {DAYS[s.day]} {s.start}–{s.end}
              <button type="button" className="x" onClick={() => setAvailability(availability.filter((_, j) => j !== i))}>×</button>
            </li>
          ))}
        </ul>
      </fieldset>

      <ErrorBox error={error} />
      {saved && <p className="ok">Perfil guardado ✔</p>}
      <button type="submit">Guardar perfil</button>
    </form>
  );
}
