const { z } = require('zod');

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'Identificador inválido');
const idParams = z.object({ id: docId });
const skillId = z.string().regex(/^[a-z0-9-]{1,60}$/, 'Identificador de habilidad inválido');

const availabilitySlot = z
  .object({
    day: z.number().int().min(0).max(6),
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
  requestListSchema,
  userSearchSchema,
};