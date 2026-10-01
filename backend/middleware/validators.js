// middleware/validators.js
const { z } = require('zod');

/**
 * Helpers
 */
const CurrencyEnum = z.enum(['COP', 'USD', 'EUR']);

const NameString = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100)
  .trim();

const OptionalDesc = z
  .string()
  .max(500)
  .trim()
  .optional()
  .transform((v) => (typeof v === 'string' ? v : v));

/** ObjectId helper para validar ids de Mongo */
const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'ObjectId inválido');

/**
 * Fecha “amigable”
 * Tu route parsea múltiples formatos (YYYY-MM-DD, YYYY-MM-DDTHH:mm, DD/MM/YYYY, etc.)
 * Así que aquí aceptamos string | Date | null y dejamos que el route lo valide/parsee.
 */
const DateLike = z.union([z.string().trim(), z.date()]);

/**
 * Auth
 */
const registerSchema = z.object({
  name: NameString,
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72),
}).strict();

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(72),
}).strict();

/**
 * Groups - Create
 */
const createGroupSchema = z.object({
  name: NameString,
  description: z.string().max(500).trim().optional().default(''),
  currency: CurrencyEnum.default('COP'),
  isFavorite: z.boolean().optional().default(false),
  inviteEmails: z.array(z.string().email().toLowerCase().trim()).optional().default([]),
}).strict();

/**
 * Groups - Update
 */
const updateGroupSchema = z
  .object({
    name: NameString.optional(),
    description: OptionalDesc,
    currency: CurrencyEnum.optional(),
    isFavorite: z.boolean().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (Object.keys(val).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe enviar al menos un campo para actualizar',
        path: [],
      });
    }
  });

/**
 * Expenses - Create
 * NOTA: `date` y `dueDate` los parsea el route con parseDateLocal()
 */
const createExpenseSchema = z
  .object({
    group: objectId,
    title: z.string().trim().min(2).max(120),
    category: z.string().trim().max(60).optional().default(''),
    amount: z.coerce.number().positive('El monto debe ser mayor que 0'),
    currency: CurrencyEnum.optional().default('COP'),
    date: DateLike.optional(),                // <- relax: string | Date
    dueDate: z.union([DateLike, z.null()]).optional(), // <- NUEVO: opcional y permite null
    paidBy: objectId,
    splitAmong: z.array(objectId).min(1, 'Debe incluir al menos 1 participante'),
    notes: z.string().trim().max(500).optional().default(''),
  })
  .strict();

/**
 * Expenses - Update
 * NOTA: `date` y `dueDate` los parsea el route con parseDateLocal()
 */
const updateExpenseSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    category: z.string().trim().max(60).optional(),
    amount: z.coerce.number().positive('El monto debe ser mayor que 0').optional(),
    currency: CurrencyEnum.optional(),
    date: DateLike.optional(),                        // <- relax
    dueDate: z.union([DateLike, z.null()]).optional(),// <- NUEVO
    paidBy: objectId.optional(),
    splitAmong: z.array(objectId).min(1).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (Object.keys(val).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nada para actualizar',
        path: [],
      });
    }
    if (val.splitAmong && val.splitAmong.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'splitAmong debe tener al menos 1 participante',
        path: ['splitAmong'],
      });
    }
  });

module.exports = {
  // auth
  registerSchema,
  loginSchema,

  // groups
  createGroupSchema,
  updateGroupSchema,

  // expenses
  createExpenseSchema,
  updateExpenseSchema,
};
