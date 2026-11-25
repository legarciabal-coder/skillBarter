const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');
const { validate } = require('../middleware/validate');
const { transactionsQuerySchema } = require('../services/schemas');
const { ensureWallet } = require('../services/walletService');

module.exports = function walletRouter({ db, auth }) {
  const router = express.Router();

  router.get(
    '/',
    ...auth.member,
    asyncHandler(async (req, res) => {
      await ensureWallet(db, req.user.id);
      const snap = await db.collection('wallets').doc(req.user.id).get();
      const { balanceMinutes } = snap.data();
      res.json({ userId: req.user.id, balanceMinutes, balanceHours: balanceMinutes / 60 });
    })
  );

  // Libro de movimientos (más recientes primero).
  router.get(
    '/transactions',
    ...auth.member,
    validate(transactionsQuerySchema, 'query'),
    asyncHandler(async (req, res) => {
      const snap = await db
        .collection('creditTransactions')
        .where('userId', '==', req.user.id)
        .orderBy('createdAt', 'desc')
        .limit(req.query.limit)
        .get();
      res.json(snap.docs.map(docToJson));
    })
  );

  return router;
};