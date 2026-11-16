const itinerarioRepository = require('../repositories/itinerario.repository');
const gastosRepository = require('../repositories/gastos.repository');
const { convertCurrency } = require('../utils/currency');

function mapTipoToCategoriaGasto(tipo) {
  const t = (tipo || 'otro').toLowerCase();
  if (t === 'hotel') return 'alojamiento';
  if (t === 'vuelo' || t === 'transporte') return 'transporte';
  if (t === 'comida') return 'comida';
  if (t === 'impuestos' || t === 'permisos' || t === 'tramite') return 'impuestos';
  return 'actividades';
}

function serializeEventoMeta(notas, extraMeta = {}) {
  const meta = typeof extraMeta === 'object' && extraMeta !== null ? { ...extraMeta } : {};
  if (meta.horasEscala !== undefined && meta.horasEscala !== null) meta.horasEscala = Number(meta.horasEscala);
  if (meta.escalaMayor24h !== undefined && meta.escalaMayor24h !== null) meta.escalaMayor24h = Boolean(meta.escalaMayor24h);
  if (meta.descontarPresupuesto !== undefined && meta.descontarPresupuesto !== null) meta.descontarPresupuesto = Boolean(meta.descontarPresupuesto);
  if (meta.pagadoAdelantado !== undefined && meta.pagadoAdelantado !== null) meta.pagadoAdelantado = Boolean(meta.pagadoAdelantado);
  if (meta.cantidadPersonas !== undefined && meta.cantidadPersonas !== null) meta.cantidadPersonas = Math.max(1, Math.round(Number(meta.cantidadPersonas) || 1));
  if (meta.costoTotal !== undefined && meta.costoTotal !== null) meta.costoTotal = Number(meta.costoTotal);
  if (meta.costoPorPersona !== undefined && meta.costoPorPersona !== null) meta.costoPorPersona = Number(meta.costoPorPersona);
  if (meta.computarSoloMiParte !== undefined && meta.computarSoloMiParte !== null) meta.computarSoloMiParte = Boolean(meta.computarSoloMiParte);
  
  Object.keys(meta).forEach(k => {
    if (meta[k] === undefined || meta[k] === null || meta[k] === '') delete meta[k];
  });

  if (Object.keys(meta).length === 0) return notas || null;
  const metaTag = `\n<!--META:${JSON.stringify(meta)}:META-->`;
  const cleanNotas = (notas || '').replace(/\n?<!--META:.*?:META-->/g, '').trim();
  return cleanNotas ? `${cleanNotas}${metaTag}` : metaTag;
}

