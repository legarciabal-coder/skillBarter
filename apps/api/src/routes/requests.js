const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { requestCreateSchema, requestListSchema, idParams } = require('../services/schemas');
const { assertSkillsExist } = require('../services/skillsService');
const { FieldValue } = require('firebase-admin/firestore');

module.exports = function requestsRouter({ db, auth }) {
  const router = express.Router();

  // Alta de solicitud de aprendizaje.
  router.post(
    '/',
    ...auth.member,
    validate(requestCreateSchema),
    asyncHandler(async (req, res) => {
      const { skillId, description, durationMinutes } = req.body;
      const skills = await assertSkillsExist(db, [skillId]);
      const ref = db.collection('learningRequests').doc();
      await ref.set({
        requesterId: req.user.id,
        requesterName: req.user.displayName,
        skillId,
        skillName: skills.get(skillId).name,
        description,
        durationMinutes,
        status: 'open',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.status(201).json(docToJson(await ref.get()));
    })
  );

  // Listado con filtros. Un solo filtro de igualdad en Firestore; el resto en memoria.
  router.get(
    '/',
    ...auth.member,
    validate(requestListSchema, 'query'),
    asyncHandler(async (req, res) => {
      const { status, skillId, mine } = req.query;
      let query = db.collection('learningRequests');
      if (status) query = query.where('status', '==', status);
      const snap = await query.limit(200).get();
      const items = snap.docs
        .map(docToJson)
        .filter((r) => (skillId ? r.skillId === skillId : true))
        .filter((r) => (mine === 'true' ? r.requesterId === req.user.id : true))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      res.json(items);
    })
  );

  router.get(
    '/:id',
    ...auth.member,
    validate(idParams, 'params'),
    asyncHandler(async (req, res) => {
      const snap = await db.collection('learningRequests').doc(req.params.id).get();
      if (!snap.exists) throw new HttpError(404, 'NOT_FOUND', 'Solicitud no encontrada');
      res.json(docToJson(snap));
    })
  );

  return router;
};