const { sanitizeValue } = require('./src/middlewares/sanitizer');
const { registerSchema, loginSchema, loginOrRegisterSchema } = require('./src/validators/auth.validator');
const { createViajeSchema, updateViajeSchema } = require('./src/validators/viajes.validator');
const { createEventoSchema } = require('./src/validators/itinerario.validator');
const { createGastoSchema } = require('./src/validators/gastos.validator');
const { createDocumentoSchema } = require('./src/validators/boveda.validator');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(` PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(` FAIL: ${testName}`);
    process.exitCode = 1;
  }
}

function expectThrows(fn, testName) {
  totalTests++;
  try {
    fn();
    console.error(` FAIL: ${testName} (expected error, but succeeded)`);
    process.exitCode = 1;
  } catch (err) {
    console.log(` PASS: ${testName}`);
    passedTests++;
  }
}

console.log('--- 1. Pruebas de Sanitización (Trim y espacios) ---');
const dirtyBody = {
  nombre: '   Jaime Zapata   ',
  email: '   JAIME@correo.com   ',
  detalles: {
    ciudad: '   Medellin   '
  },
  tags: ['   viaje  ', '  vacaciones ']
};
const cleaned = sanitizeValue(dirtyBody);
assert(cleaned.nombre === 'Jaime Zapata', 'Sanitizer recorta espacios en campos directos');
assert(cleaned.email === 'JAIME@correo.com', 'Sanitizer recorta espacios en email');
assert(cleaned.detalles.ciudad === 'Medellin', 'Sanitizer recorta espacios en objetos anidados');
assert(cleaned.tags[0] === 'viaje' && cleaned.tags[1] === 'vacaciones', 'Sanitizer recorta elementos en arrays');

console.log('\n--- 2. Pruebas de Validación de Autenticación ---');
expectThrows(() => registerSchema.parse({ nombre: '   ', email: 'test@correo.com' }), 'Rechaza nombre solo con espacios');
expectThrows(() => registerSchema.parse({ nombre: 'Juan', email: 'correo-invalido' }), 'Rechaza formato de correo inválido');
const validAuth = registerSchema.parse({ nombre: '  Juan Pérez  ', email: '  JUAN@CORREO.COM  ' });
assert(validAuth.nombre === 'Juan Pérez' && validAuth.email === 'juan@correo.com', 'Acepta y normaliza email a minúsculas y recorta nombre');

console.log('\n--- 3. Pruebas de Validación de Viajes ---');
expectThrows(() => createViajeSchema.parse({
  titulo: '   ',
  destino: 'Cartagena',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-10'
}), 'Rechaza título de viaje vacío o con puros espacios');

expectThrows(() => createViajeSchema.parse({
  titulo: 'Viaje a Cartagena',
  destino: 'Cartagena',
  fechaInicio: '2026-10-10',
  fechaFin: '2026-10-01' // Fin menor a inicio
}), 'Rechaza fechaFin anterior a fechaInicio');

expectThrows(() => createViajeSchema.parse({
  titulo: 'Viaje a Cartagena',
  destino: 'Cartagena',
  fechaInicio: '2026-10-01',
  fechaFin: '2026-10-10',
  presupuestoTotal: -500 // Negativo
}), 'Rechaza presupuesto total negativo');

const validViaje = createViajeSchema.parse({
  titulo: '  Vacaciones Japón 2026  ',
  destino: '  Tokio  ',
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-15',
  presupuestoTotal: '15000000',
  monedaLocal: 'jpy'
});
assert(validViaje.titulo === 'Vacaciones Japón 2026', 'Viaje sanitiza título');
assert(validViaje.presupuestoTotal === 15000000, 'Viaje castea presupuestoTotal a número');
assert(validViaje.monedaLocal === 'JPY', 'Viaje convierte monedaLocal a mayúsculas');

console.log('\n--- 4. Pruebas de Validación de Itinerario ---');
expectThrows(() => createEventoSchema.parse({
  titulo: 'Vuelo',
  tipo: 'tipo_inexistente',
  fechaInicio: '2026-11-01T10:00:00Z'
}), 'Rechaza tipos de evento inválidos');

expectThrows(() => createEventoSchema.parse({
  titulo: 'Vuelo',
  tipo: 'vuelo',
  fechaInicio: 'fecha_invalida'
}), 'Rechaza fecha de inicio no parseable');

expectThrows(() => createEventoSchema.parse({
  titulo: 'Vuelo',
  tipo: 'vuelo',
  fechaInicio: '2026-11-01T10:00:00Z',
  latitud: 150 // Fuera de rango
}), 'Rechaza latitud fuera de rango (-90 a 90)');

console.log('\n--- 5. Pruebas de Validación de Gastos ---');
expectThrows(() => createGastoSchema.parse({
  concepto: '   ',
  categoria: 'comida',
  montoOriginal: 100,
  monedaOriginal: 'USD'
}), 'Rechaza concepto de gasto vacío o solo con espacios');

expectThrows(() => createGastoSchema.parse({
  concepto: 'Almuerzo',
  categoria: 'categoria_rara',
  montoOriginal: 100,
  monedaOriginal: 'USD'
}), 'Rechaza categoría de gasto no reconocida');

expectThrows(() => createGastoSchema.parse({
  concepto: 'Almuerzo',
  categoria: 'comida',
  montoOriginal: 0, // <= 0
  monedaOriginal: 'USD'
}), 'Rechaza monto de gasto igual a 0');

expectThrows(() => createGastoSchema.parse({
  concepto: 'Almuerzo',
  categoria: 'comida',
  montoOriginal: -25, // Negativo
  monedaOriginal: 'USD'
}), 'Rechaza monto de gasto negativo');

console.log('\n--- 6. Pruebas de Validación de Bóveda ---');
expectThrows(() => createDocumentoSchema.parse({
  titulo: 'Recibo Hotel',
  tamanoBytes: 3 * 1024 * 1024 // 3MB > 2MB
}), 'Rechaza documentos mayores a 2MB según RF 3.3');

expectThrows(() => createDocumentoSchema.parse({
  titulo: 'Recibo Hotel'
  // Sin archivoUrl ni archivoBase64
}), 'Rechaza documento sin URL ni Base64');

console.log(`\n========================================`);
console.log(`Resultado: ${passedTests}/${totalTests} pruebas superadas.`);
console.log(`========================================`);
