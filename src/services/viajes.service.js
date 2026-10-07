const viajesRepository = require('../repositories/viajes.repository');
const { prisma } = require('../config/prisma');

function serializeViajeMeta(descripcion, origen, escalas, tipoViaje, destinosMultidestino) {
  const meta = {};
  if (origen) meta.origen = origen;
  if (escalas) meta.escalas = escalas;
  if (tipoViaje) meta.tipoViaje = tipoViaje;
  if (destinosMultidestino && Array.isArray(destinosMultidestino)) meta.destinosMultidestino = destinosMultidestino;

  if (Object.keys(meta).length === 0) return descripcion || null;
  const metaTag = `\n<!--META:${JSON.stringify(meta)}:META-->`;
  const cleanDesc = (descripcion || '').replace(/\n?<!--META:.*?:META-->/g, '').trim();
  return cleanDesc ? `${cleanDesc}${metaTag}` : metaTag;
}

function deserializeViajeMeta(viaje) {
  if (!viaje) return viaje;
  let origen = viaje.origen || null;
  let escalas = viaje.escalas || null;
  let tipoViaje = viaje.tipoViaje || 'unico';
  let destinosMultidestino = viaje.destinosMultidestino || [];
  let descripcion = viaje.descripcion || null;

  if (descripcion && descripcion.includes('<!--META:')) {
    const match = descripcion.match(/<!--META:(.*?):META-->/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        if (!origen && meta.origen) origen = meta.origen;
        if (!escalas && meta.escalas) escalas = meta.escalas;
        if (meta.tipoViaje) tipoViaje = meta.tipoViaje;
        if (meta.destinosMultidestino) destinosMultidestino = meta.destinosMultidestino;
      } catch {}
      descripcion = descripcion.replace(/\n?<!--META:.*?:META-->/g, '').trim() || null;
    }
  }

  return {
    ...viaje,
    descripcion,
    origen,
    escalas,
    tipoViaje,
    destinosMultidestino
  };
}

class ViajesService {
  async getAllViajes(usuarioId = null, email = null) {
    const viajes = await viajesRepository.findAll(usuarioId, email);
    return viajes.map(deserializeViajeMeta);
  }

  async getViajeById(id) {
    const viaje = await viajesRepository.findById(id);
    if (!viaje) {
      throw new Error('Viaje no encontrado');
    }
    return deserializeViajeMeta(viaje);
  }

  async createViaje(data) {
    const {
      usuarioId,
      usuarioEmail,
      titulo,
      tipoViaje,
      descripcion,
      origen,
      destino,
      escalas,
      destinosMultidestino,
      fechaInicio,
      fechaFin,
      presupuestoTotal,
      monedaBase,
      monedaReferencia,
      monedaLocal,
      presupuestosPorCategoria
    } = data;

    const startDate = new Date(fechaInicio);
    const endDate = new Date(fechaFin);

    const descConMeta = serializeViajeMeta(descripcion, origen, escalas, tipoViaje, destinosMultidestino);

    // Validar de forma segura si el usuarioId es un UUID válido y existe en la base de datos
    let validUsuarioId = null;
    if (usuarioId && typeof usuarioId === 'string') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId);
      if (isUuid) {
        const userExists = await prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true }
        }).catch(() => null);
        if (userExists) {
          validUsuarioId = usuarioId;
        }
      }
    }

    // Si no se encontró por usuarioId pero se envió usuarioEmail
    if (!validUsuarioId && (usuarioEmail || (typeof usuarioId === 'string' && usuarioId.includes('@')))) {
      const searchEmail = (usuarioEmail || usuarioId).trim().toLowerCase();
      const userByEmail = await prisma.usuario.findUnique({
        where: { email: searchEmail },
        select: { id: true }
      }).catch(() => null);
      if (userByEmail) {
        validUsuarioId = userByEmail.id;
      }
    }

    const nuevoViaje = await viajesRepository.create({
      usuarioId: validUsuarioId,
      titulo,
      descripcion: descConMeta,
      destino,
      fechaInicio: startDate,
      fechaFin: endDate,
      presupuestoTotal: presupuestoTotal ? Number(presupuestoTotal) : 0,
      monedaBase: monedaBase || 'COP',
      monedaReferencia: monedaReferencia || 'USD',
      monedaLocal: monedaLocal || 'USD'
    });

    // Si se enviaron presupuestos por categoría
    if (presupuestosPorCategoria && Array.isArray(presupuestosPorCategoria)) {
      for (const item of presupuestosPorCategoria) {
        if (item.categoria && item.limite !== undefined) {
          await prisma.presupuestoCategoria.create({
            data: {
              viajeId: nuevoViaje.id,
              categoria: item.categoria,
              limite: Number(item.limite)
            }
          });
        }
      }
    }

    return this.getViajeById(nuevoViaje.id);
  }

  async updateViaje(id, data) {
    const existing = await viajesRepository.findById(id);
    const currentMeta = deserializeViajeMeta(existing);

    const newOrigen = data.origen !== undefined ? data.origen : currentMeta?.origen;
    const newEscalas = data.escalas !== undefined ? data.escalas : currentMeta?.escalas;
    const newTipoViaje = data.tipoViaje !== undefined ? data.tipoViaje : currentMeta?.tipoViaje;
    const newDestinosMultidestino = data.destinosMultidestino !== undefined ? data.destinosMultidestino : currentMeta?.destinosMultidestino;
    const rawDesc = data.descripcion !== undefined ? data.descripcion : currentMeta?.descripcion;

    const updateData = { ...data };
    if (data.fechaInicio) updateData.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaFin) updateData.fechaFin = new Date(data.fechaFin);
    if (data.presupuestoTotal !== undefined) updateData.presupuestoTotal = Number(data.presupuestoTotal);

    updateData.descripcion = serializeViajeMeta(rawDesc, newOrigen, newEscalas, newTipoViaje, newDestinosMultidestino);
    delete updateData.origen;
    delete updateData.escalas;
    delete updateData.tipoViaje;
    delete updateData.destinosMultidestino;
    delete updateData.presupuestosPorCategoria;

    await viajesRepository.update(id, updateData);

    // Actualizar presupuestos por categoría si se proveen
    if (data.presupuestosPorCategoria && Array.isArray(data.presupuestosPorCategoria)) {
      for (const item of data.presupuestosPorCategoria) {
        await prisma.presupuestoCategoria.upsert({
          where: {
            viajeId_categoria: {
              viajeId: id,
              categoria: item.categoria
            }
          },
          update: { limite: Number(item.limite) },
          create: {
            viajeId: id,
            categoria: item.categoria,
            limite: Number(item.limite)
          }
        });
      }
    }

    return this.getViajeById(id);
  }

  async deleteViaje(id) {
    return viajesRepository.delete(id);
  }
}

module.exports = new ViajesService();
