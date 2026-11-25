const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { requestCreateSchema, requestUpdateSchema, requestListSchema, idParams } = require('../services/schemas');
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

  // Carga la solicitud y comprueba que quien la modifica sea el dueño (o admin).
  async function loadOwned(req) {
    const ref = db.collection('learningRequests').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, 'NOT_FOUND', 'Solicitud no encontrada');
    if (snap.data().requesterId !== req.user.id && req.user.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Solo el autor puede modificar esta solicitud');
    }
    return { ref, data: snap.data() };
  }

  router.patch(
    '/:id',
    ...auth.member,
    validate(idParams, 'params'),
    validate(requestUpdateSchema),
    asyncHandler(async (req, res) => {
      const { ref, data } = await loadOwned(req);
      if (data.status !== 'open') {
        throw new HttpError(409, 'REQUEST_NOT_OPEN', 'Solo se pueden editar solicitudes abiertas');
      }
      await ref.update({ ...req.body, updatedAt: FieldValue.serverTimestamp() });
      res.json(docToJson(await ref.get()));
    })
  );

  router.delete(
    '/:id',
    ...auth.member,
    validate(idParams, 'params'),
    asyncHandler(async (req, res) => {
      const { ref, data } = await loadOwned(req);
      if (!['open', 'cancelled'].includes(data.status)) {
        throw new HttpError(409, 'REQUEST_IN_PROGRESS', 'No se puede eliminar una solicitud en curso o cumplida');
      }
      await ref.delete();
      res.status(204).end();
    })
  );

  return router;
};