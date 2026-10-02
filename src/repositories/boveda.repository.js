const { prisma } = require('../config/prisma');

class BovedaRepository {
  async findByViajeId(viajeId) {
    return prisma.documentoBoveda.findMany({
      where: { viajeId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id) {
    return prisma.documentoBoveda.findFirst({
      where: { id }
    });
  }

  async create(data) {
    return prisma.documentoBoveda.create({
      data
    });
  }

  async update(id, data) {
    return prisma.documentoBoveda.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.documentoBoveda.delete({
      where: { id }
    });
  }
}

module.exports = new BovedaRepository();
