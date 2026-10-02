const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { validate } = require('../middlewares/validate');
const { registerSchema, loginSchema, loginOrRegisterSchema } = require('../validators/auth.validator');

const router = Router();

// Endpoints de autenticación simplificada (Usuario y Correo sin contraseñas)
router.post('/login', validate(loginSchema), usuariosController.login);
router.post('/register', validate(registerSchema), usuariosController.register);
router.post('/login-or-register', validate(loginOrRegisterSchema), usuariosController.loginOrRegister);
router.get('/me/:id', usuariosController.getProfile);
router.get('/usuarios', usuariosController.getAll);

module.exports = router;
