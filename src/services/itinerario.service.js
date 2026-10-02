const itinerarioRepository = require('../repositories/itinerario.repository');
const gastosRepository = require('../repositories/gastos.repository');
const { convertCurrency } = require('../utils/currency');

function serializeEventoMeta(notas, extraMeta = {}) {
  const meta = typeof extraMeta === 'object' && extraMeta !== null ? { ...extraMeta } : {};
  if (meta.horasEscala !== undefined && meta.horasEscala !== null) meta.horasEscala = Number(meta.horasEscala);
  if (meta.escalaMayor24h !== undefined && meta.escalaMayor24h !== null) meta.escalaMayor24h = Boolean(meta.escalaMayor24h);
  
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
  let notas = evento.notas || null;

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
      } catch {}
      notas = notas.replace(/\n?<!--META:.*?:META-->/g, '').trim() || null;
    }
  }

  // Si no tenía flag pero tiene horasEscala, deducir si es > 24
  if (horasEscala !== null && horasEscala > 24) {
    escalaMayor24h = true;
  }

  return {
    ...evento,
    notas,
    horasEscala,
    escalaMayor24h,
    tipoTrayecto,
    tramo,
    roundTripGroupId
  };
}

class ItinerarioService {
  async getEventosByViaje(viajeId) {
    const eventos = await itinerarioRepository.findByViajeId(viajeId);
    return eventos.map(deserializeEventoMeta);
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
    let { fechaInicio, fechaFin, costo, moneda, viajeId, titulo, tipo, horasEscala, escalaMayor24h, tipoTrayecto, tramo, roundTripGroupId, notas } = data;

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
    const notasConMeta = serializeEventoMeta(notas, {
      horasEscala,
      escalaMayor24h: isMayor24,
      tipoTrayecto: tipoTrayecto || (tipo === 'vuelo' ? 'one-way' : undefined),
      tramo,
      roundTripGroupId
    });

    const dataPrisma = { ...data };
    delete dataPrisma.horasEscala;
    delete dataPrisma.escalaMayor24h;
    delete dataPrisma.tipoTrayecto;
    delete dataPrisma.tramo;
    delete dataPrisma.roundTripGroupId;
    dataPrisma.notas = notasConMeta;
    dataPrisma.fechaInicio = startDate;
    dataPrisma.fechaFin = endDate;
    dataPrisma.costo = costo ? Number(costo) : null;

    // Guardar evento
    const nuevoEvento = await itinerarioRepository.create(dataPrisma);

    // Interoperabilidad con Módulo de Gastos (RF 3.2)
    let gastoCreado = null;
    if (costo && Number(costo) > 0) {
      const monedaOriginal = (moneda || 'COP').toUpperCase();
      const montoOriginal = Number(costo);
      const montoCOP = convertCurrency(montoOriginal, monedaOriginal, 'COP');
      const montoUSD = convertCurrency(montoOriginal, monedaOriginal, 'USD');

      gastoCreado = await gastosRepository.create({
        viajeId,
        eventoId: nuevoEvento.id,
        concepto: `${tipo ? tipo.toUpperCase() + ': ' : ''}${titulo}`,
        categoria: tipo === 'hotel' ? 'alojamiento' : (tipo === 'vuelo' || tipo === 'transporte' ? 'transporte' : 'actividades'),
        montoOriginal,
        monedaOriginal,
        montoCOP,
        montoUSD,
        fechaGasto: startDate,
        pagadoAdelantado: false,
        noComputar: false,
        esIngreso: false,
        sincronizado: true
      });
    }

    return {
      evento: deserializeEventoMeta(nuevoEvento),
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
    const rawNotas = data.notas !== undefined ? data.notas : currentMeta?.notas;

    let startDate = data.fechaInicio ? new Date(data.fechaInicio) : existing.fechaInicio;
    let endDate = data.fechaFin ? new Date(data.fechaFin) : existing.fechaFin;

    const conflicts = await this.checkConflicts(existing.viajeId, startDate, endDate, id);

    const dataPrisma = { ...data };
    delete dataPrisma.horasEscala;
    delete dataPrisma.escalaMayor24h;
    delete dataPrisma.tipoTrayecto;
    delete dataPrisma.tramo;
    delete dataPrisma.roundTripGroupId;
    dataPrisma.notas = serializeEventoMeta(rawNotas, {
      horasEscala: newHorasEscala,
      escalaMayor24h: newMayor24,
      tipoTrayecto: newTipoTrayecto,
      tramo: newTramo,
      roundTripGroupId: newRoundTripGroupId
    });
    dataPrisma.fechaInicio = startDate;
    dataPrisma.fechaFin = endDate;
    if (data.costo !== undefined) {
      dataPrisma.costo = data.costo ? Number(data.costo) : null;
    }

    const updated = await itinerarioRepository.update(id, dataPrisma);

    // Sincronizar con gasto asociado si existe
    if (data.costo !== undefined) {
      const gastoExistente = await gastosRepository.findByEventoId(id);
      if (gastoExistente) {
        const montoOriginal = Number(data.costo || 0);
        const monedaOriginal = data.moneda || gastoExistente.monedaOriginal;
        await gastosRepository.update(gastoExistente.id, {
          montoOriginal,
          monedaOriginal,
          montoCOP: convertCurrency(montoOriginal, monedaOriginal, 'COP'),
          montoUSD: convertCurrency(montoOriginal, monedaOriginal, 'USD'),
          concepto: `${data.tipo ? data.tipo.toUpperCase() + ': ' : ''}${data.titulo || updated.titulo}`
        });
      }
    }

    return {
      evento: deserializeEventoMeta(updated),
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

module.exports = new ItinerarioService();
