const { FieldValue } = require('firebase-admin/firestore');

const WELCOME_BONUS_MINUTES = 120; // 2 horas de bienvenida para poder empezar a aprender

// Crea la billetera con su bono de bienvenida. Es IDEMPOTENTE: si ya existe no hace nada,
// y el movimiento del bono tiene id determinista ("welcome_<uid>") para que no se duplique.
async function ensureWallet(db, uid) {
  const walletRef = db.collection('wallets').doc(uid);
  const bonusRef = db.collection('creditTransactions').doc(`welcome_${uid}`);
  await db.runTransaction(async (tx) => {
    const wallet = await tx.get(walletRef);
    if (wallet.exists) return;
    tx.create(walletRef, {
      userId: uid,
      balanceMinutes: WELCOME_BONUS_MINUTES,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(bonusRef, {
      userId: uid,
      type: 'bonus',
      amountMinutes: WELCOME_BONUS_MINUTES,
      balanceAfter: WELCOME_BONUS_MINUTES,
      sessionId: null,
      counterpartyId: null,
      description: 'Bono de bienvenida',
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

// PROTOTIPO R2: al confirmar, acredita al docente y registra el movimiento.
// (En R3 se sustituye por una transferencia completa alumno -> docente.)
// Debe llamarse DENTRO de una transacción, después de haber hecho todas las lecturas.
function creditTeacherWrites(tx, db, { session, sessionId, teacherWallet }) {
  const walletRef = db.collection('wallets').doc(session.teacherId);
  const balanceAfter = teacherWallet.balanceMinutes + session.durationMinutes;
  tx.update(walletRef, { balanceMinutes: balanceAfter, updatedAt: FieldValue.serverTimestamp() });
  tx.create(db.collection('creditTransactions').doc(`session_${sessionId}_credit`), {
    userId: session.teacherId,
    type: 'credit',
    amountMinutes: session.durationMinutes,
    balanceAfter,
    sessionId,
    counterpartyId: session.learnerId,
    description: `Enseñaste ${session.skillName} (${session.durationMinutes} min)`,
    createdAt: FieldValue.serverTimestamp(),
  });
}

module.exports = { WELCOME_BONUS_MINUTES, ensureWallet, creditTeacherWrites };