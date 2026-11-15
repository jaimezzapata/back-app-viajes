const gastosRepository = require('../repositories/gastos.repository');
const viajesRepository = require('../repositories/viajes.repository');
const itinerarioService = require('./itinerario.service');
const { convertCurrency, formatAmount } = require('../utils/currency');

function serializeGastoMeta(concepto, extraMeta = {}) {
  const meta = typeof extraMeta === 'object' && extraMeta !== null ? { ...extraMeta } : {};
  if (meta.cantidadPersonas !== undefined && meta.cantidadPersonas !== null) {
    meta.cantidadPersonas = Math.max(1, Math.round(Number(meta.cantidadPersonas) || 1));
  }
  if (meta.costoTotal !== undefined && meta.costoTotal !== null) meta.costoTotal = Number(meta.costoTotal);
  if (meta.costoPorPersona !== undefined && meta.costoPorPersona !== null) meta.costoPorPersona = Number(meta.costoPorPersona);
  if (meta.computarSoloMiParte !== undefined && meta.computarSoloMiParte !== null) meta.computarSoloMiParte = Boolean(meta.computarSoloMiParte);

  Object.keys(meta).forEach(k => {
    if (meta[k] === undefined || meta[k] === null || meta[k] === '') delete meta[k];
  });

  const cleanConcepto = (concepto || '').replace(/\n?<!--META:.*?:META-->/g, '').trim();
  if (Object.keys(meta).length === 0) return cleanConcepto;
  const metaTag = `<!--META:${JSON.stringify(meta)}:META-->`;
  return `${cleanConcepto}${metaTag}`;
}

function enrichGastoWithEventoMeta(gasto) {
  if (!gasto) return gasto;
  let tarjetaCredito = gasto.tarjetaCredito || null;
  let cantidadPersonas = gasto.cantidadPersonas !== undefined ? Math.max(1, Math.round(Number(gasto.cantidadPersonas) || 1)) : 1;
  let modoCostoPersonas = gasto.modoCostoPersonas || 'total';
  let computarSoloMiParte = gasto.computarSoloMiParte !== undefined ? Boolean(gasto.computarSoloMiParte) : true;
  let costoTotal = gasto.costoTotal !== undefined && Number(gasto.costoTotal) > 0 ? Number(gasto.costoTotal) : null;
  let costoPorPersona = gasto.costoPorPersona !== undefined && Number(gasto.costoPorPersona) > 0 ? Number(gasto.costoPorPersona) : null;
  let rawConcepto = gasto.concepto || '';

  if (typeof rawConcepto === 'string' && rawConcepto.includes('<!--META:')) {
    const match = rawConcepto.match(/<!--META:(.*?):META-->/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (!tarjetaCredito && meta.tarjetaCredito) tarjetaCredito = meta.tarjetaCredito;
        if (meta.cantidadPersonas !== undefined) cantidadPersonas = Math.max(1, Math.round(Number(meta.cantidadPersonas) || 1));
        if (meta.modoCostoPersonas) modoCostoPersonas = meta.modoCostoPersonas;
        if (meta.computarSoloMiParte !== undefined) computarSoloMiParte = Boolean(meta.computarSoloMiParte);
        if (costoTotal === null && meta.costoTotal !== undefined) costoTotal = Number(meta.costoTotal);
        if (costoPorPersona === null && meta.costoPorPersona !== undefined) costoPorPersona = Number(meta.costoPorPersona);
      } catch {}
    }
    rawConcepto = rawConcepto.replace(/\n?<!--META:.*?:META-->/g, '').trim();
  }

  if (gasto.evento && gasto.evento.notas && gasto.evento.notas.includes('<!--META:')) {
    const match = gasto.evento.notas.match(/<!--META:(.*?):META-->/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (!tarjetaCredito && meta.tarjetaCredito) {
          tarjetaCredito = meta.tarjetaCredito;
        }
        if (meta.cantidadPersonas !== undefined) {
          cantidadPersonas = Math.max(1, Math.round(Number(meta.cantidadPersonas) || 1));
        }
        if (meta.modoCostoPersonas) {
          modoCostoPersonas = meta.modoCostoPersonas;
        }
        if (meta.computarSoloMiParte !== undefined) {
          computarSoloMiParte = Boolean(meta.computarSoloMiParte);
        }
        if (costoTotal === null && meta.costoTotal !== undefined) {
          costoTotal = Number(meta.costoTotal);
        }
        if (costoPorPersona === null && meta.costoPorPersona !== undefined) {
          costoPorPersona = Number(meta.costoPorPersona);
        }
      } catch {}
    }
  }

  const rawMontoOrig = Number(gasto.montoOriginal) || 0;
  const finalCostoTotal = costoTotal && costoTotal > 0 ? costoTotal : rawMontoOrig;
  const finalCostoPorPersona = costoPorPersona && costoPorPersona > 0
    ? costoPorPersona
    : (cantidadPersonas > 1 ? Number((finalCostoTotal / cantidadPersonas).toFixed(2)) : finalCostoTotal);

  const rawCOP = Number(gasto.montoCOP) || 0;
  const rawUSD = Number(gasto.montoUSD) || 0;
  const montoTotalCOP = rawCOP;
  const montoPorPersonaCOP = cantidadPersonas > 1 ? Math.round(rawCOP / cantidadPersonas) : rawCOP;
  const montoTotalUSD = rawUSD;
  const montoPorPersonaUSD = cantidadPersonas > 1 ? Number((rawUSD / cantidadPersonas).toFixed(2)) : rawUSD;

  return {
    ...gasto,
    concepto: rawConcepto,
    ...(tarjetaCredito ? { tarjetaCredito } : {}),
    cantidadPersonas,
    modoCostoPersonas,
    computarSoloMiParte,
    costoTotal: finalCostoTotal,
    costoPorPersona: finalCostoPorPersona,
    montoTotalCOP,
    montoPorPersonaCOP,
    montoTotalUSD,
    montoPorPersonaUSD
  };
}

