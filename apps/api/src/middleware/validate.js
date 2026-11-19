// Valida body o query con un esquema Zod y reemplaza el valor por el ya saneado
// (Zod descarta campos desconocidos, por eso un cliente no puede enviar "role").
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };