const { Router } = require('express');
const keepAliveService = require('../services/keepAlive.service');

const router = Router();

/**
 * GET /api/keep-alive
 * Consulta el estado y métricas del servicio de supervivencia
 */
router.get('/', (req, res) => {
  res.json({
    ok: true,
    data: keepAliveService.getStatus()
  });
});

/**
 * POST /api/keep-alive/trigger
 * Dispara un ping manual para verificar conectividad
 */
router.post('/trigger', async (req, res) => {
  const result = await keepAliveService.executePing(true);
  res.json({
    ok: result.ok,
    data: result
  });
});

module.exports = router;
