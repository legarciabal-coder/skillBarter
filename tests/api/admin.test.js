const { db, api, as, clearFirestore, seedSkills, registerUser, makeAdmin } = require('./helpers');

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
  await registerUser('root', { displayName: 'Admin' });
  await makeAdmin('root');
  await registerUser('ana', { displayName: 'Ana', offeredSkills: [{ skillId: 'guitarra', level: 'beginner' }] });
});

describe('Permisos por rol', () => {
  test('un miembro recibe 403 en endpoints de administración', async () => {
    expect((await api().get('/api/admin/stats').set(as('ana'))).status).toBe(403);
    expect((await api().get('/api/admin/users').set(as('ana'))).status).toBe(403);
    const create = await api().post('/api/skills').set(as('ana')).send({ id: 'ajedrez', name: 'Ajedrez', category: 'Juegos' });
    expect(create.status).toBe(403);
  });

  test('el administrador gestiona el catálogo (crear, editar, eliminar)', async () => {
    const created = await api().post('/api/skills').set(as('root')).send({ id: 'ajedrez', name: 'Ajedrez', category: 'Juegos' });
    expect(created.status).toBe(201);
    const dup = await api().post('/api/skills').set(as('root')).send({ id: 'ajedrez', name: 'Ajedrez', category: 'Juegos' });
    expect(dup.status).toBe(409);
    const upd = await api().put('/api/skills/ajedrez').set(as('root')).send({ name: 'Ajedrez táctico', category: 'Juegos' });
    expect(upd.body.name).toBe('Ajedrez táctico');
    expect((await api().delete('/api/skills/ajedrez').set(as('root'))).status).toBe(204);
  });

  test('no se puede eliminar una habilidad que alguien ofrece', async () => {
    const res = await api().delete('/api/skills/guitarra').set(as('root'));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SKILL_IN_USE');
  });

  test('el administrador deshabilita a un usuario y este pierde el acceso', async () => {
    const res = await api().patch('/api/admin/users/ana').set(as('root')).send({ disabled: true });
    expect(res.status).toBe(200);
    const blocked = await api().get('/api/requests').set(as('ana'));
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('USER_DISABLED');
  });

  test('un administrador no puede degradarse a sí mismo', async () => {
    const res = await api().patch('/api/admin/users/root').set(as('root')).send({ role: 'member' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  test('stats devuelve los indicadores de la comunidad', async () => {
    const res = await api().get('/api/admin/stats').set(as('root'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ users: 2, skills: 3, openRequests: 0, minutesExchanged: 0 });
    expect(res.body.sessions.completed).toBe(0);
  });
});