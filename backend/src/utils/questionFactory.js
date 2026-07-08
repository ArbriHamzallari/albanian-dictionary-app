const pool = require('./db');

// The origin worlds a game may target — mirrors the words.origin_language CHECK
// constraint (migration 022). Locked taxonomy; do not extend without a migration.
const ORIGIN_CODES = ['neolatine', 'anglisht', 'turqisht', 'greqisht', 'sllavisht', 'gjermanisht'];

// Question types the factory knows how to build. GAME-0 implements `translate`
// only; the others land in GAME-2/3/4. The build switch is exhaustive — an unknown
// or not-yet-implemented type throws (a coding bug, never client input).
const QUESTION_TYPES = ['translate', 'match', 'fill_blank', 'spot_loanword'];

// Raised when the content model can't supply enough eligible words for the request.
// A content problem, not a code problem — the caller turns it into a clean "not
// enough content yet" response rather than a generic 500.
class QuestionPoolError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuestionPoolError';
    this.code = 'QUESTION_POOL_TOO_SMALL';
  }
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Every `replace` word for an origin that carries a clean Albanian equivalent — the
// only words the games may quiz. Heritage words (no replacement) are excluded by
// design; they are never quizzed as an error.
async function fetchReplaceWords(origin) {
  const { rows } = await pool.query(
    `SELECT id, borrowed_word, correct_albanian, difficulty, slug
       FROM words
      WHERE origin_language = $1
        AND word_type = 'replace'
        AND correct_albanian IS NOT NULL
      ORDER BY id`,
    [origin]
  );
  return rows;
}

// GAME-1 teaching block: the primary definition and ONE example pair per target
// word, plus the slug for the "Mëso më shumë" link. Reuses the same tables/shape as
// the word-detail endpoint (definitions ordered by definition_order, first example
// by id). Attached to the stored question but STRIPPED on start (it reveals the
// answer); it is served only in the submit response. Words with no definition/example
// simply carry null — never a blocker for translate.
async function attachTranslateTeaching(questions, words) {
  const translateQuestions = questions.filter((q) => q.type === 'translate');
  if (!translateQuestions.length) return;

  const wordById = new Map(words.map((w) => [w.id, w]));
  const ids = translateQuestions.map((q) => q.word_id);

  const [defs, examples] = await Promise.all([
    pool.query(
      `SELECT DISTINCT ON (word_id) word_id, definition_text
         FROM definitions WHERE word_id = ANY($1)
        ORDER BY word_id, definition_order ASC`,
      [ids]
    ),
    pool.query(
      `SELECT DISTINCT ON (word_id) word_id, sentence_loan, sentence_clean
         FROM word_examples WHERE word_id = ANY($1)
        ORDER BY word_id, id ASC`,
      [ids]
    ),
  ]);

  const defByWord = new Map(defs.rows.map((r) => [r.word_id, r.definition_text]));
  const exampleByWord = new Map(
    examples.rows.map((r) => [r.word_id, { loan: r.sentence_loan, clean: r.sentence_clean }])
  );

  for (const q of translateQuestions) {
    const word = wordById.get(q.word_id);
    q.teach = {
      slug: word?.slug ?? null,
      borrowed_word: q.prompt.borrowed_word,
      correct_albanian: q.answer,
      definition_sq: defByWord.get(q.word_id) ?? null,
      example: exampleByWord.get(q.word_id) ?? null,
    };
  }
}

// GAME-1 shape: show the borrowed word, choose the correct Albanian among three
// distractors drawn from the SAME origin and adjacent difficulty (±1) — never
// random, never the correct word, never a duplicate value. Throws (fail fast) if
// the pool can't fill `count` questions: that means the content is too thin, which
// is Arbri's problem to fix, not something to paper over with a weaker rule.
function buildTranslateQuestions(words, count) {
  if (words.length < 4) {
    throw new QuestionPoolError(`translate: only ${words.length} eligible words (need >= 4)`);
  }

  const questions = [];
  for (const target of shuffle(words)) {
    if (questions.length >= count) break;

    // Same origin (the pool already is), adjacent difficulty, distinct values.
    const seen = new Set([normalize(target.correct_albanian)]);
    const distractors = [];
    for (const candidate of shuffle(words)) {
      if (candidate.id === target.id) continue;
      if (Math.abs(candidate.difficulty - target.difficulty) > 1) continue;
      const value = candidate.correct_albanian;
      if (seen.has(normalize(value))) continue;
      seen.add(normalize(value));
      distractors.push(value);
      if (distractors.length === 3) break;
    }
    // Not enough adjacent-difficulty peers for THIS target — skip it, try another.
    if (distractors.length < 3) continue;

    questions.push({
      type: 'translate',
      word_id: target.id,
      prompt: { borrowed_word: target.borrowed_word },
      options: shuffle([target.correct_albanian, ...distractors]),
      answer: target.correct_albanian,
    });
  }

  if (questions.length < count) {
    throw new QuestionPoolError(
      `translate: built only ${questions.length}/${count} questions from ${words.length} words`
    );
  }
  return questions;
}

// Produce `count` question objects of the requested `types` from the content model.
// GAME-0 serves a single type (`translate`); mixing/ordering multiple types into a
// ramped session is GAME-5's composer, not here. `idx` is assigned last and is the
// client's per-question handle at submit time. The returned objects still carry
// `answer` (the grading truth) — the caller stores them and strips `answer` before
// serving to the client.
async function buildQuestions({ origin, count, types = ['translate'] }) {
  if (!ORIGIN_CODES.includes(origin)) {
    throw new Error(`buildQuestions: unknown origin "${origin}"`);
  }

  const words = await fetchReplaceWords(origin);

  let built = [];
  for (const type of types) {
    switch (type) {
      case 'translate':
        built = built.concat(buildTranslateQuestions(words, count));
        break;
      case 'match':
      case 'fill_blank':
      case 'spot_loanword':
        throw new Error(`buildQuestions: question type "${type}" is not implemented yet`);
      default:
        throw new Error(`buildQuestions: unknown question type "${type}"`);
    }
  }

  const questions = built.slice(0, count).map((question, idx) => ({ idx, ...question }));
  await attachTranslateTeaching(questions, words);
  return questions;
}

module.exports = { buildQuestions, QuestionPoolError, ORIGIN_CODES, QUESTION_TYPES };
