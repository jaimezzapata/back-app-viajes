require('dotenv').config();
// Servidor Express configurado con Supabase PostgreSQL y Prisma ORM
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
 * Endpoint raíz (/) para verificación en navegador
 */
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'app-viajes-backend',
    status: 'online',
    message: 'Servidor API de Bitácora de Viajes operativo',
    endpoints: {
      ping: '/ping',
      api: '/api',
      viajes: '/api/viajes'
    }
  });
});

/**
 * Endpoint de supervivencia (/ping)
 * Petición ultraligera en memoria (0 consumo de base de datos)
 * Responde de inmediato para mantener activo el backend y evitar Cold Starts.
 */
app.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    service: 'app-viajes-backend',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024))
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
const keepAliveService = require('./src/services/keepAlive.service');

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(` Servidor de App de Viajes corriendo en http://localhost:${PORT}`);
    console.log(` Endpoint de supervivencia activo en http://localhost:${PORT}/ping`);

    // Iniciar servicio Keep-Alive para consultas periódicas cada 10 minutos
    keepAliveService.start();

    // Actualizar tasas de cambio con la API externa al iniciar
    currencyApiService.fetchLiveRates().catch(err => {
      console.warn('[Currency] No se pudo cargar tasas al arrancar:', err.message);
    });
  });
}

module.exports = app;
