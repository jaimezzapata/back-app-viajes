const { Router } = require('express');
const itinerarioController = require('../controllers/itinerario.controller');
const { validate } = require('../middlewares/validate');
const { updateEventoSchema } = require('../validators/itinerario.validator');

const router = Router();

router.put('/:id', validate(updateEventoSchema), itinerarioController.update);
router.delete('/:id', itinerarioController.delete);

module.exports = router;
