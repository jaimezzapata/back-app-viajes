require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./src/routes');
const { prisma, basePrisma } = require('./src/config/prisma');

const { sanitizeInput } = require('./src/middlewares/sanitizer');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

/**
 * Endpoint de supervivencia (/ping)
 * Según STACK.MD y RF.MD:
 * Realiza peticiones automáticas (ping) para mantener el backend activo en Render
 * y evitar tiempos de espera largos (Cold Starts).
 */
app.get('/ping', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    // Verificación rápida de conexión DB
    await basePrisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'app-viajes-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus
  });
});

// Rutas de la API
app.use('/api', apiRoutes);

// Manejo de ruta no encontrada (404)
app.use((req, res, next) => {
  res.status(404).json({
    ok: false,
    error: 'Ruta no encontrada'
  });
});

// Manejador centralizado de errores
app.use((err, req, res, next) => {
  console.error('[Error Handler]:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    ok: false,
    error: err.message || 'Error interno del servidor',
    code: err.code || undefined
  });
});

const currencyApiService = require('./src/services/currencyApi.service');

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(` Servidor de App de Viajes corriendo en http://localhost:${PORT}`);
    console.log(` Endpoint de supervivencia activo en http://localhost:${PORT}/ping`);

    // Actualizar tasas de cambio con la API externa al iniciar
    currencyApiService.fetchLiveRates().catch(err => {
      console.warn('[Currency] No se pudo cargar tasas al arrancar:', err.message);
    });
  });
}

module.exports = app;
