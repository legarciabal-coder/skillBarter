process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'demo-skillbarter';

const request = require('supertest');
const { initFirebase } = require('../../apps/api/src/config/firebase');
const { createApp } = require('../../apps/api/src/app');

const { db } = initFirebase();

// Doble de verifyIdToken: el token de prueba tiene la forma "test:<uid>".
// Así probamos la lógica de la API sin depender del emulador de Auth.
const verifyToken = async (token) => {
  const [prefix, uid] = token.split(':');
  if (prefix !== 'test' || !uid) throw new Error('invalid token');
  return { uid, email: `${uid}@demo.test` };
};

const app = createApp({ db, verifyToken });
const api = () => request(app);
const as = (uid) => ({ Authorization: `Bearer test:${uid}` });

// Borra TODO el contenido del emulador entre pruebas (endpoint oficial del emulador).
async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const res = await fetch(`http://${host}/emulator/v1/projects/demo-skillbarter/databases/(default)/documents`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo limpiar el emulador de Firestore');
}

async function seedSkills() {
  const skills = [
    ['guitarra', 'Guitarra', 'Música'],
    ['python', 'Python', 'Programación'],
    ['ingles-conversacional', 'Inglés conversacional', 'Idiomas'],
  ];
  const batch = db.batch();
  for (const [id, name, category] of skills) batch.set(db.collection('skills').doc(id), { name, category });
  await batch.commit();
}

const baseProfile = (overrides = {}) => ({
  displayName: 'Usuario Demo',
  bio: 'Perfil de prueba',
  offeredSkills: [],
  wantedSkills: [],
  availability: [],
  ...overrides,
});

// Crea un perfil vía API y devuelve el cuerpo de la respuesta.
async function registerUser(uid, overrides = {}) {
  const res = await api().post('/api/users/me').set(as(uid)).send(baseProfile(overrides));
  if (res.status !== 201) throw new Error(`registerUser(${uid}) falló: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

// Promueve a un usuario ya registrado a administrador (directo en Firestore).
const makeAdmin = (uid) => db.collection('users').doc(uid).update({ role: 'admin' });

// Fecha ISO a futuro (por defecto, dentro de 24 h) para programar sesiones.
const futureIso = (hours = 24) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

module.exports = { db, api, as, clearFirestore, seedSkills, baseProfile, registerUser, makeAdmin, futureIso };