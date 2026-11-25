const { api, as, clearFirestore, seedSkills, registerUser } = require('./helpers');

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
});

test('GET /api/matches devuelve docentes ordenados con puntaje y razones', async () => {
  const evening = [{ day: 1, start: '18:00', end: '20:00' }];
  await registerUser('yo', { displayName: 'Yo', availability: evening });
  await registerUser('ana', { displayName: 'Ana', offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }], availability: evening });
  await registerUser('beto', { displayName: 'Beto', offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }], availability: [{ day: 5, start: '08:00', end: '09:00' }] });
  await registerUser('carla', { displayName: 'Carla', offeredSkills: [{ skillId: 'python', level: 'advanced' }] });

  const res = await api().get('/api/matches?skillId=guitarra').set(as('yo'));
  expect(res.status).toBe(200);
  expect(res.body.map((m) => m.user.displayName)).toEqual(['Ana', 'Beto']); // Carla no ofrece guitarra
  expect(res.body[0].score).toBeGreaterThan(res.body[1].score);
  expect(res.body[0].reasons.length).toBe(2);
  expect(res.body[0].user.email).toBeUndefined();
});

test('exige el parámetro skillId', async () => {
  await registerUser('yo', { displayName: 'Yo' });
  const res = await api().get('/api/matches').set(as('yo'));
  expect(res.status).toBe(400);
});