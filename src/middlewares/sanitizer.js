/**
 * Middleware para sanitizar datos de entrada de forma recursiva:
 * - Elimina espacios en blanco iniciales y finales (trim) de todos los strings.
 * - Evita inyecciones de caracteres nulos (\0).
 */
function fixAccents(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\+a/g, '\u00E1')
    .replace(/\+e/g, '\u00E9')
    .replace(/\+i/g, '\u00ED')
    .replace(/\+o/g, '\u00F3')
    .replace(/\+u/g, '\u00FA')
    .replace(/\+n/g, '\u00F1')
    .replace(/\+A/g, '\u00C1')
    .replace(/\+E/g, '\u00C9')
    .replace(/\+I/g, '\u00CD')
    .replace(/\+O/g, '\u00D3')
    .replace(/\+U/g, '\u00DA')
    .replace(/\+N/g, '\u00D1')
    .replace(/\u00B4a/g, '\u00E1')
    .replace(/\u00B4e/g, '\u00E9')
    .replace(/\u00B4i/g, '\u00ED')
    .replace(/\u00B4o/g, '\u00F3')
    .replace(/\u00B4u/g, '\u00FA')
    .replace(/~n/g, '\u00F1')
    .replace(/~N/g, '\u00D1');
}

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return fixAccents(value.replace(/\0/g, '').trim());
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
