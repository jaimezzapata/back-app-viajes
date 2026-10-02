/**
 * Middleware para sanitizar datos de entrada de forma recursiva:
 * - Elimina espacios en blanco iniciales y finales (trim) de todos los strings.
 * - Evita inyecciones de caracteres nulos (\0).
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(value)) {
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = { sanitizeInput, sanitizeValue };
