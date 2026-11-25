const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { skillSchema, skillUpdateSchema, idParams } = require('../services/schemas');
const { FieldValue } = require('firebase-admin/firestore');

module.exports = function skillsRouter({ db, auth }) {
  const router = express.Router();

  // Catálogo de habilidades (lo necesita el formulario de perfil, por eso solo exige token).
  router.get(
    '/',
    auth.authenticate,
    asyncHandler(async (_req, res) => {
      const snap = await db.collection('skills').orderBy('name').get();
      res.json(snap.docs.map(docToJson));
    })
  );

  // --- Administración del catálogo: solo rol admin ---
  const adminOnly = [...auth.member, auth.requireRole('admin')];

  router.post(
    '/',
    ...adminOnly,
    validate(skillSchema),
    asyncHandler(async (req, res) => {
      const { id, ...data } = req.body;
      const ref = db.collection('skills').doc(id);
      try {
        await ref.create({ ...data, createdAt: FieldValue.serverTimestamp() });
      } catch (err) {
        if (err.code === 6) throw new HttpError(409, 'SKILL_EXISTS', 'Ya existe una habilidad con ese id');
        throw err;
      }
      res.status(201).json(docToJson(await ref.get()));
    })
  );

  router.put(
    '/:id',
    ...adminOnly,
    validate(idParams, 'params'),
    validate(skillUpdateSchema),
    asyncHandler(async (req, res) => {
      const ref = db.collection('skills').doc(req.params.id);
      if (!(await ref.get()).exists) throw new HttpError(404, 'NOT_FOUND', 'Habilidad no encontrada');
      await ref.update(req.body);
      res.json(docToJson(await ref.get()));
    })
  );

  router.delete(
    '/:id',
    ...adminOnly,
    validate(idParams, 'params'),
    asyncHandler(async (req, res) => {
      const inUse = await db.collection('users').where('offeredSkillIds', 'array-contains', req.params.id).limit(1).get();
      if (!inUse.empty) throw new HttpError(409, 'SKILL_IN_USE', 'Hay miembros que ofrecen esta habilidad; no se puede eliminar');
      await db.collection('skills').doc(req.params.id).delete();
      res.status(204).end();
    })
  );

  return router;
};