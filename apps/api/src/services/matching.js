// Motor de compatibilidad (v1). Funciones PURAS: sin Firestore, deterministas y explicables.
// Puntuación máxima = 100:  habilidad (50) + nivel (hasta 10) + disponibilidad en común (hasta 40).

const WEIGHTS = { skill: 50, levelMax: 10, availabilityMax: 40, pointsPerHour: 5 };
const LEVEL_POINTS = { beginner: 0, intermediate: 5, advanced: 10 };
const LEVEL_LABEL = { beginner: 'básico', intermediate: 'intermedio', advanced: 'avanzado' };

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Une franjas que se traslapan dentro del mismo día para no contar dos veces el mismo tiempo.
function normalize(slots = []) {
  const byDay = new Map();
  for (const s of slots) {
    const list = byDay.get(s.day) || [];
    list.push([toMinutes(s.start), toMinutes(s.end)]);
    byDay.set(s.day, list);
  }
  const merged = [];
  for (const [day, list] of byDay) {
    list.sort((a, b) => a[0] - b[0]);
    let [cs, ce] = list[0];
    for (const [s, e] of list.slice(1)) {
      if (s <= ce) ce = Math.max(ce, e);
      else { merged.push({ day, start: cs, end: ce }); [cs, ce] = [s, e]; }
    }
    merged.push({ day, start: cs, end: ce });
  }
  return merged;
}

// Minutos por semana en los que ambas personas están disponibles.
function overlapMinutes(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  let total = 0;
  for (const x of A) {
    for (const y of B) {
      if (x.day !== y.day) continue;
      const overlap = Math.min(x.end, y.end) - Math.max(x.start, y.start);
      if (overlap > 0) total += overlap;
    }
  }
  return total;
}

// Devuelve null si la persona no ofrece la habilidad (no es candidata).
function scoreCandidate(requester, candidate, skillId, skillName = skillId) {
  const offer = (candidate.offeredSkills || []).find((o) => o.skillId === skillId);
  if (!offer) return null;

  const overlap = overlapMinutes(requester.availability, candidate.availability);
  const breakdown = {
    skill: WEIGHTS.skill,
    level: Math.min(WEIGHTS.levelMax, LEVEL_POINTS[offer.level] ?? 0),
    availability: Math.min(WEIGHTS.availabilityMax, Math.round((overlap / 60) * WEIGHTS.pointsPerHour)),
  };
  const score = breakdown.skill + breakdown.level + breakdown.availability;
  const reasons = [
    `Ofrece ${skillName} (nivel ${LEVEL_LABEL[offer.level]}): +${breakdown.skill + breakdown.level} pts`,
    overlap > 0
      ? `Comparten ${(overlap / 60).toFixed(1)} h/semana de disponibilidad: +${breakdown.availability} pts`
      : 'Sin horarios en común registrados: +0 pts',
  ];
  return { score, breakdown, overlapMinutes: overlap, reasons };
}

// Ordena de mayor a menor puntaje; los empates se resuelven por nombre e id (resultado reproducible).
function rankCandidates(requester, candidates, skillId, { skillName, limit = 10 } = {}) {
  return candidates
    .filter((c) => c.id !== requester.id)
    .map((candidate) => ({ candidate, result: scoreCandidate(requester, candidate, skillId, skillName) }))
    .filter((x) => x.result)
    .sort(
      (a, b) =>
        b.result.score - a.result.score ||
        a.candidate.displayName.localeCompare(b.candidate.displayName) ||
        a.candidate.id.localeCompare(b.candidate.id)
    )
    .slice(0, limit)
    .map(({ candidate, result }) => ({ candidate, ...result }));
}

module.exports = { WEIGHTS, normalize, overlapMinutes, scoreCandidate, rankCandidates };