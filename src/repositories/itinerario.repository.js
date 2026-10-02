const { prisma } = require('../config/prisma');

class ItinerarioRepository {
  async findByViajeId(viajeId) {
    return prisma.eventoItinerario.findMany({
      where: { viajeId },
      orderBy: { fechaInicio: 'asc' },
      include: {
        gastoAsociado: true
      }
    });
  }

  async findById(id) {
    return prisma.eventoItinerario.findFirst({
      where: { id },
      include: {
        gastoAsociado: true
      }
    });
  }

  async create(data) {
    return prisma.eventoItinerario.create({
      data
    });
  }

  async update(id, data) {
    return prisma.eventoItinerario.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.eventoItinerario.delete({
      where: { id }
    });
  }
}

module.exports = new ItinerarioRepository();
