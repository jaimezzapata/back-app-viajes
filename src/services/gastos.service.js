const gastosRepository = require('../repositories/gastos.repository');
const viajesRepository = require('../repositories/viajes.repository');
const { convertCurrency, formatAmount } = require('../utils/currency');

class GastosService {
  async getGastosByViaje(viajeId) {
    return gastosRepository.findByViajeId(viajeId);
  }

  async createGasto(data) {
    const {
      viajeId,
      concepto,
      categoria,
      montoOriginal,
      monedaOriginal,
      tasaCambioFecha,
      conversionPendiente,
      fechaGasto,
      timestampReal,
      pagadoAdelantado,
      noComputar,
      esIngreso,
      sincronizado
    } = data;

    const monto = Number(montoOriginal);
    const moneda = (monedaOriginal || 'COP').toUpperCase();

    // Si el cliente ya capturó la tasa y monto exactos en vivo en el momento de la compra, respetarlos
    const clientCOP = data.montoCOP !== undefined && data.montoCOP !== null ? Number(data.montoCOP) : null;
    const clientUSD = data.montoUSD !== undefined && data.montoUSD !== null ? Number(data.montoUSD) : null;

    const montoCOP = clientCOP !== null ? clientCOP : convertCurrency(monto, moneda, 'COP', tasaCambioFecha);
    const montoUSD = clientUSD !== null ? clientUSD : convertCurrency(monto, moneda, 'USD', tasaCambioFecha);

    const calculatedRate = tasaCambioFecha
      ? Number(tasaCambioFecha)
      : (monto > 0 && moneda !== 'COP' ? Number((montoCOP / monto).toFixed(4)) : 1.0);

    return gastosRepository.create({
      viajeId,
      concepto,
      categoria: categoria || 'otros',
      montoOriginal: formatAmount(monto, moneda),
      monedaOriginal: moneda,
      montoCOP,
      montoUSD,
      tasaCambioFecha: calculatedRate,
      conversionPendiente: Boolean(conversionPendiente),
      fechaGasto: fechaGasto ? new Date(fechaGasto) : new Date(),
      timestampReal: timestampReal ? new Date(timestampReal) : new Date(),
      pagadoAdelantado: Boolean(pagadoAdelantado),
      noComputar: Boolean(noComputar),
      esIngreso: Boolean(esIngreso),
      sincronizado: sincronizado !== undefined ? Boolean(sincronizado) : true
    });
  }

  async updateGasto(id, data) {
    const existing = await gastosRepository.findById(id);
    if (!existing) {
      throw new Error('Gasto no encontrado');
    }

    const monto = data.montoOriginal !== undefined ? Number(data.montoOriginal) : existing.montoOriginal;
    const moneda = data.monedaOriginal || existing.monedaOriginal;
    const tasa = data.tasaCambioFecha !== undefined ? data.tasaCambioFecha : existing.tasaCambioFecha;

    const clientCOP = data.montoCOP !== undefined && data.montoCOP !== null ? Number(data.montoCOP) : null;
    const clientUSD = data.montoUSD !== undefined && data.montoUSD !== null ? Number(data.montoUSD) : null;

    const montoCOP = clientCOP !== null ? clientCOP : convertCurrency(monto, moneda, 'COP', tasa);
    const montoUSD = clientUSD !== null ? clientUSD : convertCurrency(monto, moneda, 'USD', tasa);

    return gastosRepository.update(id, {
      ...data,
      montoOriginal: formatAmount(monto, moneda),
      montoCOP,
      montoUSD,
      fechaGasto: data.fechaGasto ? new Date(data.fechaGasto) : existing.fechaGasto,
      timestampReal: data.timestampReal ? new Date(data.timestampReal) : existing.timestampReal
    });
  }

  async deleteGasto(id) {
    return gastosRepository.delete(id);
  }

