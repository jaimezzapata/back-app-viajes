const { z } = require('zod');

const CATEGORIAS_VALIDAS = ['transporte', 'alojamiento', 'comida', 'actividades', 'compras', 'otros'];

const createGastoSchema = z.object({
  concepto: z
    .string({ required_error: 'El concepto del gasto es obligatorio' })
    .trim()
    .min(1, 'El concepto no puede estar vacío'),
  categoria: z
    .string({ required_error: 'La categoría es obligatoria' })
    .trim()
    .toLowerCase()
    .refine(val => CATEGORIAS_VALIDAS.includes(val), {
      message: `La categoría debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}`
    }),
  montoOriginal: z
    .coerce
    .number({ invalid_type_error: 'El monto debe ser numérico', required_error: 'El monto es obligatorio' })
    .gt(0, 'El monto debe ser mayor a 0'),
  monedaOriginal: z
    .string({ required_error: 'La moneda original es obligatoria' })
    .trim()
    .length(3, 'El código de moneda debe tener 3 caracteres')
    .toUpperCase(),
  tasaCambioFecha: z
    .coerce
    .number()
    .gt(0, 'La tasa de cambio debe ser positiva')
    .optional()
    .nullable(),
  conversionPendiente: z.coerce.boolean().optional().default(false),
  fechaGasto: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha del gasto no es válida' })
    .optional(),
  timestampReal: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'El timestamp real no es válido' })
    .optional(),
  pagadoAdelantado: z.coerce.boolean().optional().default(false),
  noComputar: z.coerce.boolean().optional().default(false),
  esIngreso: z.coerce.boolean().optional().default(false),
  sincronizado: z.coerce.boolean().optional().default(true)
});

const updateGastoSchema = z.object({
  concepto: z.string().trim().min(1, 'El concepto no puede estar vacío').optional(),
  categoria: z
    .string()
    .trim()
    .toLowerCase()
    .refine(val => CATEGORIAS_VALIDAS.includes(val), {
      message: `La categoría debe ser una de: ${CATEGORIAS_VALIDAS.join(', ')}`
    })
    .optional(),
  montoOriginal: z
    .coerce
    .number({ invalid_type_error: 'El monto debe ser numérico' })
    .gt(0, 'El monto debe ser mayor a 0')
    .optional(),
  monedaOriginal: z
    .string()
    .trim()
    .length(3, 'El código de moneda debe tener 3 caracteres')
    .toUpperCase()
    .optional(),
  tasaCambioFecha: z
    .coerce
    .number()
    .gt(0, 'La tasa de cambio debe ser positiva')
    .optional()
    .nullable(),
  conversionPendiente: z.coerce.boolean().optional(),
  fechaGasto: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha del gasto no es válida' })
    .optional(),
  timestampReal: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'El timestamp real no es válido' })
    .optional(),
  pagadoAdelantado: z.coerce.boolean().optional(),
  noComputar: z.coerce.boolean().optional(),
  esIngreso: z.coerce.boolean().optional(),
  sincronizado: z.coerce.boolean().optional()
});

module.exports = {
  createGastoSchema,
  updateGastoSchema
};
