const { db, api, as, clearFirestore, seedSkills, registerUser, futureIso } = require('./helpers');

beforeEach(async () => {
  await clearFirestore();
  await seedSkills();
  await registerUser('ana', { displayName: 'Ana', offeredSkills: [{ skillId: 'guitarra', level: 'advanced' }] });
  await registerUser('beto', { displayName: 'Beto' });
});

describe('Billetera y libro de movimientos (prototipo R2)', () => {
  test('al registrarse recibe 120 min de bienvenida, una sola vez', async () => {
    const first = await api().get('/api/wallet').set(as('ana'));
    const again = await api().get('/api/wallet').set(as('ana'));
    expect(first.body.balanceMinutes).toBe(120);
    expect(again.body.balanceMinutes).toBe(120);
    const ledger = await api().get('/api/wallet/transactions').set(as('ana'));
    expect(ledger.body).toHaveLength(1);
    expect(ledger.body[0]).toMatchObject({ type: 'bonus', amountMinutes: 120 });
  });

  test('PRUEBA FINAL: el docente enseña 60 min y se acredita una hora y se ve en el historial', async () => {
    const s = (await api().post('/api/sessions').set(as('beto')).send({
      teacherId: 'ana', skillId: 'guitarra', startAt: futureIso(24), durationMinutes: 60,
    })).body;
    await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));

    // El docente NO puede confirmar su propia sesión (se acreditaría horas a sí mismo).
    expect((await api().post(`/api/sessions/${s.id}/confirm`).set(as('ana'))).status).toBe(403);

    const done = await api().post(`/api/sessions/${s.id}/confirm`).set(as('beto'));
    expect(done.status).toBe(200);
    expect(done.body.status).toBe('completed');

    const wallet = await api().get('/api/wallet').set(as('ana'));
    expect(wallet.body.balanceMinutes).toBe(180); // 120 de bienvenida + 60 ganados

    const ledger = await api().get('/api/wallet/transactions').set(as('ana'));
    expect(ledger.body.map((t) => t.type)).toEqual(['credit', 'bonus']); // más reciente primero
    expect(ledger.body[0]).toMatchObject({ amountMinutes: 60, balanceAfter: 180, sessionId: s.id, counterpartyId: 'beto' });
  });

  test('una confirmación repetida no vuelve a acreditar', async () => {
    const s = (await api().post('/api/sessions').set(as('beto')).send({
      teacherId: 'ana', skillId: 'guitarra', startAt: futureIso(24), durationMinutes: 60,
    })).body;
    await api().post(`/api/sessions/${s.id}/accept`).set(as('ana'));
    await api().post(`/api/sessions/${s.id}/confirm`).set(as('beto'));
    const retry = await api().post(`/api/sessions/${s.id}/confirm`).set(as('beto'));
    expect(retry.status).toBe(409);
    expect((await db.collection('wallets').doc('ana').get()).data().balanceMinutes).toBe(180);
  });
});