const { Router } = require('express');
const viajesRoutes = require('./viajes.routes');
const itinerarioRoutes = require('./itinerario.routes');
const gastosRoutes = require('./gastos.routes');
const bovedaRoutes = require('./boveda.routes');

const authRoutes = require('./auth.routes');
const divisasRoutes = require('./divisas.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/viajes', viajesRoutes);
router.use('/itinerario', itinerarioRoutes);
router.use('/gastos', gastosRoutes);
router.use('/boveda', bovedaRoutes);
router.use('/divisas', divisasRoutes);

module.exports = router;
