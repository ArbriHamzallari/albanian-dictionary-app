const Joi = require('joi');

// ─────────────────────────────────────────────────────────────
// Curriculum validation. The prompt/answer JSONB shapes here are the
// canonical definition and MUST match the comment block at the top of
// database/migrations/009_curriculum.sql.
//
// The client renders from `prompt` and submits its choice; the server grades
// against `answer`. `answer` is never exposed to non-admin clients.
// ─────────────────────────────────────────────────────────────

const EXERCISE_TYPES = ['spot_alblish', 'translation', 'fill_blank'];

const slug = Joi.string()
  .trim()
  .lowercase()
  .max(80)
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// ── Unit / Lesson envelopes ──────────────────────────────────
const unitSchema = Joi.object({
  slug: slug.required(),
  title: Joi.string().trim().min(1).max(120).required(),
  description: Joi.string().trim().max(500).allow('', null),
  icon: Joi.string().trim().max(60).allow('', null),
  color: Joi.string().trim().pattern(/^#[0-9A-Fa-f]{6}$/).allow('', null),
  order_index: Joi.number().integer().min(0).required(),
  is_premium_unit: Joi.boolean().default(false),
});

const lessonSchema = Joi.object({
  unit_id: Joi.string().uuid().required(),
  slug: slug.required(),
  title: Joi.string().trim().min(1).max(120).required(),
  order_index: Joi.number().integer().min(0).required(),
});

// ── Exercise prompt/answer sub-shapes ────────────────────────
const optionsSchema = Joi.array()
  .items(Joi.string().trim().min(1).max(120))
  .length(4)
  .unique();

const spotAlblishPrompt = Joi.object({
  sentence: Joi.string().trim().min(1).max(500).required(),
});
const spotAlblishAnswer = Joi.object({
  loanword: Joi.string().trim().min(1).max(120).required(),
  corrected_sentence: Joi.string().trim().min(1).max(500).required(),
  correct_albanian: Joi.string().trim().min(1).max(120).required(),
});

const translationPrompt = Joi.object({
  loanword: Joi.string().trim().min(1).max(120).required(),
  sentence: Joi.string().trim().max(500).allow('', null),
  options: optionsSchema.required(),
});
const translationAnswer = Joi.object({
  correct: Joi.string().trim().min(1).max(120).required(),
});

const fillBlankPrompt = Joi.object({
  sentence: Joi.string().trim().min(1).max(500).pattern(/\{\{blank\}\}/).required(),
  options: optionsSchema.required(),
});
const fillBlankAnswer = Joi.object({
  correct: Joi.string().trim().min(1).max(120).required(),
});

// ── Cross-field validators ───────────────────────────────────
// Normalize for membership/substring checks: NFC + lowercase + trim so that
// diacritics and casing don't cause false rejections.
const norm = (s) => String(s).normalize('NFC').toLowerCase().trim();

function spotAlblishCross(value, helpers) {
  const { prompt, answer } = value;
  if (!norm(prompt.sentence).includes(norm(answer.loanword))) {
    return helpers.message('answer.loanword must appear in prompt.sentence');
  }
  if (!norm(answer.corrected_sentence).includes(norm(answer.correct_albanian))) {
    return helpers.message('answer.correct_albanian must appear in answer.corrected_sentence');
  }
  return value;
}

function choiceCross(value, helpers) {
  const { prompt, answer } = value;
  if (!prompt.options.some((opt) => norm(opt) === norm(answer.correct))) {
    return helpers.message('answer.correct must be one of prompt.options');
  }
  return value;
}

const commonEnvelope = {
  lesson_id: Joi.string().uuid().required(),
  order_index: Joi.number().integer().min(0).required(),
};

// Full per-type exercise schemas (envelope + typed prompt/answer + cross-field).
const exerciseSchemasByType = {
  spot_alblish: Joi.object({
    ...commonEnvelope,
    type: Joi.string().valid('spot_alblish').required(),
    // why_it_matters is the brand line - required for the hero type.
    why_it_matters: Joi.string().trim().min(1).max(600).required(),
    prompt: spotAlblishPrompt.required(),
    answer: spotAlblishAnswer.required(),
  }).custom(spotAlblishCross, 'spot_alblish cross-field check'),

  translation: Joi.object({
    ...commonEnvelope,
    type: Joi.string().valid('translation').required(),
    why_it_matters: Joi.string().trim().max(600).allow('', null),
    prompt: translationPrompt.required(),
    answer: translationAnswer.required(),
  }).custom(choiceCross, 'translation cross-field check'),

  fill_blank: Joi.object({
    ...commonEnvelope,
    type: Joi.string().valid('fill_blank').required(),
    why_it_matters: Joi.string().trim().max(600).allow('', null),
    prompt: fillBlankPrompt.required(),
    answer: fillBlankAnswer.required(),
  }).custom(choiceCross, 'fill_blank cross-field check'),
};

/**
 * Validate a full exercise payload against its type's schema. The payload must
 * carry a valid `type`; the matching schema then enforces the prompt/answer
 * shape and the cross-field rules. Returns Joi's { error, value }.
 */
function validateExercise(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: new Error('Exercise payload must be an object.') };
  }
  const schema = exerciseSchemasByType[payload.type];
  if (!schema) {
    return { error: new Error(`Unknown exercise type: ${payload.type}`) };
  }
  return schema.validate(payload, { abortEarly: false, convert: true, stripUnknown: true });
}

module.exports = {
  EXERCISE_TYPES,
  unitSchema,
  lessonSchema,
  exerciseSchemasByType,
  validateExercise,
};
