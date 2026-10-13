const { prisma } = require('../config/prisma');

class ViajesRepository {
  async findAll(usuarioId = null, email = null) {
    let resolvedUserId = null;

    // 1. Si se provee email, resolver siempre el usuario canónico registrado con ese correo
    if (email && typeof email === 'string') {
      const user = await prisma.usuario.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true }
      }).catch(() => null);
      if (user) {
        resolvedUserId = user.id;
      }
    }

    // 2. Si no se resolvió por email y vino usuarioId UUID, validar que realmente exista en BD
    if (!resolvedUserId && usuarioId && typeof usuarioId === 'string') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId);
      if (isUuid) {
        const user = await prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true }
        }).catch(() => null);
        if (user) {
          resolvedUserId = user.id;
        }
      }
    }

    // Aislamiento estricto de privacidad: si no hay un usuario autenticado identificado, no se retornan viajes
    if (!resolvedUserId) {
      return [];
    }

    return prisma.viaje.findMany({
      where: { usuarioId: resolvedUserId },
      orderBy: { fechaInicio: 'desc' },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true }
        },
        _count: {
          select: {
            itinerarios: true,
            gastos: true,
            documentos: true
          }
        }
      }
    });
  }

  async findById(id) {
    return prisma.viaje.findFirst({
      where: { id },
      include: {
        presupuestos: true,
        itinerarios: {
          orderBy: { fechaInicio: 'asc' }
        },
        gastos: {
          orderBy: { fechaGasto: 'desc' }
        },
        documentos: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async create(data) {
    return prisma.viaje.create({
      data
    });
  }

  async update(id, data) {
    return prisma.viaje.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    // Interceptado por soft-delete extension
    return prisma.viaje.delete({
      where: { id }
    });
  }
}

module.exports = new ViajesRepository();
