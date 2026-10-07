const { prisma } = require('../config/prisma');

class ViajesRepository {
  async findAll(usuarioId = null) {
    const isUuid = usuarioId && typeof usuarioId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(usuarioId);
    const where = isUuid
      ? { OR: [{ usuarioId }, { usuarioId: null }] }
      : {};
    return prisma.viaje.findMany({
      where,
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
