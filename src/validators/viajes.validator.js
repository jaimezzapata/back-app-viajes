const { z } = require('zod');

const categoriaPresupuestoItem = z.object({
  categoria: z
    .string({ required_error: 'La categoría es obligatoria' })
    .trim()
    .min(1, 'La categoría no puede estar vacía'),
  limite: z
    .coerce
    .number({ invalid_type_error: 'El límite debe ser un número' })
    .min(0, 'El límite no puede ser negativo')
});

const createViajeSchema = z.object({
  usuarioId: z.string().trim().optional().nullable(),
  titulo: z
    .string({ required_error: 'El título del viaje es obligatorio' })
    .trim()
    .min(1, 'El título del viaje no puede estar vacío'),
  tipoViaje: z.enum(['unico', 'multidestino']).optional().default('unico'),
  descripcion: z.string().trim().optional().nullable(),
  origen: z.string().trim().optional().nullable(),
  destino: z
    .string({ required_error: 'El destino es obligatorio' })
    .trim()
    .min(1, 'El destino no puede estar vacío'),
  escalas: z.string().trim().optional().nullable(),
  destinosMultidestino: z.array(z.any()).optional().nullable(),
  fechaInicio: z
    .string({ required_error: 'La fecha de inicio es obligatoria' })
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de inicio no es válida' }),
  fechaFin: z
    .string({ required_error: 'La fecha de fin es obligatoria' })
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de fin no es válida' }),
  presupuestoTotal: z
    .coerce
    .number({ invalid_type_error: 'El presupuesto total debe ser numérico' })
    .min(0, 'El presupuesto total no puede ser negativo')
    .default(0),
  monedaBase: z
    .string()
    .trim()
    .min(3, 'La moneda base debe tener 3 caracteres')
    .max(3, 'La moneda base debe tener 3 caracteres')
    .toUpperCase()
    .default('COP'),
  monedaReferencia: z
    .string()
    .trim()
    .min(3, 'La moneda de referencia debe tener 3 caracteres')
    .max(3, 'La moneda de referencia debe tener 3 caracteres')
    .toUpperCase()
    .default('USD'),
  monedaLocal: z
    .string()
    .trim()
    .min(3, 'La moneda local debe tener 3 caracteres')
    .max(3, 'La moneda local debe tener 3 caracteres')
    .toUpperCase()
    .default('USD'),
  presupuestosPorCategoria: z.array(categoriaPresupuestoItem).optional()
}).refine(data => new Date(data.fechaFin) >= new Date(data.fechaInicio), {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['fechaFin']
});

const updateViajeSchema = z.object({
  usuarioId: z.string().trim().optional().nullable(),
  titulo: z.string().trim().min(1, 'El título no puede estar vacío').optional(),
  tipoViaje: z.enum(['unico', 'multidestino']).optional(),
  descripcion: z.string().trim().optional().nullable(),
  origen: z.string().trim().optional().nullable(),
  destino: z.string().trim().min(1, 'El destino no puede estar vacío').optional(),
  escalas: z.string().trim().optional().nullable(),
  destinosMultidestino: z.array(z.any()).optional().nullable(),
  fechaInicio: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de inicio no es válida' })
    .optional(),
  fechaFin: z
    .string()
    .trim()
    .refine(val => !isNaN(Date.parse(val)), { message: 'La fecha de fin no es válida' })
    .optional(),
  presupuestoTotal: z
    .coerce
    .number({ invalid_type_error: 'El presupuesto total debe ser numérico' })
    .min(0, 'El presupuesto no puede ser negativo')
    .optional(),
  monedaBase: z.string().trim().length(3, 'Debe ser de 3 caracteres').toUpperCase().optional(),
  monedaReferencia: z.string().trim().length(3, 'Debe ser de 3 caracteres').toUpperCase().optional(),
  monedaLocal: z.string().trim().length(3, 'Debe ser de 3 caracteres').toUpperCase().optional(),
  presupuestosPorCategoria: z.array(categoriaPresupuestoItem).optional()
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
  createViajeSchema,
  updateViajeSchema
};
