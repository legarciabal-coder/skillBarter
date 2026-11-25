// Pruebas unitarias del motor de compatibilidad: no necesitan Firestore.
const { overlapMinutes, normalize, scoreCandidate, rankCandidates } = require('../../apps/api/src/services/matching');

const slot = (day, start, end) => ({ day, start, end });
const requester = { id: 'r', availability: [slot(1, '18:00', '20:00'), slot(3, '10:00', '12:00')] };

describe('overlapMinutes', () => {
  test('suma solo los traslapes del mismo día', () => {
    const other = [slot(1, '19:00', '21:00'), slot(2, '18:00', '20:00')];
    expect(overlapMinutes(requester.availability, other)).toBe(60);
  });

  test('no cuenta dos veces franjas propias que se traslapan', () => {
    const doubled = [slot(1, '18:00', '19:30'), slot(1, '19:00', '20:00')];
    expect(normalize(doubled)).toEqual([{ day: 1, start: 1080, end: 1200 }]);
    expect(overlapMinutes(doubled, [slot(1, '18:00', '20:00')])).toBe(120);
  });

  test('sin disponibilidad devuelve 0', () => {
    expect(overlapMinutes([], requester.availability)).toBe(0);
  });
});

describe('scoreCandidate', () => {
  test('quien no ofrece la habilidad no es candidato', () => {
    expect(scoreCandidate(requester, { offeredSkills: [] }, 'guitarra')).toBeNull();
  });

  test('puntaje = habilidad + nivel + disponibilidad, con explicación', () => {
    const c = { offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }], availability: [slot(1, '18:00', '20:00')] };
    const r = scoreCandidate(requester, c, 'guitarra', 'Guitarra');
    expect(r.breakdown).toEqual({ skill: 50, level: 10, availability: 10 }); // 2 h × 5 pts
    expect(r.score).toBe(70);
    expect(r.reasons[0]).toContain('Guitarra');
    expect(r.reasons[1]).toContain('2.0 h/semana');
  });

  test('la disponibilidad tiene tope (40 pts)', () => {
    const wide = Array.from({ length: 7 }, (_, d) => slot(d, '08:00', '20:00'));
    const c = { offeredSkills: [{ skillId: 'guitarra', level: 'beginner' }], availability: wide };
    const r = scoreCandidate({ availability: wide }, c, 'guitarra');
    expect(r.breakdown.availability).toBe(40);
  });
});

describe('rankCandidates', () => {
  const mk = (id, name, level, availability = []) => ({ id, displayName: name, offeredSkills: [{ skillId: 'guitarra', level }], availability });

  test('ordena por puntaje y es reproducible (mismos datos → mismo orden)', () => {
    const pool = [
      mk('c', 'Carla', 'beginner'),
      mk('a', 'Ana', 'advanced', [slot(1, '18:00', '20:00')]),
      mk('b', 'Beto', 'beginner'),
    ];
    const first = rankCandidates(requester, pool, 'guitarra').map((x) => x.candidate.id);
    const second = rankCandidates(requester, [...pool].reverse(), 'guitarra').map((x) => x.candidate.id);
    expect(first).toEqual(['a', 'b', 'c']); // empate b/c resuelto por nombre
    expect(second).toEqual(first);
  });

  test('excluye al propio solicitante', () => {
    const pool = [mk('r', 'Yo', 'advanced'), mk('a', 'Ana', 'beginner')];
    expect(rankCandidates(requester, pool, 'guitarra').map((x) => x.candidate.id)).toEqual(['a']);
  });
});