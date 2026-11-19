const { db, api, as, clearFirestore, seedSkills, registerUser } = require('./helpers');

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
});

describe('Autenticación', () => {
  test('GET /api/health responde sin token', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('rechaza peticiones sin token con 401', async () => {
    const res = await api().get('/api/skills');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('rechaza un token inválido con 401', async () => {
    const res = await api().get('/api/skills').set({ Authorization: 'Bearer basura' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('Perfiles', () => {
  test('crea el perfil y persiste en Firestore; el rol siempre es member', async () => {
    const res = await api()
      .post('/api/users/me')
      .set(as('ana'))
      .send({
        displayName: 'Ana Pérez',
        role: 'admin', // intento de escalar privilegios: debe ignorarse
        offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }],
        wantedSkills: ['python'],
        availability: [{ day: 1, start: '18:00', end: '20:00' }],
      });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('member');

    const stored = (await db.collection('users').doc('ana').get()).data();
    expect(stored.role).toBe('member');
    expect(stored.offeredSkillIds).toEqual(['guitarra']);
  });

  test('valida entradas en el servidor: nombre corto y horario invertido', async () => {
    const res = await api()
      .post('/api/users/me')
      .set(as('ana'))
      .send({ displayName: 'A', availability: [{ day: 1, start: '20:00', end: '18:00' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  test('rechaza habilidades que no existen en el catálogo', async () => {
    const res = await api()
      .post('/api/users/me')
      .set(as('ana'))
      .send({ displayName: 'Ana Pérez', wantedSkills: ['no-existe'] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_SKILL');
  });

  test('no permite crear dos veces el mismo perfil (409)', async () => {
    await registerUser('ana', { displayName: 'Ana Pérez' });
    const res = await api().post('/api/users/me').set(as('ana')).send({ displayName: 'Otra Vez' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFILE_EXISTS');
  });

  test('GET /api/users/me devuelve 404 si aún no hay perfil', async () => {
    const res = await api().get('/api/users/me').set(as('nuevo'));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });
});

describe('Búsqueda de miembros', () => {
  test('encuentra a quien ofrece la habilidad, excluye al solicitante y no expone datos privados', async () => {
    await registerUser('ana', { displayName: 'Ana', offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }] });
    await registerUser('beto', { displayName: 'Beto', offeredSkills: [{ skillId: 'python', level: 'beginner' }] });
    await registerUser('carla', { displayName: 'Carla', offeredSkills: [{ skillId: 'guitarra', level: 'beginner' }] });

    const res = await api().get('/api/users?offers=guitarra').set(as('carla'));
    expect(res.status).toBe(200);
    expect(res.body.map((u) => u.displayName)).toEqual(['Ana']);
    expect(res.body[0].email).toBeUndefined();
    expect(res.body[0].role).toBeUndefined();
  });
});
