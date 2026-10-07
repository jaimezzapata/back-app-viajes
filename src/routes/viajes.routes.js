const { Router } = require('express');
const viajesController = require('../controllers/viajes.controller');
const itinerarioController = require('../controllers/itinerario.controller');
const gastosController = require('../controllers/gastos.controller');
const bovedaController = require('../controllers/boveda.controller');
const { validate } = require('../middlewares/validate');
const { createViajeSchema, updateViajeSchema } = require('../validators/viajes.validator');
const { createEventoSchema } = require('../validators/itinerario.validator');
const { createGastoSchema } = require('../validators/gastos.validator');
const { createDocumentoSchema } = require('../validators/boveda.validator');

const router = Router();

// CRUD Viajes
router.get('/', viajesController.getAll);
router.get('/:id/share', viajesController.getById);
router.get('/:id', viajesController.getById);
router.post('/', validate(createViajeSchema), viajesController.create);
router.put('/:id', validate(updateViajeSchema), viajesController.update);
router.delete('/:id', viajesController.delete);

// Sub-rutas por Viaje (RF.MD y ARQUITECTURA.MD)
// Itinerario de un viaje
router.get('/:viajeId/itinerario', itinerarioController.getByViaje);
router.post('/:viajeId/itinerario', validate(createEventoSchema), itinerarioController.create);

// Gastos y Balance de un viaje
router.get('/:viajeId/gastos', gastosController.getByViaje);
router.post('/:viajeId/gastos', validate(createGastoSchema), gastosController.create);
router.get('/:viajeId/balance', gastosController.getBalance);

// Bóveda de documentos de un viaje
router.get('/:viajeId/boveda', bovedaController.getByViaje);
router.post('/:viajeId/boveda', validate(createDocumentoSchema), bovedaController.create);

module.exports = router;
