const Joi = require('joi');

const searchSchema = Joi.object({
  q: Joi.string().trim().min(1).max(100).required(),
});

const suggestionSchema = Joi.object({
  borrowed_word: Joi.string().trim().max(100).required(),
  suggested_albanian: Joi.string().trim().max(100).allow('', null),
  suggested_definition: Joi.string().trim().max(1000).allow('', null),
  submitter_name: Joi.string().trim().max(100).allow('', null),
  submitter_email: Joi.string().trim().email().max(255).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
});

const wordSchema = Joi.object({
  borrowed_word: Joi.string().trim().max(255).required(),
  correct_albanian: Joi.string().trim().max(255).required(),
  category: Joi.string().trim().max(100).allow('', null),
  difficulty_level: Joi.string().trim().max(50).allow('', null),
  definitions: Joi.array()
    .items(
      Joi.object({
        definition_text: Joi.string().trim().max(1000).required(),
        example_sentence: Joi.string().trim().max(1000).allow('', null),
        definition_order: Joi.number().integer().min(1).optional(),
      })
    )
    .min(1)
    .required(),
  conjugations: Joi.array()
    .items(
      Joi.object({
        conjugation_type: Joi.string().trim().max(100).required(),
        conjugation_text: Joi.string().trim().max(1000).required(),
      })
    )
    .optional(),
});

const wordOfDaySchema = Joi.object({
  word_id: Joi.number().integer().required(),
  display_date: Joi.string().regex(/\d{4}-\d{2}-\d{2}/).required(),
});

const consentCheckSchema = Joi.object({
  age: Joi.number().integer().min(1).max(120).required(),
  country_code: Joi.string().trim().uppercase().length(2).required(),
});

// SEC-1: stripUnknown drops any field not declared here (e.g. a client-supplied
// `role`) instead of honoring it. role is never accepted from the client — every
// account-creation path INSERTs role = 'user' literally. Admin is set only via the
// admin-only PATCH /api/admin/users/:uuid (or directly in the DB).
const registerSchema = Joi.object({
  username: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).min(3).max(30).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
  age: Joi.number().integer().min(1).max(120).required(),
  country_code: Joi.string().trim().uppercase().length(2).required(),
  parental_consent_given: Joi.boolean().default(false),
  timezone: Joi.string().trim().max(64).optional(),
}).options({ stripUnknown: true });

const guestUpgradeSchema = Joi.object({
  username: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).min(3).max(30).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
  age: Joi.number().integer().min(1).max(120).required(),
  country_code: Joi.string().trim().uppercase().length(2).required(),
  parental_consent_given: Joi.boolean().default(false),
  timezone: Joi.string().trim().max(64).optional(),
  guestProgress: Joi.object({
    xp: Joi.number().integer().min(0).max(500000).default(0),
    total_quizzes: Joi.number().integer().min(0).max(10000).default(0),
    correct_answers: Joi.number().integer().min(0).max(100000).default(0),
    streak: Joi.number().integer().min(0).max(365).default(0),
  }).default({}),
}).options({ stripUnknown: true });

const profileUpdateSchema = Joi.object({
  username: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).min(3).max(30).optional(),
  bio: Joi.string().trim().max(500).allow('', null).optional(),
  favorite_word: Joi.string().trim().max(255).allow('', null).optional(),
  leaderboard_opt_out: Joi.boolean().optional(),
});

// AUTH-5: admin edits a user. Partial update — every field optional, but at least
// one must be present. avatar_filename matches the preset-avatar file convention.
const adminUserUpdateSchema = Joi.object({
  role: Joi.string().valid('user', 'admin').optional(),
  username: Joi.string().trim().pattern(/^[A-Za-z0-9_-]+$/).min(3).max(30).optional(),
  avatar_filename: Joi.string().trim().pattern(/^[A-Za-z0-9._-]+\.(png|jpg|jpeg|svg|webp)$/).max(255).optional(),
  is_suspended: Joi.boolean().optional(),
}).min(1);

const QUIZ_QUESTIONS_PER_SESSION = 10;

const quizAnswerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  answer: Joi.string().trim().max(255).required(),
});

const quizSubmitSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  answers: Joi.array().items(quizAnswerSchema).min(1).max(QUIZ_QUESTIONS_PER_SESSION).required(),
});

const googleAuthSchema = Joi.object({
  credential: Joi.string().min(1).max(8192).required(),
});

// Google sign-ups provide no age/country, so a new Google user must complete the
// age gate before full access. Same shape as the consent step + the consent flag.
const completeProfileSchema = Joi.object({
  age: Joi.number().integer().min(1).max(120).required(),
  country_code: Joi.string().trim().uppercase().length(2).required(),
  parental_consent_given: Joi.boolean().default(false),
  timezone: Joi.string().trim().max(64).optional(),
});

// Self-service account deletion re-verifies identity before an irreversible
// erase: a password re-entry for password accounts, or a fresh Google credential
// for Google-only accounts. Both optional here (only one applies per account);
// the controller enforces that the right one is present and correct.
const deleteAccountSchema = Joi.object({
  password: Joi.string().max(200),
  credential: Joi.string().max(8192),
}).options({ stripUnknown: true });

module.exports = {
  searchSchema,
  suggestionSchema,
  loginSchema,
  googleAuthSchema,
  completeProfileSchema,
  deleteAccountSchema,
  wordSchema,
  wordOfDaySchema,
  consentCheckSchema,
  registerSchema,
  guestUpgradeSchema,
  profileUpdateSchema,
  adminUserUpdateSchema,
  quizSubmitSchema,
  QUIZ_QUESTIONS_PER_SESSION,
};
