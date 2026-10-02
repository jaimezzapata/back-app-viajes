const { prisma } = require('../config/prisma');

class ViajesRepository {
  async findAll(usuarioId = null) {
    const where = {};
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
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
