const { z } = require('zod');

const registerSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre no puede estar vacío'),
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .min(1, 'El correo no puede estar vacío')
    .email('El formato del correo electrónico no es válido')
    .toLowerCase()
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .min(1, 'El correo no puede estar vacío')
    .email('El formato del correo electrónico no es válido')
    .toLowerCase()
});

const loginOrRegisterSchema = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .min(1, 'El correo no puede estar vacío')
    .email('El formato del correo electrónico no es válido')
    .toLowerCase(),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre no puede estar vacío si se proporciona')
    .optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  loginOrRegisterSchema
};
