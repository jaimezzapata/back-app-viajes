const { Router } = require('express');
const currencyApiService = require('../services/currencyApi.service');

const router = Router();

/**
 * Obtener las tasas de cambio actualizadas en tiempo real desde la API
 */
router.get('/', async (req, res, next) => {
  try {
    await currencyApiService.getRates();
    const info = currencyApiService.getRatesInfo();
    res.json({
      ok: true,
      data: info
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Forzar sincronización inmediata con la API externa
 */
router.post('/sincronizar', async (req, res, next) => {
  try {
    const info = await currencyApiService.fetchLiveRates();
    res.json({
      ok: true,
      mensaje: 'Tasas de cambio actualizadas desde la API externa',
      data: info
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Convertir un monto entre dos divisas
 */
router.get('/convertir', async (req, res, next) => {
  try {
    const { monto = 1, de = 'USD', a = 'COP' } = req.query;
    await currencyApiService.getRates();
    const resultado = currencyApiService.convert(Number(monto), de, a);
    const conversionesViaje = currencyApiService.getAllTripConversions(Number(monto), de);

    res.json({
      ok: true,
      data: {
        montoOriginal: Number(monto),
        monedaOriginal: de.toUpperCase(),
        monedaDestino: a.toUpperCase(),
        resultado,
        conversionesViaje
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
