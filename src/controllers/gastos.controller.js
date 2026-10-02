const gastosService = require('../services/gastos.service');

class GastosController {
  async getByViaje(req, res, next) {
    try {
      const { viajeId } = req.params;
      const gastos = await gastosService.getGastosByViaje(viajeId);
      res.json({ ok: true, data: gastos });
    } catch (err) {
      next(err);
    }
  }

  async getBalance(req, res, next) {
    try {
      const { viajeId } = req.params;
      const balance = await gastosService.getBalance(viajeId);
      res.json({ ok: true, data: balance });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { viajeId } = req.params;
      const nuevoGasto = await gastosService.createGasto({
        ...req.body,
        viajeId
      });
      res.status(201).json({ ok: true, data: nuevoGasto });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const gastoActualizado = await gastosService.updateGasto(id, req.body);
      res.json({ ok: true, data: gastoActualizado });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await gastosService.deleteGasto(id);
      res.json({ ok: true, message: 'Gasto eliminado exitosamente (Soft Delete)' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GastosController();
