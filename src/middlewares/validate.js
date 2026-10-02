const { ZodError } = require('zod');

/**
 * Middleware generador de validación con Zod
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} target
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[target] || {};
      const parsed = schema.parse(dataToValidate);
      // Reasignar los datos validados y transformados
      req[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map(e => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }));

        return res.status(400).json({
          ok: false,
          error: 'Error de validación en los datos enviados',
          detalles: errors
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
