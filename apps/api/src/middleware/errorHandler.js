const { ZodError } = require('zod');
const { HttpError } = require('../utils/errors');

function notFound(_req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada'));
}

// Formato único de error: { error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'JSON mal formado' } });
  }
  if (process.env.NODE_ENV !== 'test') console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorHandler };