const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { initFirebase } = require('../src/config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const skills = require('../data/skills.json');

(async () => {
  const { db } = initFirebase();
  const batch = db.batch();
  for (const { id, ...data } of skills) {
    batch.set(db.collection('skills').doc(id), { ...data, createdAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await batch.commit();
  console.log(`Catálogo sembrado: ${skills.length} habilidades`);
})().catch((e) => { console.error(e); process.exit(1); });