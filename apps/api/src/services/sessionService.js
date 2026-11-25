const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { HttpError } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { authorizeTransition } = require('./sessionStateMachine');
const { assertSkillsExist } = require('./skillsService');
const { ensureWallet, creditTeacherWrites } = require('./walletService');

// Alta de una propuesta de sesión (la hace el alumno; queda "pending").
async function createSession(db, learner, input) {
  const { teacherId, skillId, startAt, durationMinutes, requestId, notes } = input;

  if (teacherId === learner.id) {
    throw new HttpError(400, 'SELF_SESSION', 'No puedes proponerte una sesión a ti mismo');
  }
  if (startAt.getTime() <= Date.now()) {
    throw new HttpError(400, 'START_IN_PAST', 'La sesión debe programarse a una fecha futura');
  }

  const teacherSnap = await db.collection('users').doc(teacherId).get();
  if (!teacherSnap.exists || teacherSnap.data().disabled) {
    throw new HttpError(404, 'TEACHER_NOT_FOUND', 'El docente indicado no existe');
  }
  const teacher = teacherSnap.data();
  if (!(teacher.offeredSkillIds || []).includes(skillId)) {
    throw new HttpError(400, 'TEACHER_DOES_NOT_OFFER_SKILL', 'El docente no ofrece esa habilidad');
  }
  const skills = await assertSkillsExist(db, [skillId]);

  if (requestId) {
    const reqSnap = await db.collection('learningRequests').doc(requestId).get();
    if (!reqSnap.exists || reqSnap.data().requesterId !== learner.id) {
      throw new HttpError(404, 'REQUEST_NOT_FOUND', 'La solicitud indicada no existe o no es tuya');
    }
    if (reqSnap.data().skillId !== skillId) {
      throw new HttpError(400, 'REQUEST_SKILL_MISMATCH', 'La solicitud es de otra habilidad');
    }
    if (reqSnap.data().status !== 'open') {
      throw new HttpError(409, 'REQUEST_NOT_OPEN', 'La solicitud ya no está abierta');
    }
  }

  const ref = db.collection('sessions').doc();
  await ref.set({
    teacherId,
    teacherName: teacher.displayName,
    learnerId: learner.id,
    learnerName: learner.displayName,
    skillId,
    skillName: skills.get(skillId).name,
    requestId: requestId || null,
    startAt: Timestamp.fromDate(startAt),
    durationMinutes,
    notes,
    status: 'pending',
    history: [{ status: 'pending', by: learner.id, at: Timestamp.now() }],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docToJson(await ref.get());
}

// Ejecuta accept | reject | cancel | confirm dentro de UNA transacción de Firestore:
// el estado se lee, se valida y se modifica de forma atómica (sin condiciones de carrera).
async function transitionSession(db, sessionId, action, uid) {
  const sessionRef = db.collection('sessions').doc(sessionId);
  const pre = await sessionRef.get();
  if (!pre.exists) throw new HttpError(404, 'NOT_FOUND', 'Sesión no encontrada');

  // La billetera debe existir antes de entrar a la transacción.
  if (action === 'confirm') await ensureWallet(db, pre.data().teacherId);

  await db.runTransaction(async (tx) => {
    // ---------- 1) LECTURAS (Firestore exige leer todo antes de escribir) ----------
    const snap = await tx.get(sessionRef);
    const session = snap.data();
    const transition = authorizeTransition(session, action, uid);

    const requestRef = session.requestId ? db.collection('learningRequests').doc(session.requestId) : null;
    const requestSnap = requestRef ? await tx.get(requestRef) : null;

    if (action === 'accept') {
      if (requestSnap?.exists && requestSnap.data().status !== 'open') {
        throw new HttpError(409, 'REQUEST_NOT_OPEN', 'La solicitud ya fue asignada a otra sesión');
      }
      // El docente no puede aceptar dos sesiones que se traslapen en el tiempo.
      const accepted = await tx.get(
        db.collection('sessions').where('teacherId', '==', session.teacherId).where('status', '==', 'accepted')
      );
      const start = session.startAt.toMillis();
      const end = start + session.durationMinutes * 60000;
      const clash = accepted.docs.some((d) => {
        const o = d.data();
        const os = o.startAt.toMillis();
        return os < end && start < os + o.durationMinutes * 60000;
      });
      if (clash) {
        throw new HttpError(409, 'SCHEDULE_CONFLICT', 'El docente ya tiene otra sesión aceptada en ese horario');
      }
    }

    let teacherWallet = null;
    if (action === 'confirm') {
      teacherWallet = (await tx.get(db.collection('wallets').doc(session.teacherId))).data();
    }

    // ---------- 2) ESCRITURAS ----------
    tx.update(sessionRef, {
      status: transition.to,
      updatedAt: FieldValue.serverTimestamp(),
      history: FieldValue.arrayUnion({ status: transition.to, by: uid, at: Timestamp.now() }),
    });

    if (requestSnap?.exists) {
      const current = requestSnap.data().status;
      let next = null;
      if (action === 'accept') next = 'matched';
      if (action === 'confirm') next = 'fulfilled';
      if (action === 'cancel' && session.status === 'accepted' && current === 'matched') next = 'open';
      if (next) tx.update(requestRef, { status: next, updatedAt: FieldValue.serverTimestamp() });
    }

    if (action === 'confirm') {
      creditTeacherWrites(tx, db, { session, sessionId, teacherWallet });
    }
  });

  return docToJson(await sessionRef.get());
}

module.exports = { createSession, transitionSession };