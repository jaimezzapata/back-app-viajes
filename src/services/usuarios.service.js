const usuariosRepository = require('../repositories/usuarios.repository');

class UsuariosService {
  /**
   * Registro simple: solo nombre y correo sin contraseñas ni hash
   */
  async register({ nombre, email }) {
    if (!email) {
      throw new Error('El correo electrónico es obligatorio');
    }
    if (!nombre) {
      throw new Error('El nombre de usuario es obligatorio');
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await usuariosRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new Error('Ya existe un usuario con este correo electrónico');
    }

    return usuariosRepository.create({
      nombre: nombre.trim(),
      email: cleanEmail
    });
  }

  /**
   * Login simple: valida por correo
   */
  async login(email) {
    if (!email) {
      throw new Error('El correo electrónico es obligatorio');
    }

    const cleanEmail = email.trim().toLowerCase();
    const usuario = await usuariosRepository.findByEmail(cleanEmail);
    if (!usuario) {
      throw new Error('Usuario no encontrado con ese correo electrónico');
    }

    return usuario;
  }

  /**
   * Login o Registro automático en un solo paso:
   * Si el usuario existe lo retorna, si no existe lo crea con el nombre y correo suministrados.
   */
  async loginOrRegister({ nombre, email }) {
    if (!email) {
      throw new Error('El correo electrónico es obligatorio');
    }

    const cleanEmail = email.trim().toLowerCase();
    let usuario = await usuariosRepository.findByEmail(cleanEmail);

    if (!usuario) {
      usuario = await usuariosRepository.create({
        nombre: (nombre && nombre.trim()) ? nombre.trim() : cleanEmail.split('@')[0],
        email: cleanEmail
      });
    }

    return usuario;
  }

  async getProfile(id) {
    const usuario = await usuariosRepository.findById(id);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }
    return usuario;
  }

  async getAll() {
    return usuariosRepository.findAll();
  }
}

module.exports = new UsuariosService();
