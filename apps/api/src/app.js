const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { makeAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Fábrica de la aplicación: recibe sus dependencias (db y verifyToken) para poder probarla.
function createApp({ db, verifyToken }) {
  const app = express();
  const auth = makeAuth({ db, verifyToken });

  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',') }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'skillbarter-api' }));
  app.use('/api/skills', require('./routes/skills')({ db, auth }));
  app.use('/api/users', require('./routes/users')({ db, auth }));
  app.use('/api/requests', require('./routes/requests')({ db, auth }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };