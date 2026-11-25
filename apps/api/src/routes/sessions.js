const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { sessionCreateSchema, sessionListSchema, sessionActionParams, idParams } = require('../services/schemas');
const { createSession, transitionSession } = require('../services/sessionService');

module.exports = function sessionsRouter({ db, auth }) {
  const router = express.Router();

  router.post(
    '/',
    ...auth.member,
    validate(sessionCreateSchema),
    asyncHandler(async (req, res) => {
      res.status(201).json(await createSession(db, req.user, req.body));
    })
  );

  // Mis sesiones, como docente y/o alumno.
  router.get(
    '/',
    ...auth.member,
    validate(sessionListSchema, 'query'),
    asyncHandler(async (req, res) => {
      const { as, status } = req.query;
      const uid = req.user.id;
      const run = (field) =>
        db.collection('sessions').where(field, '==', uid).orderBy('createdAt', 'desc').limit(100).get();
      const snaps = [];
      if (as !== 'learner') snaps.push(await run('teacherId'));
      if (as !== 'teacher') snaps.push(await run('learnerId'));
      const items = snaps
        .flatMap((s) => s.docs.map(docToJson))
        .filter((s) => (status ? s.status === status : true))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      res.json(items);
    })
  );

  router.get(
    '/:id',
    ...auth.member,
    validate(idParams, 'params'),
    asyncHandler(async (req, res) => {
      const snap = await db.collection('sessions').doc(req.params.id).get();
      if (!snap.exists) throw new HttpError(404, 'NOT_FOUND', 'Sesión no encontrada');
      const s = snap.data();
      const isParticipant = [s.teacherId, s.learnerId].includes(req.user.id);
      if (!isParticipant && req.user.role !== 'admin') {
        throw new HttpError(403, 'FORBIDDEN', 'No participas en esta sesión');
      }
      res.json(docToJson(snap));
    })
  );

  // POST /api/sessions/:id/accept | reject | cancel | confirm
  router.post(
    '/:id/:action',
    ...auth.member,
    validate(sessionActionParams, 'params'),
    asyncHandler(async (req, res) => {
      res.json(await transitionSession(db, req.params.id, req.params.action, req.user.id));
    })
  );

  return router;
};