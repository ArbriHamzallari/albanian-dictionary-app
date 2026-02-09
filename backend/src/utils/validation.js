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

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
});

const guestUpgradeSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(6).max(255).required(),
  guestProgress: Joi.object({
    xp: Joi.number().integer().min(0).max(500000).default(0),
    total_quizzes: Joi.number().integer().min(0).max(10000).default(0),
    correct_answers: Joi.number().integer().min(0).max(100000).default(0),
    streak: Joi.number().integer().min(0).max(365).default(0),
  }).default({}),
});

const profileUpdateSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).optional(),
  bio: Joi.string().trim().max(500).allow('', null).optional(),
  favorite_word: Joi.string().trim().max(255).allow('', null).optional(),
});

const quizProgressSchema = Joi.object({
  score: Joi.number().integer().min(0).required(),
  totalQuestions: Joi.number().integer().min(1).required(),
  correctAnswers: Joi.number().integer().min(0).required(),
});

module.exports = {
  searchSchema,
  suggestionSchema,
  loginSchema,
  wordSchema,
  wordOfDaySchema,
  registerSchema,
  guestUpgradeSchema,
  profileUpdateSchema,
  quizProgressSchema,
};
