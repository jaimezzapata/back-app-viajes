const { Router } = require('express');
const gastosController = require('../controllers/gastos.controller');
const { validate } = require('../middlewares/validate');
const { updateGastoSchema } = require('../validators/gastos.validator');

const router = Router();

router.put('/:id', validate(updateGastoSchema), gastosController.update);
router.delete('/:id', gastosController.delete);

module.exports = router;
