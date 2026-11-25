const express = require('express');
const { HttpError, asyncHandler } = require('../utils/errors');
const { docToJson, serialize } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { profileSchema, userSearchSchema } = require('../services/schemas');
const { assertSkillsExist } = require('../services/skillsService');
const { toPublicProfile } = require('../services/publicProfile');
const { ensureWallet } = require('../services/walletService');
const { FieldValue } = require('firebase-admin/firestore');

// offeredSkillIds / wantedSkillIds están desnormalizados para poder usar array-contains.
const profileFields = (p) => ({
  displayName: p.displayName,
  bio: p.bio,
  offeredSkills: p.offeredSkills,
  offeredSkillIds: p.offeredSkills.map((s) => s.skillId),
  wantedSkills: p.wantedSkills,
  availability: p.availability,
});

module.exports = function usersRouter({ db, auth }) {
  const router = express.Router();

  // Alta de perfil (primer acceso tras registrarse en Firebase Auth).
  router.post(
    '/me',
    auth.authenticate,
    validate(profileSchema),
    asyncHandler(async (req, res) => {
      const p = req.body;
      await assertSkillsExist(db, [...p.offeredSkills.map((s) => s.skillId), ...p.wantedSkills]);
      const ref = db.collection('users').doc(req.auth.uid);
      try {
        await ref.create({
          ...profileFields(p),
          email: req.auth.email,
          role: 'member', // el rol lo fija el servidor, jamás el cliente
          disabled: false,
          ratingSum: 0,
          ratingCount: 0,
          ratingAvg: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        if (err.code === 6) throw new HttpError(409, 'PROFILE_EXISTS', 'El perfil ya existe; usa PUT /api/users/me');
        throw err;
      }
      await ensureWallet(db, req.auth.uid); // bono de bienvenida (idempotente)
      res.status(201).json(docToJson(await ref.get()));
    })
  );

  router.get(
    '/me',
    auth.authenticate,
    asyncHandler(async (req, res) => {
      const snap = await db.collection('users').doc(req.auth.uid).get();
      if (!snap.exists) throw new HttpError(404, 'PROFILE_NOT_FOUND', 'Aún no has creado tu perfil');
      res.json(docToJson(snap));
    })
  );

  router.put(
    '/me',
    ...auth.member,
    validate(profileSchema),
    asyncHandler(async (req, res) => {
      const p = req.body;
      await assertSkillsExist(db, [...p.offeredSkills.map((s) => s.skillId), ...p.wantedSkills]);
      const ref = db.collection('users').doc(req.user.id);
      await ref.update({ ...profileFields(p), updatedAt: FieldValue.serverTimestamp() });
      res.json(docToJson(await ref.get()));
    })
  );

  // Búsqueda de miembros por habilidad ofrecida (offers) y/o deseada (wants).
  router.get(
    '/',
    ...auth.member,
    validate(userSearchSchema, 'query'),
    asyncHandler(async (req, res) => {
      const { offers, wants } = req.query;
      let query = db.collection('users');
      // Firestore permite un solo array-contains por consulta: el segundo filtro se aplica en memoria.
      if (offers) query = query.where('offeredSkillIds', 'array-contains', offers);
      else if (wants) query = query.where('wantedSkills', 'array-contains', wants);
      const snap = await query.limit(100).get();
      const users = snap.docs
        .map((d) => ({ id: d.id, ...serialize(d.data()) }))
        .filter((u) => u.id !== req.user.id && !u.disabled)
        .filter((u) => (offers && wants ? u.wantedSkills.includes(wants) : true))
        .map(toPublicProfile);
      res.json(users);
    })
  );

  return router;
};