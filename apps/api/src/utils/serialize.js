// Convierte Timestamps de Firestore a cadenas ISO para devolver JSON limpio.
function serialize(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

const docToJson = (snap) => ({ id: snap.id, ...serialize(snap.data()) });

module.exports = { serialize, docToJson };