function deserializeEventoMeta(evento) {
  if (!evento) return evento;
  let horasEscala = evento.horasEscala !== undefined ? evento.horasEscala : null;
  let escalaMayor24h = evento.escalaMayor24h !== undefined ? evento.escalaMayor24h : false;
  let tipoTrayecto = evento.tipoTrayecto || ((evento.tipo || '').toLowerCase() === 'vuelo' ? 'one-way' : null);
  let tramo = evento.tramo || null;
  let roundTripGroupId = evento.roundTripGroupId || null;
  let descontarPresupuesto = evento.descontarPresupuesto !== undefined ? Boolean(evento.descontarPresupuesto) : true;
  let pagadoAdelantado = evento.pagadoAdelantado !== undefined ? Boolean(evento.pagadoAdelantado) : false;
  let tarjetaCredito = evento.tarjetaCredito || null;
  let cantidadPersonas = evento.cantidadPersonas !== undefined ? Math.max(1, Math.round(Number(evento.cantidadPersonas) || 1)) : 1;
  let modoCostoPersonas = evento.modoCostoPersonas || 'total';
  let computarSoloMiParte = evento.computarSoloMiParte !== undefined ? Boolean(evento.computarSoloMiParte) : true;
  let costoTotal = evento.costoTotal !== undefined && Number(evento.costoTotal) > 0 ? Number(evento.costoTotal) : null;
  let costoPorPersona = evento.costoPorPersona !== undefined && Number(evento.costoPorPersona) > 0 ? Number(evento.costoPorPersona) : null;
  let notas = evento.notas || null;

  // Si tiene gastoAsociado, deducir los flags contables reales
  if (evento.gastoAsociado) {
    if (evento.gastoAsociado.pagadoAdelantado !== undefined) {
      pagadoAdelantado = Boolean(evento.gastoAsociado.pagadoAdelantado);
    }
    if (evento.gastoAsociado.noComputar !== undefined) {
      descontarPresupuesto = !Boolean(evento.gastoAsociado.noComputar);
    }
    if (evento.gastoAsociado.tarjetaCredito) {
      tarjetaCredito = evento.gastoAsociado.tarjetaCredito;
    }
  }

  if (notas && notas.includes('<!--META:')) {
    const match = notas.match(/<!--META:(.*?):META-->/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (horasEscala === null && meta.horasEscala !== undefined) horasEscala = meta.horasEscala;
        if (!escalaMayor24h && meta.escalaMayor24h !== undefined) escalaMayor24h = meta.escalaMayor24h;
        if (meta.tipoTrayecto) tipoTrayecto = meta.tipoTrayecto;
        if (meta.tramo) tramo = meta.tramo;
        if (meta.roundTripGroupId) roundTripGroupId = meta.roundTripGroupId;
        if (meta.descontarPresupuesto !== undefined) descontarPresupuesto = Boolean(meta.descontarPresupuesto);
        if (meta.pagadoAdelantado !== undefined) pagadoAdelantado = Boolean(meta.pagadoAdelantado);
        if (meta.tarjetaCredito) tarjetaCredito = meta.tarjetaCredito;
        if (meta.cantidadPersonas !== undefined) cantidadPersonas = Math.max(1, Math.round(Number(meta.cantidadPersonas) || 1));
        if (meta.modoCostoPersonas) modoCostoPersonas = meta.modoCostoPersonas;
        if (meta.computarSoloMiParte !== undefined) computarSoloMiParte = Boolean(meta.computarSoloMiParte);
        if (costoTotal === null && meta.costoTotal !== undefined) costoTotal = Number(meta.costoTotal);
        if (costoPorPersona === null && meta.costoPorPersona !== undefined) costoPorPersona = Number(meta.costoPorPersona);
      } catch {}
      notas = notas.replace(/\n?<!--META:.*?:META-->/g, '').trim() || null;
    }
  }

  // Si no tenía flag pero tiene horasEscala, deducir si es > 24
  if (horasEscala !== null && horasEscala > 24) {
    escalaMayor24h = true;
  }

  const rawCosto = Number(evento.costo) || 0;
  const finalCostoTotal = costoTotal && costoTotal > 0 ? costoTotal : rawCosto;
  const isHotel = (evento.tipo || '').trim().toLowerCase() === 'hotel';
  const finalCostoPorPersona = isHotel
    ? finalCostoTotal
    : (costoPorPersona && costoPorPersona > 0
      ? costoPorPersona
      : (cantidadPersonas > 1 ? Number((finalCostoTotal / cantidadPersonas).toFixed(2)) : finalCostoTotal));

  return {
    ...evento,
    notas,
    horasEscala,
    escalaMayor24h,
    tipoTrayecto,
    tramo,
    roundTripGroupId,
    descontarPresupuesto,
    pagadoAdelantado,
    tarjetaCredito,
    cantidadPersonas,
    modoCostoPersonas,
    computarSoloMiParte,
    costoTotal: finalCostoTotal,
    costoPorPersona: finalCostoPorPersona
  };
}

