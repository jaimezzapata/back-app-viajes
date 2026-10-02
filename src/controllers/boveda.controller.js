const bovedaService = require('../services/boveda.service');

class BovedaController {
  async getByViaje(req, res, next) {
    try {
      const { viajeId } = req.params;
      const docs = await bovedaService.getDocumentosByViaje(viajeId);
      res.json({ ok: true, data: docs });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await bovedaService.getDocumentoById(id);
      res.json({ ok: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { viajeId } = req.params;
      const nuevoDoc = await bovedaService.createDocumento({
        ...req.body,
        viajeId
      });
      res.status(201).json({ ok: true, data: nuevoDoc });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const docActualizado = await bovedaService.updateDocumento(id, req.body);
      res.json({ ok: true, data: docActualizado });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await bovedaService.deleteDocumento(id);
      res.json({ ok: true, message: 'Documento eliminado exitosamente (Soft Delete)' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BovedaController();
