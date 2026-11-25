import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { STATUS, fmtDate, fmtMinutes } from '../hooks';
import ErrorBox from '../components/ErrorBox';

export default function Sessions() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try { setItems(await api('/api/sessions')); } catch (err) { setError(err); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    setError(null);
    setBusy(id);
    try {
      await api(`/api/sessions/${id}/${action}`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <h1>Mis sesiones</h1>
      <ErrorBox error={error} />
      {items.length === 0 && <p className="muted">Aún no tienes sesiones. Busca a alguien y propón una.</p>}
      <div className="grid">
        {items.map((s) => {
          const iTeach = s.teacherId === user.uid;
          return (
            <article className="card" key={s.id} data-testid="session">
              <h3>{s.skillName} <span className={`badge ${s.status}`}>{STATUS[s.status]}</span></h3>
              <p>{iTeach ? `Enseñas a ${s.learnerName}` : `Aprendes con ${s.teacherName}`}</p>
              <p className="muted">{fmtDate(s.startAt)} · {fmtMinutes(s.durationMinutes)}</p>
              {s.notes && <p className="muted">“{s.notes}”</p>}
              <div className="row">
                {iTeach && s.status === 'pending' && (
                  <>
                    <button disabled={busy === s.id} onClick={() => act(s.id, 'accept')}>Aceptar</button>
                    <button className="secondary" disabled={busy === s.id} onClick={() => act(s.id, 'reject')}>Rechazar</button>
                  </>
                )}
                {!iTeach && s.status === 'accepted' && (
                  <button disabled={busy === s.id} onClick={() => act(s.id, 'confirm')}>Confirmar que se realizó</button>
                )}
                {['pending', 'accepted'].includes(s.status) && (
                  <button className="danger" disabled={busy === s.id} onClick={() => act(s.id, 'cancel')}>Cancelar</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
