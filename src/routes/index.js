const { Router } = require('express');
const viajesRoutes = require('./viajes.routes');
const itinerarioRoutes = require('./itinerario.routes');
const gastosRoutes = require('./gastos.routes');
const bovedaRoutes = require('./boveda.routes');

const authRoutes = require('./auth.routes');
const divisasRoutes = require('./divisas.routes');
const keepAliveRoutes = require('./keepAlive.routes');

const router = Router();

// Pings ultraligeros en memoria para monitorización (0 consumo de BD)
router.get('/ping', (req, res) => res.json({ ok: true, status: 'pong', timestamp: Date.now() }));
router.get('/health', (req, res) => res.json({ ok: true, status: 'healthy', uptime: Math.floor(process.uptime()), timestamp: Date.now() }));

router.use('/auth', authRoutes);
router.use('/viajes', viajesRoutes);
router.use('/itinerario', itinerarioRoutes);
router.use('/gastos', gastosRoutes);
router.use('/boveda', bovedaRoutes);
router.use('/divisas', divisasRoutes);
router.use('/keep-alive', keepAliveRoutes);

module.exports = router;
