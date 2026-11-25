const { z } = require('zod');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// Identificador de documento seguro: evita rutas como "a/b" que romperían db.doc().
const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'Identificador inválido');
const idParams = z.object({ id: docId });
const skillId = z.string().regex(/^[a-z0-9-]{1,60}$/, 'Identificador de habilidad inválido');

const availabilitySlot = z
  .object({
    day: z.number().int().min(0).max(6), // 0 = domingo ... 6 = sábado
    start: z.string().regex(HHMM, 'Formato HH:MM'),
    end: z.string().regex(HHMM, 'Formato HH:MM'),
  })
  .refine((s) => s.start < s.end, { message: 'La hora de inicio debe ser menor que la de fin' });

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60),
  bio: z.string().trim().max(500).default(''),
  offeredSkills: z
    .array(z.object({ skillId, level: z.enum(['beginner', 'intermediate', 'advanced']) }))
    .max(20)
    .default([]),
  wantedSkills: z.array(skillId).max(20).default([]),
  availability: z.array(availabilitySlot).max(21).default([]),
});

const DURATIONS = [30, 60, 90, 120];

const requestCreateSchema = z.object({
  skillId,
  description: z.string().trim().min(10, 'Describe qué quieres aprender (mínimo 10 caracteres)').max(500),
  durationMinutes: z.number().int().refine((n) => DURATIONS.includes(n), 'Duración permitida: 30, 60, 90 o 120').default(60),
});

const requestUpdateSchema = z
  .object({
    description: z.string().trim().min(10).max(500).optional(),
    durationMinutes: z.number().int().refine((n) => DURATIONS.includes(n), 'Duración permitida: 30, 60, 90 o 120').optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Envía al menos un campo a modificar' });

const sessionCreateSchema = z.object({
  teacherId: docId,
  skillId,
  startAt: z.string().datetime({ offset: true, message: 'Fecha inválida (usa formato ISO 8601)' }).transform((s) => new Date(s)),
  durationMinutes: z.number().int().refine((n) => DURATIONS.includes(n), 'Duración permitida: 30, 60, 90 o 120'),
  requestId: docId.optional(),
  notes: z.string().trim().max(300).default(''),
});

const sessionListSchema = z.object({
  as: z.enum(['teacher', 'learner']).optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed']).optional(),
});

const sessionActionParams = z.object({
  id: docId,
  action: z.enum(['accept', 'reject', 'cancel', 'confirm']),
});

const skillSchema = z.object({
  id: skillId,
  name: z.string().trim().min(2).max(60),
  category: z.string().trim().min(2).max(40),
});
const skillUpdateSchema = skillSchema.omit({ id: true });

const adminUserPatchSchema = z
  .object({ role: z.enum(['member', 'admin']).optional(), disabled: z.boolean().optional() })
  .refine((o) => Object.keys(o).length > 0, { message: 'Envía role y/o disabled' });

const matchesQuerySchema = z.object({ skillId });

const transactionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const userSearchSchema = z.object({
  offers: skillId.optional(),
  wants: skillId.optional(),
});

const requestListSchema = z.object({
  status: z.enum(['open', 'matched', 'fulfilled', 'cancelled']).optional(),
  skillId: skillId.optional(),
  mine: z.enum(['true', 'false']).optional(),
});

module.exports = {
  docId,
  idParams,
  skillId,
  DURATIONS,
  profileSchema,
  requestCreateSchema,
  requestUpdateSchema,
  requestListSchema,
  sessionCreateSchema,
  sessionListSchema,
  sessionActionParams,
  skillSchema,
  skillUpdateSchema,
  adminUserPatchSchema,
  matchesQuerySchema,
  transactionsQuerySchema,
  userSearchSchema,
};