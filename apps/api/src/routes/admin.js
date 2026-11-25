const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { adminUserPatchSchema, idParams } = require('../services/schemas');
const { FieldValue } = require('firebase-admin/firestore');

module.exports = function adminRouter({ db, auth }) {
  const router = express.Router();
  router.use(...auth.member, auth.requireRole('admin'));

  const count = async (query) => (await query.count().get()).data().count;

  // Indicadores generales de la comunidad.
  router.get(
    '/stats',
    asyncHandler(async (_req, res) => {
      const statuses = ['pending', 'accepted', 'rejected', 'cancelled', 'completed'];
      const [users, skills, openRequests, ...bySession] = await Promise.all([
        count(db.collection('users')),
        count(db.collection('skills')),
        count(db.collection('learningRequests').where('status', '==', 'open')),
        ...statuses.map((s) => count(db.collection('sessions').where('status', '==', s))),
      ]);
      const completed = await db.collection('sessions').where('status', '==', 'completed').get();
      const minutesExchanged = completed.docs.reduce((sum, d) => sum + d.data().durationMinutes, 0);
      res.json({
        users,
        skills,
        openRequests,
        sessions: Object.fromEntries(statuses.map((s, i) => [s, bySession[i]])),
        minutesExchanged,
      });
    })
  );

  router.get(
    '/users',
    asyncHandler(async (_req, res) => {
      const snap = await db.collection('users').orderBy('createdAt', 'desc').limit(100).get();
      res.json(snap.docs.map(docToJson));
    })
  );

  router.patch(
    '/users/:id',
    validate(idParams, 'params'),
    validate(adminUserPatchSchema),
    asyncHandler(async (req, res) => {
      if (req.params.id === req.user.id) {
        throw new HttpError(400, 'CANNOT_MODIFY_SELF', 'No puedes cambiar tu propio rol ni deshabilitarte');
      }
      const ref = db.collection('users').doc(req.params.id);
      if (!(await ref.get()).exists) throw new HttpError(404, 'NOT_FOUND', 'Usuario no encontrado');
      await ref.update({ ...req.body, updatedAt: FieldValue.serverTimestamp() });
      res.json(docToJson(await ref.get()));
    })
  );

  return router;
};