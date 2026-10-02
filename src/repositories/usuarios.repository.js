const { prisma } = require('../config/prisma');

class UsuariosRepository {
  async findByEmail(email) {
    if (!email) return null;
    return prisma.usuario.findFirst({
      where: { email: email.trim().toLowerCase() }
    });
  }

  async findById(id) {
    return prisma.usuario.findFirst({
      where: { id },
      include: {
        viajes: {
          orderBy: { fechaInicio: 'desc' }
        }
      }
    });
  }

  async create(data) {
    return prisma.usuario.create({
      data: {
        nombre: data.nombre.trim(),
        email: data.email.trim().toLowerCase()
      }
    });
  }

  async findAll() {
    return prisma.usuario.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new UsuariosRepository();
