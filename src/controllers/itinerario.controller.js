const itinerarioService = require('../services/itinerario.service');

class ItinerarioController {
  async getByViaje(req, res, next) {
    try {
      const { viajeId } = req.params;
      const eventos = await itinerarioService.getEventosByViaje(viajeId);
      res.json({ ok: true, data: eventos });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { viajeId } = req.params;
      const result = await itinerarioService.createEvento({
        ...req.body,
        viajeId
      });
      res.status(201).json({
        ok: true,
        data: result.evento,
        gastoAsociado: result.gastoAsociado,
        hasConflicts: result.hasConflicts,
        conflicts: result.conflicts
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const result = await itinerarioService.updateEvento(id, req.body);
      res.json({
        ok: true,
        data: result.evento,
        hasConflicts: result.hasConflicts,
        conflicts: result.conflicts
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await itinerarioService.deleteEvento(id);
      res.json({ ok: true, message: 'Evento eliminado exitosamente (Soft Delete)' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ItinerarioController();
