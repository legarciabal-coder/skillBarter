const express = require('express');
const { asyncHandler } = require('../utils/errors');
const { docToJson } = require('../utils/serialize');

module.exports = function skillsRouter({ db, auth }) {
  const router = express.Router();

  router.get(
    '/',
    auth.authenticate,
    asyncHandler(async (_req, res) => {
      const snap = await db.collection('skills').orderBy('name').get();
      res.json(snap.docs.map(docToJson));
    })
  );

  return router;
};