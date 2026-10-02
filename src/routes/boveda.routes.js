const { Router } = require('express');
const bovedaController = require('../controllers/boveda.controller');
const { validate } = require('../middlewares/validate');
const { updateDocumentoSchema } = require('../validators/boveda.validator');

const router = Router();

router.get('/:id', bovedaController.getById);
router.put('/:id', validate(updateDocumentoSchema), bovedaController.update);
router.delete('/:id', bovedaController.delete);

module.exports = router;
