const { prisma } = require('../config/prisma');

class GastosRepository {
  async findByViajeId(viajeId) {
    return prisma.gasto.findMany({
      where: { viajeId },
      orderBy: { fechaGasto: 'desc' },
      include: {
        evento: true
      }
    });
  }

  async findById(id) {
    return prisma.gasto.findFirst({
      where: { id },
      include: {
        evento: true
      }
    });
  }

  async create(data) {
    return prisma.gasto.create({
      data
    });
  }

  async update(id, data) {
    return prisma.gasto.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.gasto.delete({
      where: { id }
    });
  }

  async findByEventoId(eventoId) {
    return prisma.gasto.findFirst({
      where: { eventoId }
    });
  }
}

module.exports = new GastosRepository();
