const { db, api, as, clearFirestore, seedSkills, registerUser } = require('./helpers');

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
  await registerUser('ana', { displayName: 'Ana' });
});

describe('Solicitudes de aprendizaje', () => {
  test('crea una solicitud persistente con estado open', async () => {
    const res = await api()
      .post('/api/requests')
      .set(as('ana'))
      .send({ skillId: 'python', description: 'Quiero aprender lo básico de Python', durationMinutes: 60 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
    expect(res.body.skillName).toBe('Python');

    const stored = await db.collection('learningRequests').doc(res.body.id).get();
    expect(stored.exists).toBe(true);
    expect(stored.data().requesterId).toBe('ana');
  });

  test('lista solicitudes y filtra por habilidad y por "mías"', async () => {
    await registerUser('beto', { displayName: 'Beto' });
    const base = { description: 'Descripción suficientemente larga', durationMinutes: 60 };
    await api().post('/api/requests').set(as('ana')).send({ ...base, skillId: 'python' });
    await api().post('/api/requests').set(as('beto')).send({ ...base, skillId: 'guitarra' });

    const all = await api().get('/api/requests?status=open').set(as('ana'));
    expect(all.body).toHaveLength(2);
    const bySkill = await api().get('/api/requests?skillId=guitarra').set(as('ana'));
    expect(bySkill.body.map((r) => r.requesterName)).toEqual(['Beto']);
    const mine = await api().get('/api/requests?mine=true').set(as('ana'));
    expect(mine.body.map((r) => r.requesterName)).toEqual(['Ana']);
  });

  test('valida descripción corta y duración no permitida', async () => {
    const res = await api()
      .post('/api/requests')
      .set(as('ana'))
      .send({ skillId: 'python', description: 'corta', durationMinutes: 45 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('exige perfil: un usuario autenticado sin perfil recibe 403', async () => {
    const res = await api()
      .post('/api/requests')
      .set(as('fantasma'))
      .send({ skillId: 'python', description: 'Descripción suficientemente larga', durationMinutes: 60 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PROFILE_REQUIRED');
  });
});

describe('Parámetros de ruta', () => {
  test('rechaza identificadores con caracteres peligrosos (400, no 500)', async () => {
    const res = await api().get('/api/requests/a%2Fb').set(as('ana'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('devuelve 404 para una solicitud que no existe', async () => {
    const res = await api().get('/api/requests/noexiste123').set(as('ana'));
    expect(res.status).toBe(404);
  });
});
