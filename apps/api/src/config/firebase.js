const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializa Firebase Admin una sola vez.
// - Con emuladores (FIRESTORE_EMULATOR_HOST definido) no necesita credenciales.
// - En producción lee la cuenta de servicio desde FIREBASE_SERVICE_ACCOUNT_BASE64.
function initFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-skillbarter';
  if (!getApps().length) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
      const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      initializeApp({ credential: cert(serviceAccount), projectId });
    } else {
      initializeApp({ projectId });
    }
    getFirestore().settings({ ignoreUndefinedProperties: true });
  }
  return { db: getFirestore() };
}

// Verificador real de ID tokens. Se carga de forma perezosa a propósito:
// "firebase-admin/auth" depende de "jose" (solo ESM) y Jest 29 no sabe importarlo.
// Las pruebas inyectan su propio verifyToken y nunca llegan a cargar este módulo.
function realVerifyToken(token) {
  const { getAuth } = require('firebase-admin/auth');
  return getAuth().verifyIdToken(token);
}

module.exports = { initFirebase, realVerifyToken };