class GastosService {
  async getGastosByViaje(viajeId) {
    // Asegurar que todos los eventos con costo tengan su gasto asociado creado
    await itinerarioService.getEventosByViaje(viajeId).catch(() => {});
    const gastos = await gastosRepository.findByViajeId(viajeId);
    return gastos.map(enrichGastoWithEventoMeta);
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

    const paxCount = Math.max(1, Math.round(Number(data.cantidadPersonas) || 1));
    const modoPax = data.modoCostoPersonas || 'total';
    const isSoloMiParte = data.computarSoloMiParte !== undefined ? Boolean(data.computarSoloMiParte) : true;
    const rawMonto = Number(montoOriginal);
    const finalCostoTotal = data.costoTotal !== undefined && Number(data.costoTotal) > 0
      ? Number(data.costoTotal)
      : (modoPax === 'por_persona' && paxCount > 1 ? Number((rawMonto * paxCount).toFixed(2)) : rawMonto);
    const finalCostoPorPersona = data.costoPorPersona !== undefined && Number(data.costoPorPersona) > 0
      ? Number(data.costoPorPersona)
      : (paxCount > 1 ? Number((finalCostoTotal / paxCount).toFixed(2)) : finalCostoTotal);

    const monto = finalCostoTotal;
    const moneda = (monedaOriginal || 'COP').toUpperCase();

    // Si el cliente ya capturó la tasa y monto exactos en vivo en el momento de la compra, respetarlos
    const clientCOP = data.montoCOP !== undefined && data.montoCOP !== null ? Number(data.montoCOP) : null;
    const clientUSD = data.montoUSD !== undefined && data.montoUSD !== null ? Number(data.montoUSD) : null;

    const montoCOP = clientCOP !== null ? clientCOP : convertCurrency(monto, moneda, 'COP', tasaCambioFecha);
    const montoUSD = clientUSD !== null ? clientUSD : convertCurrency(monto, moneda, 'USD', tasaCambioFecha);

    const calculatedRate = tasaCambioFecha
      ? Number(tasaCambioFecha)
      : (monto > 0 && moneda !== 'COP' ? Number((montoCOP / monto).toFixed(4)) : 1.0);

    const conceptoConMeta = serializeGastoMeta(concepto, {
      tarjetaCredito: data.tarjetaCredito || undefined,
      cantidadPersonas: paxCount > 1 ? paxCount : undefined,
      modoCostoPersonas: paxCount > 1 ? modoPax : undefined,
      costoTotal: paxCount > 1 ? finalCostoTotal : undefined,
      costoPorPersona: paxCount > 1 ? finalCostoPorPersona : undefined,
      computarSoloMiParte: paxCount > 1 ? isSoloMiParte : undefined
    });

    const created = await gastosRepository.create({
      viajeId,
      concepto: conceptoConMeta,
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

    return enrichGastoWithEventoMeta(created);
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

    const updatePayload = {
      montoOriginal: formatAmount(monto, moneda),
      monedaOriginal: moneda,
      montoCOP,
      montoUSD,
      fechaGasto: data.fechaGasto ? new Date(data.fechaGasto) : existing.fechaGasto,
      timestampReal: data.timestampReal ? new Date(data.timestampReal) : existing.timestampReal
    };
    if (data.concepto !== undefined) updatePayload.concepto = data.concepto;
    if (data.categoria !== undefined) updatePayload.categoria = data.categoria;
    if (data.tasaCambioFecha !== undefined) updatePayload.tasaCambioFecha = data.tasaCambioFecha;
    if (data.conversionPendiente !== undefined) updatePayload.conversionPendiente = Boolean(data.conversionPendiente);
    if (data.pagadoAdelantado !== undefined) updatePayload.pagadoAdelantado = Boolean(data.pagadoAdelantado);
    if (data.noComputar !== undefined) updatePayload.noComputar = Boolean(data.noComputar);
    if (data.esIngreso !== undefined) updatePayload.esIngreso = Boolean(data.esIngreso);
    if (data.sincronizado !== undefined) updatePayload.sincronizado = Boolean(data.sincronizado);

    return gastosRepository.update(id, updatePayload);
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
