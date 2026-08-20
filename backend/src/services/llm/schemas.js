const { z } = require('zod');

/**
 * Pre-visit: symptom analysis schema
 */
const preVisitSchema = z.object({
  urgency: z.enum(['Low', 'Medium', 'High']),
  chiefComplaint: z.string(),
  suggestedQuestions: z.array(z.string()).min(1).max(5),
});

/**
 * Post-visit: patient-friendly summary schema
 */
const postVisitSchema = z.object({
  summary: z.string(),
  medicationSchedule: z.array(z.string()),
  followUpSteps: z.array(z.string()),
});

module.exports = { preVisitSchema, postVisitSchema };
