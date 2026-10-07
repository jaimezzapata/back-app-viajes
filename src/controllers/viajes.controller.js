const viajesService = require('../services/viajes.service');

class ViajesController {
  async getAll(req, res, next) {
    try {
      const { usuarioId, email } = req.query;
      const viajes = await viajesService.getAllViajes(usuarioId, email);
      res.json({ ok: true, data: viajes });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const viaje = await viajesService.getViajeById(id);
      res.json({ ok: true, data: viaje });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const nuevoViaje = await viajesService.createViaje(req.body);
      res.status(201).json({ ok: true, data: nuevoViaje });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const viajeActualizado = await viajesService.updateViaje(id, req.body);
      res.json({ ok: true, data: viajeActualizado });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await viajesService.deleteViaje(id);
      res.json({ ok: true, message: 'Viaje eliminado exitosamente (Soft Delete)' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ViajesController();
