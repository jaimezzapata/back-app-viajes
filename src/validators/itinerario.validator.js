const { z } = require('zod');

const TIPOS_VALIDOS = ['vuelo', 'hotel', 'atraccion', 'transporte', 'comida', 'otro'];

const createEventoSchema = z.object({
  titulo: z
    .string({ required_error: 'El título del evento es obligatorio' })
    .trim()
    .min(1, 'El título del evento no puede estar vacío'),
  tipo: z
    .string({ required_error: 'El tipo de evento es obligatorio' })
    .trim()
    .toLowerCase()
    .refine(val => TIPOS_VALIDOS.includes(val), {
      message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`
    }),
  fechaInicio: z
    .string({ required_error: 'La fecha y hora de inicio es obligatoria' })
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de inicio no es válida' }),
  fechaFin: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de fin no es válida' })
    .optional()
    .nullable(),
  ubicacion: z.string().trim().optional().nullable(),
  latitud: z
    .coerce
    .number()
    .min(-90, 'La latitud mínima es -90')
    .max(90, 'La latitud máxima es 90')
    .optional()
    .nullable(),
  longitud: z
    .coerce
    .number()
    .min(-180, 'La longitud mínima es -180')
    .max(180, 'La longitud máxima es 180')
    .optional()
    .nullable(),
  costo: z
    .coerce
    .number({ invalid_type_error: 'El costo debe ser numérico' })
    .min(0, 'El costo no puede ser negativo')
    .optional()
    .nullable(),
  moneda: z
    .string()
    .trim()
    .length(3, 'El código de moneda debe tener 3 caracteres')
    .toUpperCase()
    .optional()
    .nullable(),
  notas: z.string().trim().optional().nullable(),

  // Datos logísticos de vuelo y trayecto
  ciudadOrigen: z.string().trim().optional().nullable(),
  paisOrigen: z.string().trim().optional().nullable(),
  aeropuertoOrigen: z.string().trim().optional().nullable(),
  ciudadDestino: z.string().trim().optional().nullable(),
  paisDestino: z.string().trim().optional().nullable(),
  aeropuertoDestino: z.string().trim().optional().nullable(),
  tieneConexion: z.coerce.boolean().optional().default(false),
  aeropuertoConexion: z.string().trim().optional().nullable(),
  ciudadConexion: z.string().trim().optional().nullable(),
  paisConexion: z.string().trim().optional().nullable(),
  horasEscala: z.coerce.number().min(0).optional().nullable(),
  escalaMayor24h: z.coerce.boolean().optional().default(false),
  tipoTrayecto: z.string().trim().optional().nullable().default('one-way'),
  tramo: z.string().trim().optional().nullable(),
  roundTripGroupId: z.string().trim().optional().nullable()
}).refine(data => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio);
  }
  return true;
}, {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['fechaFin']
});

const updateEventoSchema = z.object({
  titulo: z.string().trim().min(1, 'El título no puede estar vacío').optional(),
  tipo: z
    .string()
    .trim()
    .toLowerCase()
    .refine(val => TIPOS_VALIDOS.includes(val), {
      message: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`
    })
    .optional(),
  fechaInicio: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de inicio no es válida' })
    .optional(),
  fechaFin: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de fin no es válida' })
    .optional()
    .nullable(),
  ubicacion: z.string().trim().optional().nullable(),
  latitud: z
    .coerce
    .number()
    .min(-90, 'La latitud mínima es -90')
    .max(90, 'La latitud máxima es 90')
    .optional()
    .nullable(),
  longitud: z
    .coerce
    .number()
    .min(-180, 'La longitud mínima es -180')
    .max(180, 'La longitud máxima es 180')
    .optional()
    .nullable(),
  costo: z
    .coerce
    .number({ invalid_type_error: 'El costo debe ser numérico' })
    .min(0, 'El costo no puede ser negativo')
    .optional()
    .nullable(),
  moneda: z
    .string()
    .trim()
    .length(3, 'El código de moneda debe tener 3 caracteres')
    .toUpperCase()
    .optional()
    .nullable(),
  notas: z.string().trim().optional().nullable(),

  // Datos logísticos de vuelo y trayecto
  ciudadOrigen: z.string().trim().optional().nullable(),
  paisOrigen: z.string().trim().optional().nullable(),
  aeropuertoOrigen: z.string().trim().optional().nullable(),
  ciudadDestino: z.string().trim().optional().nullable(),
  paisDestino: z.string().trim().optional().nullable(),
  aeropuertoDestino: z.string().trim().optional().nullable(),
  tieneConexion: z.coerce.boolean().optional(),
  aeropuertoConexion: z.string().trim().optional().nullable(),
  ciudadConexion: z.string().trim().optional().nullable(),
  paisConexion: z.string().trim().optional().nullable(),
  horasEscala: z.coerce.number().min(0).optional().nullable(),
  escalaMayor24h: z.coerce.boolean().optional(),
  tipoTrayecto: z.string().trim().optional().nullable(),
  tramo: z.string().trim().optional().nullable(),
  roundTripGroupId: z.string().trim().optional().nullable()
}).refine(data => {
  if (data.fechaInicio && data.fechaFin) {
    return new Date(data.fechaFin) >= new Date(data.fechaInicio);
  }
  return true;
}, {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['fechaFin']
});

module.exports = {
  createEventoSchema,
  updateEventoSchema
};