class ItinerarioService {
  async getEventosByViaje(viajeId) {
    const eventos = await itinerarioRepository.findByViajeId(viajeId);
    const results = [];
    for (const ev of eventos) {
      const deserialized = deserializeEventoMeta(ev);
      if (deserialized.costo && Number(deserialized.costo) > 0 && !ev.gastoAsociado) {
        try {
          const monedaOriginal = (deserialized.moneda || 'COP').toUpperCase();
          const montoOriginal = Number(deserialized.costo);
          const montoCOP = convertCurrency(montoOriginal, monedaOriginal, 'COP');
          const montoUSD = convertCurrency(montoOriginal, monedaOriginal, 'USD');
          const tipo = (deserialized.tipo || 'otro').toLowerCase();
          const gastoCreado = await gastosRepository.create({
            viajeId: deserialized.viajeId,
            eventoId: deserialized.id,
            concepto: `${tipo ? tipo.toUpperCase() + ': ' : ''}${deserialized.titulo}`,
            categoria: mapTipoToCategoriaGasto(tipo),
            montoOriginal,
            monedaOriginal,
            montoCOP,
            montoUSD,
            fechaGasto: deserialized.fechaInicio || new Date(),
            pagadoAdelantado: Boolean(deserialized.pagadoAdelantado),
            noComputar: !Boolean(deserialized.descontarPresupuesto),
            esIngreso: false,
            sincronizado: true
          });
          results.push(deserializeEventoMeta({ ...ev, gastoAsociado: gastoCreado }));
          continue;
        } catch (err) {
          console.warn('[ItinerarioService] Error auto-reconciliando gasto para evento:', deserialized.id, err.message);
        }
      }
      results.push(deserialized);
    }
    return results;
  }

  /**
   * RF 3.1 - Motor de Conflictos
   * Detecta si un evento se solapa temporalmente con otros eventos del mismo viaje.
   * Emite una alerta visual/objeto de advertencia, pero no bloquea el registro.
   */
  async checkConflicts(viajeId, fechaInicio, fechaFin, excludeEventoId = null) {
    const eventosExistentes = await itinerarioRepository.findByViajeId(viajeId);
    const start = new Date(fechaInicio).getTime();
    const end = new Date(fechaFin).getTime();

    const conflicts = [];

    for (const ev of eventosExistentes) {
      if (excludeEventoId && ev.id === excludeEventoId) continue;

      const evStart = new Date(ev.fechaInicio).getTime();
      const evEnd = new Date(ev.fechaFin).getTime();

      // Existe solapamiento si (start < evEnd) y (end > evStart)
      if (start < evEnd && end > evStart) {
        conflicts.push({
          eventoId: ev.id,
          titulo: ev.titulo,
          fechaInicio: ev.fechaInicio,
          fechaFin: ev.fechaFin,
          mensaje: `Conflicto de horario con el evento "${ev.titulo}" (${new Date(ev.fechaInicio).toLocaleTimeString()} - ${new Date(ev.fechaFin).toLocaleTimeString()})`
        });
      }
    }

    return conflicts;
  }

