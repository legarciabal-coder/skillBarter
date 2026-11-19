// Obtiene un ID token de Firebase Auth para probar la API con curl/Postman.
// Uso: npm run -s token -w apps/api -- correo@ejemplo.com Contraseña123
// - Si la cuenta no existe, la crea (solo con emuladores).
// - Con emuladores usa el emulador de Auth; sin ellos usa Firebase real (VITE_FIREBASE_API_KEY).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: npm run -s token -w apps/api -- correo contraseña');
  process.exit(1);
}

const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const base = emulator ? `http://${emulator}/identitytoolkit.googleapis.com` : 'https://identitytoolkit.googleapis.com';
const key = process.env.VITE_FIREBASE_API_KEY || 'demo-api-key';

const call = async (endpoint) => {
  const res = await fetch(`${base}/v1/accounts:${endpoint}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return res.json();
};

(async () => {
  let data = await call('signInWithPassword');
  if (data.error && emulator) data = await call('signUp'); // solo crea cuentas en el emulador
  if (data.error) throw new Error(data.error.message);
  process.stdout.write(data.idToken + '\n');
})().catch((e) => { console.error(e.message); process.exit(1); });