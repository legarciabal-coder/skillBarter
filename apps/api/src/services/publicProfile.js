// Solo datos públicos de un miembro: nunca email ni rol.
const toPublicProfile = (u) => ({
  id: u.id,
  displayName: u.displayName,
  bio: u.bio,
  offeredSkills: u.offeredSkills,
  wantedSkills: u.wantedSkills,
  availability: u.availability,
  ratingAvg: u.ratingAvg ?? null,
  ratingCount: u.ratingCount ?? 0,
});

module.exports = { toPublicProfile };