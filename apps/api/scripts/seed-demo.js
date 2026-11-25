// Datos de DEMOSTRACIÓN 100 % ficticios (dominio .test, contraseña pública de prueba).
// Uso: npm run seed:demo        (con emuladores corriendo, o contra tu proyecto Firebase)
// Es idempotente: puede ejecutarse varias veces sin duplicar nada.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { initFirebase } = require('../src/config/firebase');
const { ensureWallet } = require('../src/services/walletService');
const { FieldValue } = require('firebase-admin/firestore');
const skills = require('../data/skills.json');

const PASSWORD = 'Demo1234!';
const slot = (day, start, end) => ({ day, start, end });

const USERS = [
  { uid: 'demo-admin', email: 'admin@skillbarter.test', name: 'Admin Demo', role: 'admin', offers: [], wants: [], availability: [] },
  { uid: 'demo-ana', email: 'ana@skillbarter.test', name: 'Ana Pérez', role: 'member',
    bio: 'Música y manos a la masa. Enseño guitarra desde hace 8 años.',
    offers: [['guitarra', 'advanced'], ['ingles-conversacional', 'intermediate']], wants: ['python'],
    availability: [slot(1, '18:00', '20:00'), slot(3, '18:00', '21:00')] },
  { uid: 'demo-beto', email: 'beto@skillbarter.test', name: 'Beto Ramírez', role: 'member',
    bio: 'Desarrollador backend. Quiero volver a tocar la guitarra.',
    offers: [['python', 'advanced'], ['sql', 'intermediate']], wants: ['guitarra'],
    availability: [slot(1, '19:00', '21:00'), slot(3, '17:00', '19:00'), slot(6, '10:00', '13:00')] },
  { uid: 'demo-carla', email: 'carla@skillbarter.test', name: 'Carla Gómez', role: 'member',
    bio: 'Diseñadora gráfica y fotógrafa aficionada.',
    offers: [['diseno-grafico', 'advanced'], ['fotografia', 'intermediate']], wants: ['ingles-conversacional', 'python'],
    availability: [slot(2, '16:00', '19:00'), slot(6, '09:00', '12:00')] },
  { uid: 'demo-diego', email: 'diego@skillbarter.test', name: 'Diego Torres', role: 'member',
    bio: 'Cocinero de fin de semana y fan de las hojas de cálculo.',
    offers: [['cocina-mexicana', 'advanced'], ['excel', 'intermediate']], wants: ['guitarra', 'fotografia'],
    availability: [slot(1, '18:30', '20:30'), slot(6, '10:00', '14:00')] },
];

const REQUESTS = [
  { by: 'demo-beto', skillId: 'guitarra', description: 'Quiero aprender acordes básicos y canciones sencillas', durationMinutes: 60 },
  { by: 'demo-carla', skillId: 'ingles-conversacional', description: 'Busco practicar conversación para entrevistas de trabajo', durationMinutes: 60 },
  { by: 'demo-diego', skillId: 'fotografia', description: 'Necesito mejorar la composición y la luz en mis fotos', durationMinutes: 90 },
];

(async () => {
  const { db } = initFirebase();
  const { getAuth } = require('firebase-admin/auth');
  const auth = getAuth();

  // 1) Catálogo
  const batch = db.batch();
  for (const { id, ...data } of skills) batch.set(db.collection('skills').doc(id), { ...data, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();

  // 2) Cuentas de Auth + perfiles + billeteras
  for (const u of USERS) {
    try {
      await auth.createUser({ uid: u.uid, email: u.email, password: PASSWORD, displayName: u.name });
    } catch (e) {
      if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') throw e;
    }
    const ref = db.collection('users').doc(u.uid);
    const isNew = !(await ref.get()).exists;
    await ref.set({
      displayName: u.name,
      email: u.email,
      role: u.role,
      bio: u.bio || '',
      offeredSkills: u.offers.map(([skillId, level]) => ({ skillId, level })),
      offeredSkillIds: u.offers.map(([skillId]) => skillId),
      wantedSkills: u.wants,
      availability: u.availability,
      disabled: false,
      updatedAt: FieldValue.serverTimestamp(),
      // Los contadores de reputación solo se inicializan la primera vez (no se pisan al re-ejecutar).
      ...(isNew && { ratingSum: 0, ratingCount: 0, ratingAvg: null, createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    await ensureWallet(db, u.uid);
  }

  // 3) Solicitudes abiertas (id determinista => idempotente)
  for (const [i, r] of REQUESTS.entries()) {
    const owner = USERS.find((u) => u.uid === r.by);
    try {
      // create(): si la solicitud ya existe (quizá ya asignada) no se toca.
      await db.collection('learningRequests').doc(`demo-request-${i + 1}`).create({
        requesterId: r.by,
        requesterName: owner.name,
        skillId: r.skillId,
        skillName: skills.find((s) => s.id === r.skillId).name,
        description: r.description,
        durationMinutes: r.durationMinutes,
        status: 'open',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (e.code !== 6) throw e;
    }
  }

  console.log(`✔ Demo lista: ${USERS.length} usuarios, ${REQUESTS.length} solicitudes, ${skills.length} habilidades`);
  console.log(`  Contraseña de todas las cuentas: ${PASSWORD}`);
  USERS.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
})().catch((e) => { console.error(e); process.exit(1); });