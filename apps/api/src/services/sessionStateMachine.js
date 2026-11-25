const { HttpError } = require('../utils/errors');

// Única fuente de verdad de las transiciones permitidas.
//   pending --accept--> accepted --confirm--> completed
//   pending --reject--> rejected
//   pending|accepted --cancel--> cancelled
const TRANSITIONS = {
  accept: { from: ['pending'], to: 'accepted', actor: 'teacher' },
  reject: { from: ['pending'], to: 'rejected', actor: 'teacher' },
  cancel: { from: ['pending', 'accepted'], to: 'cancelled', actor: 'participant' },
  confirm: { from: ['accepted'], to: 'completed', actor: 'learner' },
};

// Lanza 403 si quien actúa no puede hacerlo y 409 si el estado actual no lo permite.
function authorizeTransition(session, action, uid) {
  const t = TRANSITIONS[action];
  const isTeacher = session.teacherId === uid;
  const isLearner = session.learnerId === uid;
  const allowed =
    t.actor === 'teacher' ? isTeacher : t.actor === 'learner' ? isLearner : isTeacher || isLearner;
  if (!allowed) {
    throw new HttpError(403, 'FORBIDDEN', `Solo ${t.actor === 'participant' ? 'los participantes' : `el ${t.actor === 'teacher' ? 'docente' : 'alumno'}`} puede ejecutar "${action}"`);
  }
  if (!t.from.includes(session.status)) {
    throw new HttpError(409, 'INVALID_TRANSITION', `No se puede ejecutar "${action}" sobre una sesión en estado "${session.status}"`);
  }
  return t;
}

module.exports = { TRANSITIONS, authorizeTransition };