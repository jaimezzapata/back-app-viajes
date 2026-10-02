/**
 * Helpers para manejo de divisas según RF.MD 3.2:
 * - Triple Divisa Simultánea (Transaccional, COP, USD)
 * - Precisión visual: COP y JPY cero decimales, USD y EUR 2 decimales
 */

const currencyApiService = require('../services/currencyApi.service');

function formatAmount(amount, currency) {
  return currencyApiService.formatAmount(amount, currency);
}

// Tasas de cambio de referencia a USD para el itinerario multidivisa
const DEFAULT_RATES_TO_USD = {
  USD: 1.0,
  COP: 0.00030, // Se actualiza dinámicamente vía API
  EUR: 1.134,
  JPY: 0.00636,
  KRW: 0.000738,
  AED: 0.2723,
  MXN: 0.055,
  GBP: 1.28
};

const TRIP_CURRENCIES = ['COP', 'EUR', 'KRW', 'JPY', 'AED', 'USD'];

function convertCurrency(montoOriginal, monedaOriginal, targetCurrency, customRate = null) {
  const orig = (monedaOriginal || 'USD').toUpperCase();
  const target = (targetCurrency || 'USD').toUpperCase();

  if (orig === target) {
    return formatAmount(montoOriginal, target);
  }

  // Si se provee una tasa de cambio histórica congelada
  if (customRate) {
    return formatAmount(Number(montoOriginal) * Number(customRate), target);
  }

  // Usar servicio con tasas en vivo de la API
  return currencyApiService.convert(montoOriginal, orig, target);
}

function getAllTripConversions(montoOriginal, monedaOriginal) {
  return currencyApiService.getAllTripConversions(montoOriginal, monedaOriginal);
}

module.exports = {
  formatAmount,
  convertCurrency,
  getAllTripConversions,
  DEFAULT_RATES_TO_USD,
  TRIP_CURRENCIES,
  currencyApiService
};


