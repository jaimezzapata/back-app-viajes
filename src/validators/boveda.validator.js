const { z } = require('zod');

const MAX_BYTES = 2 * 1024 * 1024; // 2MB máximo (RF 3.3)

const createDocumentoSchema = z.object({
  titulo: z
    .string({ required_error: 'El título del documento es obligatorio' })
    .trim()
    .min(1, 'El título del documento no puede estar vacío'),
  tipo: z
    .string()
    .trim()
    .default('otro'),
  archivoUrl: z.string().trim().optional().nullable(),
  archivoBase64: z.string().trim().optional().nullable(),
  mimeType: z.string().trim().optional().nullable(),
  tamanoBytes: z
    .coerce
    .number()
    .max(MAX_BYTES, 'El documento excede el límite máximo de 2MB')
    .optional()
    .nullable(),
  notas: z.string().trim().optional().nullable()
}).refine(data => data.archivoUrl || data.archivoBase64, {
  message: 'Debe proporcionar al menos un archivoUrl o archivoBase64',
  path: ['archivoUrl']
});

const updateDocumentoSchema = z.object({
  titulo: z.string().trim().min(1, 'El título no puede estar vacío').optional(),
  tipo: z.string().trim().optional(),
  archivoUrl: z.string().trim().optional().nullable(),
  archivoBase64: z.string().trim().optional().nullable(),
  mimeType: z.string().trim().optional().nullable(),
  tamanoBytes: z
    .coerce
    .number()
    .max(MAX_BYTES, 'El documento excede el límite máximo de 2MB')
    .optional()
    .nullable(),
  notas: z.string().trim().optional().nullable()
});

module.exports = {
  createDocumentoSchema,
  updateDocumentoSchema
};
