/**
 * Appointment LLM Service
 * Extracts AI-specific logic out of appointmentController to keep the controller thin.
 * Handles pre-visit symptom triage and post-visit clinical summary generation.
 */
const prisma = require('../utils/prismaClient');
const { callLLM } = require('./llm/llmService');
const { preVisitSchema, postVisitSchema } = require('./llm/schemas');
const { URGENCY, AI_STATUS } = require('../lib/constants');
const logger = require('../utils/logger');

/**
 * Run Gemini → Groq → Raw symptom fallback for pre-visit triage.
 * Saves the result to SymptomForm.aiSummary. Never throws.
 */
async function runPreVisitLLM(appointmentId, symptoms) {
  const prompt = `Analyse these symptoms and return a JSON with these exact keys:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "string",
  "suggestedQuestions": ["string", "string", "string"]
}
Symptoms: ${symptoms}`;

  const result = await callLLM(prompt, preVisitSchema);

  const fallbackSummary = {
    urgency: URGENCY.MEDIUM,
    chiefComplaint: symptoms.length > 100 ? `${symptoms.slice(0, 100)}...` : symptoms,
    suggestedQuestions: [
      'How long have these symptoms persisted?',
      'Are the symptoms getting progressively worse or intermittent?',
      'Are you experiencing any other related symptoms?',
    ],
  };

  await prisma.symptomForm.update({
    where: { appointmentId },
    data: {
      aiSummary: result.status === AI_STATUS.OK ? result.data : fallbackSummary,
      aiStatus: result.status === AI_STATUS.OK ? AI_STATUS.OK : AI_STATUS.FAILED,
    },
  });

  logger.info(`Pre-visit LLM for appointment ${appointmentId}: ${result.status}`);
}

/**
 * Run Gemini → Groq post-visit summarisation of clinical notes into patient-friendly language.
 * Saves the result to VisitNote.aiPatientSummary. Never throws.
 */
async function runPostVisitLLM(appointmentId, notes, prescription = []) {
  const prompt = `Summarise these clinical notes for the patient in plain, easy-to-understand English.
Return JSON:
{
  "summary": "plain English explanation",
  "keyInstructions": ["instruction 1", "instruction 2"],
  "redFlagWarnings": ["warning 1", "warning 2"]
}
Notes: ${notes}
Prescriptions: ${JSON.stringify(prescription)}`;

  const result = await callLLM(prompt, postVisitSchema);
  if (result.status === AI_STATUS.OK) {
    await prisma.visitNote.update({
      where: { appointmentId },
      data: { aiPatientSummary: result.data },
    });
  }
}

module.exports = { runPreVisitLLM, runPostVisitLLM };