  /**
   * Crear evento aplicando:
   * - RF 3.1: Asignación de 2 horas por defecto si no hay fechaFin explícita.
   * - RF 3.1: Detección de conflictos sin bloquear.
   * - RF 3.2: Automatización de Costos (Interoperabilidad): Si tiene valor económico, se crea un gasto en Gastos.
   */
  async createEvento(data) {
    let {
      fechaInicio,
      fechaFin,
      costo,
      moneda,
      viajeId,
      titulo,
      tipo,
      horasEscala,
      escalaMayor24h,
      tipoTrayecto,
      tramo,
      roundTripGroupId,
      descontarPresupuesto,
      pagadoAdelantado,
      notas
    } = data;

    const startDate = new Date(fechaInicio);
    let endDate;

    if (!fechaFin) {
      // Regla de Negocio: Duración por defecto de 2 horas
      endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    } else {
      endDate = new Date(fechaFin);
    }

    // Comprobar conflictos
    const conflicts = await this.checkConflicts(viajeId, startDate, endDate);

    // Deducir escalaMayor24h si hay horasEscala
    const isMayor24 = escalaMayor24h || (horasEscala !== undefined && Number(horasEscala) > 24);
    const isDescontar = descontarPresupuesto !== undefined ? Boolean(descontarPresupuesto) : true;
    const isAdelantado = Boolean(pagadoAdelantado);

    const paxCount = Math.max(1, Math.round(Number(data.cantidadPersonas) || 1));
    const modoPax = data.modoCostoPersonas || 'total';
    const isSoloMiParte = data.computarSoloMiParte !== undefined ? Boolean(data.computarSoloMiParte) : true;
    const rawCostoInput = costo ? Number(costo) : 0;

    let finalCostoTotal = data.costoTotal !== undefined && Number(data.costoTotal) > 0
      ? Number(data.costoTotal)
      : (modoPax === 'por_persona' && paxCount > 1 ? Number((rawCostoInput * paxCount).toFixed(2)) : rawCostoInput);
    let finalCostoPorPersona = data.costoPorPersona !== undefined && Number(data.costoPorPersona) > 0
      ? Number(data.costoPorPersona)
      : (paxCount > 1 ? Number((finalCostoTotal / paxCount).toFixed(2)) : finalCostoTotal);

    const notasConMeta = serializeEventoMeta(notas, {
      horasEscala,
      escalaMayor24h: isMayor24,
      tipoTrayecto: tipoTrayecto || (tipo === 'vuelo' ? 'one-way' : undefined),
      tramo,
      roundTripGroupId,
      descontarPresupuesto: isDescontar,
      pagadoAdelantado: isAdelantado,
      tarjetaCredito: data.tarjetaCredito || undefined,
      cantidadPersonas: paxCount,
      modoCostoPersonas: modoPax,
      costoTotal: finalCostoTotal > 0 ? finalCostoTotal : undefined,
      costoPorPersona: finalCostoPorPersona > 0 ? finalCostoPorPersona : undefined,
      computarSoloMiParte: isSoloMiParte
    });

    const dataPrisma = { ...data };
    delete dataPrisma.horasEscala;
    delete dataPrisma.escalaMayor24h;
    delete dataPrisma.tipoTrayecto;
    delete dataPrisma.tramo;
    delete dataPrisma.roundTripGroupId;
    delete dataPrisma.descontarPresupuesto;
    delete dataPrisma.pagadoAdelantado;
    delete dataPrisma.tarjetaCredito;
    delete dataPrisma.cantidadPersonas;
    delete dataPrisma.modoCostoPersonas;
    delete dataPrisma.costoTotal;
    delete dataPrisma.costoPorPersona;
    delete dataPrisma.computarSoloMiParte;
    dataPrisma.notas = notasConMeta;
    dataPrisma.fechaInicio = startDate;
    dataPrisma.fechaFin = endDate;
    dataPrisma.costo = finalCostoTotal > 0 ? finalCostoTotal : null;

    // Guardar evento
    const nuevoEvento = await itinerarioRepository.create(dataPrisma);

    // Interoperabilidad con Módulo de Gastos (RF 3.2)
    let gastoCreado = null;
    if (finalCostoTotal > 0) {
      const monedaOriginal = (moneda || 'COP').toUpperCase();
      const montoOriginal = finalCostoTotal;
      const montoCOP = convertCurrency(montoOriginal, monedaOriginal, 'COP');
      const montoUSD = convertCurrency(montoOriginal, monedaOriginal, 'USD');

      gastoCreado = await gastosRepository.create({
        viajeId,
        eventoId: nuevoEvento.id,
        concepto: `${tipo ? tipo.toUpperCase() + ': ' : ''}${titulo}`,
        categoria: mapTipoToCategoriaGasto(tipo),
        montoOriginal,
        monedaOriginal,
        montoCOP,
        montoUSD,
        fechaGasto: startDate,
        pagadoAdelantado: isAdelantado,
        noComputar: !isDescontar,
        esIngreso: false,
        sincronizado: true
      });
      if (gastoCreado) {
        gastoCreado = {
          ...gastoCreado,
          ...(data.tarjetaCredito ? { tarjetaCredito: data.tarjetaCredito } : {}),
          cantidadPersonas: paxCount,
          modoCostoPersonas: modoPax,
          costoTotal: finalCostoTotal,
          costoPorPersona: finalCostoPorPersona,
          computarSoloMiParte: isSoloMiParte
        };
      }
    }

    const eventoFinal = deserializeEventoMeta({ ...nuevoEvento, gastoAsociado: gastoCreado });

    return {
      evento: eventoFinal,
      gastoAsociado: gastoCreado,
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  async updateEvento(id, data) {
    const existing = await itinerarioRepository.findById(id);
    if (!existing) {
      throw new Error('Evento no encontrado');
    }

    const currentMeta = deserializeEventoMeta(existing);
    const newHorasEscala = data.horasEscala !== undefined ? data.horasEscala : currentMeta?.horasEscala;
    const newMayor24 = data.escalaMayor24h !== undefined ? data.escalaMayor24h : (newHorasEscala > 24 ? true : currentMeta?.escalaMayor24h);
    const newTipoTrayecto = data.tipoTrayecto !== undefined ? data.tipoTrayecto : currentMeta?.tipoTrayecto;
    const newTramo = data.tramo !== undefined ? data.tramo : currentMeta?.tramo;
    const newRoundTripGroupId = data.roundTripGroupId !== undefined ? data.roundTripGroupId : currentMeta?.roundTripGroupId;
    const newDescontar = data.descontarPresupuesto !== undefined ? Boolean(data.descontarPresupuesto) : (currentMeta?.descontarPresupuesto !== undefined ? currentMeta.descontarPresupuesto : true);
    const newAdelantado = data.pagadoAdelantado !== undefined ? Boolean(data.pagadoAdelantado) : (currentMeta?.pagadoAdelantado !== undefined ? currentMeta.pagadoAdelantado : false);
    const newTarjetaCredito = data.tarjetaCredito !== undefined ? data.tarjetaCredito : currentMeta?.tarjetaCredito;
    const newPaxCount = data.cantidadPersonas !== undefined
      ? Math.max(1, Math.round(Number(data.cantidadPersonas) || 1))
      : Math.max(1, Math.round(Number(currentMeta?.cantidadPersonas) || 1));
    const newModoPax = data.modoCostoPersonas !== undefined ? data.modoCostoPersonas : (currentMeta?.modoCostoPersonas || 'total');
    const newSoloMiParte = data.computarSoloMiParte !== undefined
      ? Boolean(data.computarSoloMiParte)
      : (currentMeta?.computarSoloMiParte !== undefined ? Boolean(currentMeta.computarSoloMiParte) : true);
    const rawNotas = data.notas !== undefined ? data.notas : currentMeta?.notas;

    const rawCostoVal = data.costo !== undefined ? Number(data.costo || 0) : Number(existing.costo || 0);
    let finalCostoTotal = data.costoTotal !== undefined && Number(data.costoTotal) > 0
      ? Number(data.costoTotal)
      : (newModoPax === 'por_persona' && newPaxCount > 1 && data.costoPorPersona === undefined
        ? Number((rawCostoVal * newPaxCount).toFixed(2))
        : rawCostoVal);
    let finalCostoPorPersona = data.costoPorPersona !== undefined && Number(data.costoPorPersona) > 0
      ? Number(data.costoPorPersona)
      : (newPaxCount > 1 ? Number((finalCostoTotal / newPaxCount).toFixed(2)) : finalCostoTotal);

    let startDate = data.fechaInicio ? new Date(data.fechaInicio) : existing.fechaInicio;
    let endDate = data.fechaFin ? new Date(data.fechaFin) : existing.fechaFin;

    const conflicts = await this.checkConflicts(existing.viajeId, startDate, endDate, id);

    const dataPrisma = { ...data };
    delete dataPrisma.horasEscala;
    delete dataPrisma.escalaMayor24h;
    delete dataPrisma.tipoTrayecto;
    delete dataPrisma.tramo;
    delete dataPrisma.roundTripGroupId;
    delete dataPrisma.descontarPresupuesto;
    delete dataPrisma.pagadoAdelantado;
    delete dataPrisma.tarjetaCredito;
    delete dataPrisma.cantidadPersonas;
    delete dataPrisma.modoCostoPersonas;
    delete dataPrisma.costoTotal;
    delete dataPrisma.costoPorPersona;
    delete dataPrisma.computarSoloMiParte;
    dataPrisma.notas = serializeEventoMeta(rawNotas, {
      horasEscala: newHorasEscala,
      escalaMayor24h: newMayor24,
      tipoTrayecto: newTipoTrayecto,
      tramo: newTramo,
      roundTripGroupId: newRoundTripGroupId,
      descontarPresupuesto: newDescontar,
      pagadoAdelantado: newAdelantado,
      tarjetaCredito: newTarjetaCredito || undefined,
      cantidadPersonas: newPaxCount,
      modoCostoPersonas: newModoPax,
      costoTotal: finalCostoTotal > 0 ? finalCostoTotal : undefined,
      costoPorPersona: finalCostoPorPersona > 0 ? finalCostoPorPersona : undefined,
      computarSoloMiParte: newSoloMiParte
    });
    dataPrisma.fechaInicio = startDate;
    dataPrisma.fechaFin = endDate;
    if (data.costo !== undefined || data.costoTotal !== undefined) {
      dataPrisma.costo = finalCostoTotal > 0 ? finalCostoTotal : null;
    }

    const updated = await itinerarioRepository.update(id, dataPrisma);

    // Sincronizar con gasto asociado si existe, o crearlo si se introdujo costo
    const costoFinal = finalCostoTotal;
    const tipoFinal = data.tipo || existing.tipo;
    const categoriaFinal = mapTipoToCategoriaGasto(tipoFinal);

    const gastoExistente = await gastosRepository.findByEventoId(id);

    let gastoSincronizado = null;
    if (gastoExistente) {
      const montoOriginal = costoFinal;
      const monedaOriginal = (data.moneda || gastoExistente.monedaOriginal || 'COP').toUpperCase();
      const updateGastoData = {
        montoOriginal,
        monedaOriginal,
        categoria: categoriaFinal,
        montoCOP: convertCurrency(montoOriginal, monedaOriginal, 'COP'),
        montoUSD: convertCurrency(montoOriginal, monedaOriginal, 'USD'),
        concepto: `${tipoFinal ? tipoFinal.toUpperCase() + ': ' : ''}${data.titulo || updated.titulo}`,
        pagadoAdelantado: newAdelantado,
        noComputar: !newDescontar
      };
      gastoSincronizado = await gastosRepository.update(gastoExistente.id, updateGastoData);
      if (gastoSincronizado) {
        gastoSincronizado = {
          ...gastoSincronizado,
          ...(newTarjetaCredito ? { tarjetaCredito: newTarjetaCredito } : {}),
          cantidadPersonas: newPaxCount,
          modoCostoPersonas: newModoPax,
          costoTotal: finalCostoTotal,
          costoPorPersona: finalCostoPorPersona,
          computarSoloMiParte: newSoloMiParte
        };
      }
    } else if (costoFinal > 0) {
      const monedaOriginal = (data.moneda || existing.moneda || 'COP').toUpperCase();
      const montoCOP = convertCurrency(costoFinal, monedaOriginal, 'COP');
      const montoUSD = convertCurrency(costoFinal, monedaOriginal, 'USD');
      gastoSincronizado = await gastosRepository.create({
        viajeId: existing.viajeId,
        eventoId: id,
        concepto: `${tipoFinal ? tipoFinal.toUpperCase() + ': ' : ''}${data.titulo || updated.titulo}`,
        categoria: categoriaFinal,
        montoOriginal: costoFinal,
        monedaOriginal,
        montoCOP,
        montoUSD,
        fechaGasto: startDate,
        pagadoAdelantado: newAdelantado,
        noComputar: !newDescontar,
        esIngreso: false,
        sincronizado: true
      });
      if (gastoSincronizado) {
        gastoSincronizado = {
          ...gastoSincronizado,
          ...(newTarjetaCredito ? { tarjetaCredito: newTarjetaCredito } : {}),
          cantidadPersonas: newPaxCount,
          modoCostoPersonas: newModoPax,
          costoTotal: finalCostoTotal,
          costoPorPersona: finalCostoPorPersona,
          computarSoloMiParte: newSoloMiParte
        };
      }
    }

    const eventoFinal = {
      ...updated,
      tipo: tipoFinal,
      ...(gastoSincronizado ? { gastoAsociado: gastoSincronizado } : {})
    };

    return {
      evento: deserializeEventoMeta(eventoFinal),
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  async deleteEvento(id) {
    // Si tiene un gasto asociado, se actualiza o soft-delete
    const gasto = await gastosRepository.findByEventoId(id);
    if (gasto) {
      await gastosRepository.delete(gasto.id);
    }
    return itinerarioRepository.delete(id);
  }
}

const itinerarioServiceInstance = new ItinerarioService();
itinerarioServiceInstance.deserializeEventoMeta = deserializeEventoMeta;
itinerarioServiceInstance.serializeEventoMeta = serializeEventoMeta;

module.exports = itinerarioServiceInstance;
