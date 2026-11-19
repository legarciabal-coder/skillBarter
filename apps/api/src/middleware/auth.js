const { HttpError, asyncHandler } = require('../utils/errors');

// verifyToken se inyecta: en producción es admin.auth().verifyIdToken y en pruebas un doble.
function makeAuth({ db, verifyToken }) {
  // 1) Comprueba el ID token de Firebase Auth.
  const authenticate = asyncHandler(async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(401, 'UNAUTHENTICATED', 'Falta el token de autenticación');
    }
    try {
      const decoded = await verifyToken(token);
      req.auth = { uid: decoded.uid, email: decoded.email || null };
    } catch {
      throw new HttpError(401, 'INVALID_TOKEN', 'Token inválido o expirado');
    }
    next();
  });

  // 2) Carga el perfil (y con él el rol) desde Firestore. El rol NUNCA viene del cliente.
  const loadUser = asyncHandler(async (req, _res, next) => {
    const snap = await db.collection('users').doc(req.auth.uid).get();
    if (!snap.exists) {
      throw new HttpError(403, 'PROFILE_REQUIRED', 'Completa tu perfil antes de continuar');
    }
    const user = { id: snap.id, ...snap.data() };
    if (user.disabled) throw new HttpError(403, 'USER_DISABLED', 'Tu cuenta está deshabilitada');
    req.user = user;
    next();
  });

  const requireRole = (...roles) => (req, _res, next) =>
    roles.includes(req.user?.role)
      ? next()
      : next(new HttpError(403, 'FORBIDDEN', 'No tienes permiso para esta acción'));

  return { authenticate, loadUser, requireRole, member: [authenticate, loadUser] };
}

module.exports = { makeAuth };