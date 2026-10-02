/**
 * Servicio de tipos de cambio en vivo con API externa y fallback offline
 * API principal: https://open.er-api.com/v6/latest/USD
 * API secundaria: https://api.exchangerate-api.com/v4/latest/USD
 */

const TRIP_CURRENCIES = ['COP', 'EUR', 'KRW', 'JPY', 'AED', 'USD'];

// Tasas de respaldo seguras en caso de desconexión total
const FALLBACK_RATES_FROM_USD = {
  USD: 1.0,
  COP: 3333.96,
  EUR: 0.882,
  JPY: 157.30,
  KRW: 1355.84,
  AED: 3.6725,
  MXN: 18.20,
  GBP: 0.77
};

class CurrencyApiService {
  constructor() {
    this.rates = { ...FALLBACK_RATES_FROM_USD };
    this.lastUpdated = null;
    this.source = 'fallback';
    this.cacheTtlMs = 30 * 60 * 1000; // 30 minutos de caché
    this.isFetching = false;
  }

  /**
   * Obtiene las tasas actualizadas desde la API externa
   */
  async fetchLiveRates() {
    this.isFetching = true;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // 1. Intentar API principal (Open Exchange Rates / ER-API)
      let res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal
      }).catch(() => null);

      let data = res && res.ok ? await res.json().catch(() => null) : null;

      // 2. Si falla, intentar API secundaria de respaldo
      if (!data || !data.rates) {
        const fallbackRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
          signal: controller.signal
        }).catch(() => null);
        data = fallbackRes && fallbackRes.ok ? await fallbackRes.json().catch(() => null) : null;
      }

      clearTimeout(timeoutId);

      if (data && data.rates) {
        this.rates = {
          ...this.rates,
          ...data.rates,
          USD: 1.0
        };
        this.lastUpdated = new Date();
        this.source = 'live-api';
        console.log(`[CurrencyService]  Tasas de cambio actualizadas con éxito (${this.lastUpdated.toISOString()})`);
        return this.getRatesInfo();
      }
    } catch (err) {
      console.warn('[CurrencyService] Advertencia al consultar API externa de divisas:', err.message);
    } finally {
      this.isFetching = false;
    }

    return this.getRatesInfo();
  }

  /**
   * Retorna las tasas vigentes, refrescando si expiró la caché
   */
  async getRates() {
    const isExpired = !this.lastUpdated || (Date.now() - this.lastUpdated.getTime() > this.cacheTtlMs);
    if (isExpired && !this.isFetching) {
      // Intentar refrescar en segundo plano o espera
      await this.fetchLiveRates();
    }
    return this.rates;
  }

  getRatesInfo() {
    return {
      rates: this.rates,
      lastUpdated: this.lastUpdated,
      source: this.source,
      tripCurrencies: TRIP_CURRENCIES
    };
  }

  /**
   * Convierte un monto de una moneda a otra usando las tasas actuales
   */
  convert(amount, fromCurrency, toCurrency) {
    const orig = (fromCurrency || 'USD').toUpperCase();
    const target = (toCurrency || 'USD').toUpperCase();
    const num = Number(amount) || 0;

    if (orig === target) {
      return this.formatAmount(num, target);
    }

    const rateOrig = this.rates[orig] || FALLBACK_RATES_FROM_USD[orig] || 1.0;
    const rateTarget = this.rates[target] || FALLBACK_RATES_FROM_USD[target] || 1.0;

    // Conversión cruzada directa: monto * (rateTarget / rateOrig)
    const converted = num * (rateTarget / rateOrig);
    return this.formatAmount(converted, target);
  }

  formatAmount(amount, currency) {
    const curr = (currency || '').toUpperCase();
    if (curr === 'COP' || curr === 'JPY' || curr === 'KRW') {
      return Math.round(amount);
    }
    return Number(amount.toFixed(2));
  }

  /**
   * Retorna las conversiones a todas las monedas del viaje
   */
  getAllTripConversions(amount, fromCurrency) {
    const orig = (fromCurrency || 'COP').toUpperCase();
    const num = Number(amount) || 0;
    const results = {};

    for (const curr of TRIP_CURRENCIES) {
      results[curr] = this.convert(num, orig, curr);
    }
    return results;
  }
}

const currencyApiService = new CurrencyApiService();
module.exports = currencyApiService;
