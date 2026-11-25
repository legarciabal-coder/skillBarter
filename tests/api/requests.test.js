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

describe('CRUD de solicitudes: editar y eliminar', () => {
  const create = async (uid = 'ana') =>
    (await api().post('/api/requests').set(as(uid)).send({
      skillId: 'python', description: 'Quiero aprender lo básico de Python', durationMinutes: 60,
    })).body;

  test('el autor edita su solicitud abierta', async () => {
    const r = await create();
    const res = await api().patch(`/api/requests/${r.id}`).set(as('ana')).send({ durationMinutes: 90 });
    expect(res.status).toBe(200);
    expect(res.body.durationMinutes).toBe(90);
  });

  test('otro miembro no puede editar ni eliminar (403)', async () => {
    await registerUser('beto', { displayName: 'Beto' });
    const r = await create();
    expect((await api().patch(`/api/requests/${r.id}`).set(as('beto')).send({ durationMinutes: 30 })).status).toBe(403);
    expect((await api().delete(`/api/requests/${r.id}`).set(as('beto'))).status).toBe(403);
  });

  test('el autor elimina su solicitud y desaparece de Firestore', async () => {
    const r = await create();
    expect((await api().delete(`/api/requests/${r.id}`).set(as('ana'))).status).toBe(204);
    expect((await db.collection('learningRequests').doc(r.id).get()).exists).toBe(false);
  });

  test('no se edita una solicitud que ya no está abierta (409)', async () => {
    const r = await create();
    await db.collection('learningRequests').doc(r.id).update({ status: 'matched' });
    const res = await api().patch(`/api/requests/${r.id}`).set(as('ana')).send({ durationMinutes: 30 });
    expect(res.status).toBe(409);
  });

  test('PATCH vacío se rechaza con 400', async () => {
    const r = await create();
    const res = await api().patch(`/api/requests/${r.id}`).set(as('ana')).send({});
    expect(res.status).toBe(400);
  });
});