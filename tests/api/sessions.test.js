const { db, api, as, clearFirestore, seedSkills, registerUser, futureIso } = require('./helpers');

const guitarOffer = [{ skillId: 'guitarra', level: 'advanced' }];

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
  await registerUser('ana', { displayName: 'Ana', offeredSkills: guitarOffer }); // docente
  await registerUser('beto', { displayName: 'Beto' }); // alumno
});

const propose = (body = {}, uid = 'beto') =>
  api().post('/api/sessions').set(as(uid)).send({
    teacherId: 'ana', skillId: 'guitarra', startAt: futureIso(24), durationMinutes: 60, ...body,
  });

describe('Creación de sesiones', () => {
  test('el alumno propone una sesión y queda pending', async () => {
    const res = await propose();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'pending', teacherName: 'Ana', learnerName: 'Beto', skillName: 'Guitarra' });
    expect(res.body.history).toHaveLength(1);
  });

  test.each([
    ['proponerse a sí mismo', { teacherId: 'beto' }, 400, 'SELF_SESSION'],
    ['fecha en el pasado', { startAt: new Date(Date.now() - 3600000).toISOString() }, 400, 'START_IN_PAST'],
    ['docente que no existe', { teacherId: 'fantasma' }, 404, 'TEACHER_NOT_FOUND'],
    ['habilidad que el docente no ofrece', { skillId: 'python' }, 400, 'TEACHER_DOES_NOT_OFFER_SKILL'],
    ['duración no permitida', { durationMinutes: 45 }, 400, 'VALIDATION_ERROR'],
  ])('rechaza %s', async (_name, body, status, code) => {
    const res = await propose(body);
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
  });
});

describe('Transiciones y permisos', () => {
  test('solo el docente acepta; el alumno recibe 403', async () => {
    const { body: s } = await propose();
    const byLearner = await api().post(`/api/sessions/${s.id}/accept`).set(as('beto'));
    expect(byLearner.status).toBe(403);
    const byTeacher = await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    expect(byTeacher.status).toBe(200);
    expect(byTeacher.body.status).toBe('accepted');
    expect(byTeacher.body.history.map((h) => h.status)).toEqual(['pending', 'accepted']);
  });

  test('una persona ajena a la sesión no puede verla ni modificarla', async () => {
    await registerUser('zoe', { displayName: 'Zoe' });
    const { body: s } = await propose();
    expect((await api().get(`/api/sessions/${s.id}`).set(as('zoe'))).status).toBe(403);
    expect((await api().post(`/api/sessions/${s.id}/cancel`).set(as('zoe'))).status).toBe(403);
    expect((await api().get(`/api/sessions/${s.id}`).set(as('beto'))).status).toBe(200);
  });

  test('transiciones inválidas devuelven 409 INVALID_TRANSITION', async () => {
    const { body: s } = await propose();
    const early = await api().post(`/api/sessions/${s.id}/confirm`).set(as('beto')); // aún pending
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('INVALID_TRANSITION');

    await api().post(`/api/sessions/${s.id}/reject`).set(as('ana'));
    const again = await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    expect(again.status).toBe(409);
  });

  test('cualquiera de los dos participantes puede cancelar', async () => {
    const { body: s } = await propose();
    await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    const res = await api().post(`/api/sessions/${s.id}/cancel`).set(as('beto'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  test('el docente no puede aceptar dos sesiones que se traslapan', async () => {
    await registerUser('carla', { displayName: 'Carla' });
    const start = futureIso(48);
    const a = (await propose({ startAt: start })).body;
    const b = (await propose({ startAt: start }, 'carla')).body;
    expect((await api().post(`/api/sessions/${a.id}/accept`).set(as('ana'))).status).toBe(200);
    const clash = await api().post(`/api/sessions/${b.id}/accept`).set(as('ana'));
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('SCHEDULE_CONFLICT');
  });

  test('lista mis sesiones como docente y como alumno', async () => {
    await propose();
    const asTeacher = await api().get('/api/sessions?as=teacher').set(as('ana'));
    const asLearner = await api().get('/api/sessions?as=learner').set(as('ana'));
    expect(asTeacher.body).toHaveLength(1);
    expect(asLearner.body).toHaveLength(0);
  });
});

describe('Vínculo con solicitudes de aprendizaje', () => {
  const makeRequest = async () =>
    (await api().post('/api/requests').set(as('beto')).send({
      skillId: 'guitarra', description: 'Quiero aprender acordes básicos', durationMinutes: 60,
    })).body;

  test('open → matched (acepta) → fulfilled (confirma)', async () => {
    const r = await makeRequest();
    const s = (await propose({ requestId: r.id })).body;
    await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    expect((await db.collection('learningRequests').doc(r.id).get()).data().status).toBe('matched');
    await api().post(`/api/sessions/${s.id}/confirm`).set(as('beto'));
    expect((await db.collection('learningRequests').doc(r.id).get()).data().status).toBe('fulfilled');
  });

  test('cancelar una sesión aceptada reabre la solicitud', async () => {
    const r = await makeRequest();
    const s = (await propose({ requestId: r.id })).body;
    await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    await api().post(`/api/sessions/${s.id}/cancel`).set(as('ana'));
    expect((await db.collection('learningRequests').doc(r.id).get()).data().status).toBe('open');
  });

  test('no se puede ligar una solicitud ajena', async () => {
    const r = await makeRequest();
    await registerUser('carla', { displayName: 'Carla' });
    const res = await propose({ requestId: r.id }, 'carla');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });
});