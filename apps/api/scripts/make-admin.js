// Uso: npm run make-admin -w apps/api -- correo@ejemplo.com
// Convierte a un usuario existente (que ya creó su perfil) en administrador.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { initFirebase } = require('../src/config/firebase');

(async () => {
  const email = process.argv[2];
  if (!email) throw new Error('Indica el correo: npm run make-admin -w apps/api -- correo@ejemplo.com');
  const { db } = initFirebase();
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) throw new Error(`No hay perfil para ${email}. Primero inicia sesión y crea tu perfil.`);
  await snap.docs[0].ref.update({ role: 'admin' });
  console.log(`✔ ${email} ahora es administrador`);
})().catch((e) => { console.error(e.message); process.exit(1); });