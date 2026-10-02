const bovedaRepository = require('../repositories/boveda.repository');

const MAX_BYTES = 2 * 1024 * 1024; // 2MB máximo (RF 3.3)

class BovedaService {
  async getDocumentosByViaje(viajeId) {
    return bovedaRepository.findByViajeId(viajeId);
  }

  async getDocumentoById(id) {
    const doc = await bovedaRepository.findById(id);
    if (!doc) {
      throw new Error('Documento no encontrado');
    }
    return doc;
  }

  async createDocumento(data) {
    const { viajeId, titulo, tipo, archivoUrl, archivoBase64, mimeType, tamanoBytes, notas } = data;

    // Validación de tamaño máximo 2MB según RF 3.3
    if (tamanoBytes && tamanoBytes > MAX_BYTES) {
      throw new Error(`El archivo excede el tamaño máximo permitido de 2MB (${(tamanoBytes / (1024 * 1024)).toFixed(2)}MB)`);
    }

    if (archivoBase64) {
      // Estimar tamaño en bytes si viene en base64
      const estimatedBytes = Math.round((archivoBase64.length * 3) / 4);
      if (estimatedBytes > MAX_BYTES) {
        throw new Error('El archivo excede el tamaño máximo permitido de 2MB.');
      }
    }

    return bovedaRepository.create({
      viajeId,
      titulo,
      tipo: tipo || 'otro',
      archivoUrl,
      archivoBase64,
      mimeType,
      tamanoBytes,
      notas
    });
  }

  async updateDocumento(id, data) {
    return bovedaRepository.update(id, data);
  }

  async deleteDocumento(id) {
    return bovedaRepository.delete(id);
  }
}

module.exports = new BovedaService();
