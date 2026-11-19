const { HttpError } = require('../utils/errors');

async function assertSkillsExist(db, ids) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const snaps = await db.getAll(...unique.map((id) => db.collection('skills').doc(id)));
  const missing = unique.filter((_, i) => !snaps[i].exists);
  if (missing.length) {
    throw new HttpError(400, 'UNKNOWN_SKILL', `Habilidades inexistentes: ${missing.join(', ')}`);
  }
  return new Map(snaps.map((s) => [s.id, s.data()]));
}

module.exports = { assertSkillsExist };