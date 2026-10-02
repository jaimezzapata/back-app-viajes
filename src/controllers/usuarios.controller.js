const usuariosService = require('../services/usuarios.service');

class UsuariosController {
  async register(req, res, next) {
    try {
      const { nombre, email } = req.body;
      const nuevoUsuario = await usuariosService.register({ nombre, email });
      res.status(201).json({ ok: true, data: nuevoUsuario });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email } = req.body;
      const usuario = await usuariosService.login(email);
      res.json({ ok: true, data: usuario });
    } catch (err) {
      next(err);
    }
  }

  async loginOrRegister(req, res, next) {
    try {
      const { nombre, email } = req.body;
      const usuario = await usuariosService.loginOrRegister({ nombre, email });
      res.json({ ok: true, data: usuario });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req, res, next) {
    try {
      const { id } = req.params;
      const usuario = await usuariosService.getProfile(id);
      res.json({ ok: true, data: usuario });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const usuarios = await usuariosService.getAll();
      res.json({ ok: true, data: usuarios });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsuariosController();
