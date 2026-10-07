/**
 * Servicio de Supervivencia / Keep-Alive
 * Realiza peticiones periódicas (cada 10 minutos por defecto) para mantener
 * el servidor activo en plataformas como Render, Railway o Fly.io y evitar
 * que entre en modo de suspensión (Cold Starts).
 * 
 * Es una petición ultraligera en memoria que no consume base de datos ni recursos del sistema.
 */

class KeepAliveService {
  constructor() {
    this.timer = null;
    this.initialTimer = null;
    this.isRunning = false;

    // Configuración de intervalo (10 minutos por defecto)
    const envMinutes = process.env.KEEP_ALIVE_INTERVAL_MINUTES
      ? parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES, 10)
      : 10;
    this.intervalMs = (process.env.KEEP_ALIVE_INTERVAL_MS
      ? parseInt(process.env.KEEP_ALIVE_INTERVAL_MS, 10)
      : envMinutes * 60 * 1000) || 10 * 60 * 1000;

    // Métricas en memoria
    this.stats = {
      totalPings: 0,
      successfulPings: 0,
      failedPings: 0,
      lastPingAt: null,
      lastStatus: null,
      lastDurationMs: null,
      lastError: null
    };
  }

  /**
   * Resuelve la URL objetivo hacia donde se enviará el ping
   */
  getTargetUrl() {
    if (process.env.KEEP_ALIVE_URL) {
      return process.env.KEEP_ALIVE_URL;
    }

    // Render define automáticamente RENDER_EXTERNAL_URL (ej: https://back-app-viajes.onrender.com)
    if (process.env.RENDER_EXTERNAL_URL) {
      const base = process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
      return `${base}/ping`;
    }

    if (process.env.APP_URL) {
      const base = process.env.APP_URL.replace(/\/+$/, '');
      return `${base}/ping`;
    }

    if (process.env.BACKEND_URL) {
      const base = process.env.BACKEND_URL.replace(/\/+$/, '');
      return `${base}/ping`;
    }

    // URL pública por defecto en producción para Render
    if (process.env.NODE_ENV === 'production') {
      return 'https://back-app-viajes.onrender.com/ping';
    }

    const port = process.env.PORT || 4000;
    return `http://localhost:${port}/ping`;
  }

  /**
   * Ejecuta una consulta HTTP ligera hacia el endpoint de supervivencia
   */
  async executePing(isManual = false) {
    const targetUrl = this.getTargetUrl();
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Timeout de 20s para tolerar Cold Starts si despierta

    this.stats.totalPings += 1;
    this.stats.lastPingAt = new Date().toISOString();

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'AppViajes-KeepAlive/1.0',
          'Accept': 'application/json',
          'X-Keep-Alive-Source': isManual ? 'manual' : 'scheduled'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      this.stats.lastDurationMs = durationMs;
      this.stats.lastStatus = response.status;
      this.stats.lastError = null;

      if (response.ok) {
        this.stats.successfulPings += 1;
        const tag = isManual ? '[Keep-Alive Manual]' : '[Keep-Alive Programado]';
        console.log(`${tag} Ping exitoso a ${targetUrl} (Status ${response.status}, ${durationMs}ms)`);
        return { ok: true, status: response.status, durationMs, targetUrl };
      } else {
        this.stats.failedPings += 1;
        this.stats.lastError = `HTTP ${response.status}`;
        console.warn(`[Keep-Alive] Ping devolvió status ${response.status} en ${targetUrl}`);
        return { ok: false, status: response.status, durationMs, targetUrl };
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      this.stats.failedPings += 1;
      this.stats.lastDurationMs = durationMs;
      this.stats.lastError = err.name === 'AbortError' ? 'Timeout (8s)' : err.message;

      // No detener el proceso en caso de fallo temporal de red
      console.warn(`[Keep-Alive] Aviso: No se pudo completar ping a ${targetUrl}: ${this.stats.lastError}`);
      return { ok: false, error: this.stats.lastError, durationMs, targetUrl };
    }
  }

  /**
   * Inicia el ciclo recurrente cada 10 minutos
   */
  start() {
    if (process.env.KEEP_ALIVE_ENABLED === 'false') {
      console.log('[Keep-Alive] Servicio desactivado explícitamente mediante KEEP_ALIVE_ENABLED=false');
      return;
    }

    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const minutes = Math.round(this.intervalMs / 60000);
    const targetUrl = this.getTargetUrl();
    console.log(`[Keep-Alive]  Servicio iniciado: realizando peticiones cada ${minutes} minutos a ${targetUrl}`);

    // Primer ping de verificación tras 15 segundos de iniciar el servidor
    this.initialTimer = setTimeout(() => {
      this.executePing().catch(() => {});
    }, 15000);
    if (this.initialTimer.unref) this.initialTimer.unref();

    // Ciclo recurrente cada 10 minutos
    this.timer = setInterval(() => {
      this.executePing().catch(() => {});
    }, this.intervalMs);

    // Evitar que el timer impida apagar el proceso Node limpiamente
    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Detiene el ciclo si es necesario
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.initialTimer) {
      clearTimeout(this.initialTimer);
      this.initialTimer = null;
    }
    this.isRunning = false;
    console.log('[Keep-Alive] Servicio detenido');
  }

  /**
   * Retorna el estado y estadísticas actuales del servicio
   */
  getStatus() {
    return {
      enabled: process.env.KEEP_ALIVE_ENABLED !== 'false',
      running: this.isRunning,
      intervalMinutes: Math.round(this.intervalMs / 60000),
      intervalMs: this.intervalMs,
      targetUrl: this.getTargetUrl(),
      stats: { ...this.stats }
    };
  }
}

module.exports = new KeepAliveService();