  /**
   * RF 3.2 - Balance & Semáforo de Presupuesto
   * Genera el desglose financiero del viaje:
   * - Presupuesto total
   * - Total gastado computable
   * - Costos hundidos (pagados por adelantado)
   * - Dinero requerido en ruta (efectivo/tarjeta en viaje)
   * - Encargos de terceros (no computados)
   * - Ingresos / Tax-Free / Reembolsos
   * - Consumo por categoría con semáforo (verde < 75%, amarillo 75-99%, rojo >= 100%)
   */
  async getBalance(viajeId) {
    const viaje = await viajesRepository.findById(viajeId);
    if (!viaje) {
      throw new Error('Viaje no encontrado');
    }

    const gastos = await gastosRepository.findByViajeId(viajeId);

    let totalGastadoCOP = 0;
    let totalGastadoUSD = 0;
    let pagadoAdelantadoCOP = 0;
    let pagadoAdelantadoUSD = 0;
    let enRutaCOP = 0;
    let enRutaUSD = 0;
    let comprasTercerosCOP = 0;
    let ingresosCOP = 0;
    let ingresosUSD = 0;

    const categoriasConsumo = {};

    for (const g of gastos) {
      // Exclusión por encargos (RF 3.2: no computar en presupuesto personal)
      if (g.noComputar) {
        comprasTercerosCOP += g.montoCOP;
        continue;
      }

      // Ingresos y Tax-Free (RF 3.2: reducen el balance de gastos)
      if (g.esIngreso) {
        ingresosCOP += g.montoCOP;
        ingresosUSD += g.montoUSD;
        totalGastadoCOP -= g.montoCOP;
        totalGastadoUSD -= g.montoUSD;
        continue;
      }

      // Gasto ordinario
      totalGastadoCOP += g.montoCOP;
      totalGastadoUSD += g.montoUSD;

      // Gestión de costos hundidos (RF 3.2: separa el dinero requerido en ruta)
      if (g.pagadoAdelantado) {
        pagadoAdelantadoCOP += g.montoCOP;
        pagadoAdelantadoUSD += g.montoUSD;
      } else {
        enRutaCOP += g.montoCOP;
        enRutaUSD += g.montoUSD;
      }

      // Acumular por categoría para el semáforo
      const cat = g.categoria || 'otros';
      if (!categoriasConsumo[cat]) {
        categoriasConsumo[cat] = { gastoCOP: 0, gastoUSD: 0 };
      }
      categoriasConsumo[cat].gastoCOP += g.montoCOP;
      categoriasConsumo[cat].gastoUSD += g.montoUSD;
    }

    // Semáforo por categoría y límites
    const presupuestosConfigurados = viaje.presupuestos || [];
    const semaforoCategorias = [];

    const todasCategorias = ['transporte', 'alojamiento', 'comida', 'actividades', 'compras', 'otros'];
    for (const cat of todasCategorias) {
      const config = presupuestosConfigurados.find(p => p.categoria.toLowerCase() === cat.toLowerCase());
      const limite = config ? config.limite : 0;
      const consumido = categoriasConsumo[cat] ? categoriasConsumo[cat].gastoCOP : 0;
      const porcentaje = limite > 0 ? (consumido / limite) * 100 : 0;

      let color = 'verde';
      if (limite > 0) {
        if (porcentaje >= 100) color = 'rojo';
        else if (porcentaje >= 75) color = 'amarillo';
      }

      semaforoCategorias.push({
        categoria: cat,
        limiteCOP: limite,
        consumidoCOP: consumido,
        consumidoUSD: categoriasConsumo[cat] ? categoriasConsumo[cat].gastoUSD : 0,
        porcentaje: Number(porcentaje.toFixed(1)),
        color
      });
    }

    const presupuestoTotal = viaje.presupuestoTotal;
    const balanceDisponibleCOP = presupuestoTotal - totalGastadoCOP;
    const porcentajeGlobal = presupuestoTotal > 0 ? (totalGastadoCOP / presupuestoTotal) * 100 : 0;

    let semaforoGlobal = 'verde';
    if (presupuestoTotal > 0) {
      if (porcentajeGlobal >= 100) semaforoGlobal = 'rojo';
      else if (porcentajeGlobal >= 75) semaforoGlobal = 'amarillo';
    }

    return {
      viajeId: viaje.id,
      titulo: viaje.titulo,
      monedaBase: viaje.monedaBase,
      monedaReferencia: viaje.monedaReferencia,
      presupuestoTotalCOP: presupuestoTotal,
      totalGastadoCOP: formatAmount(totalGastadoCOP, 'COP'),
      totalGastadoUSD: formatAmount(totalGastadoUSD, 'USD'),
      pagadoAdelantadoCOP: formatAmount(pagadoAdelantadoCOP, 'COP'),
      dineroRequeridoEnRutaCOP: formatAmount(enRutaCOP, 'COP'),
      comprasTercerosCOP: formatAmount(comprasTercerosCOP, 'COP'),
      ingresosReembolsosCOP: formatAmount(ingresosCOP, 'COP'),
      balanceDisponibleCOP: formatAmount(balanceDisponibleCOP, 'COP'),
      porcentajeConsumido: Number(porcentajeGlobal.toFixed(1)),
      semaforoGlobal,
      semaforoCategorias
    };
  }
}

module.exports = new GastosService();
