const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { serialize } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { matchesQuerySchema } = require('../services/schemas');
const { assertSkillsExist } = require('../services/skillsService');
const { rankCandidates } = require('../services/matching');
const { toPublicProfile } = require('../services/publicProfile');

module.exports = function matchesRouter({ db, auth }) {
  const router = express.Router();

  // Docentes recomendados para una habilidad, con puntaje y explicación.
  router.get(
    '/',
    ...auth.member,
    validate(matchesQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const { skillId } = req.query;
      const skills = await assertSkillsExist(db, [skillId]);
      const snap = await db.collection('users').where('offeredSkillIds', 'array-contains', skillId).limit(100).get();
      const candidates = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })).filter((u) => !u.disabled);
      const ranked = rankCandidates(req.user, candidates, skillId, { skillName: skills.get(skillId).name });
      res.json(
        ranked.map((r) => ({
          user: toPublicProfile(r.candidate),
          score: r.score,
          breakdown: r.breakdown,
          overlapMinutes: r.overlapMinutes,
          reasons: r.reasons,
        }))
      );
    })
  );

  return router;
};