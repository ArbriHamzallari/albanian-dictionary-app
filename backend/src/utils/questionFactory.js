const pool = require('./db');

// The origin worlds a game may target — mirrors the words.origin_language CHECK
// constraint (migration 022). Locked taxonomy; do not extend without a migration.
const ORIGIN_CODES = ['neolatine', 'anglisht', 'turqisht', 'greqisht', 'sllavisht', 'gjermanisht'];

// Question types the factory knows how to build. GAME-0 implements `translate`
// only; the others land in GAME-2/3/4. The build switch is exhaustive — an unknown
// or not-yet-implemented type throws (a coding bug, never client input).
const QUESTION_TYPES = ['translate', 'match', 'fill_blank', 'spot_loanword'];

// A match question presents this many borrowed↔Albanian pairs to tap together.
const MATCH_PAIRS_PER_QUESTION = 5;

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

// GAME-2 (Çifto fjalët): a recognize-level question of MATCH_PAIRS_PER_QUESTION
// borrowed↔Albanian pairs drawn from the SAME origin and one difficulty band
// (adjacent difficulties only — never random). Payload = a left column (borrowed,
// stable order) + a right column (Albanian, shuffled server-side). The stored
// `answer` is the correct leftId→rightId index mapping (the grading truth).
//
// Each tile also carries a hidden `pairId` so the renderer can give immediate
// lock/shake feedback per pair WITHOUT a server round-trip. This is a deliberate,
// safe exception to "answers never reach the client": the server still grades the
// submitted mapping against `answer`, and a "correct" submission is identical to
// actually solving the board — there is no way to mint XP without producing the real
// mapping, so nothing is exploitable. (translate answers stay fully hidden.)
function buildMatchQuestions(words, count) {
  if (words.length < MATCH_PAIRS_PER_QUESTION) {
    throw new QuestionPoolError(
      `match: only ${words.length} eligible words (need >= ${MATCH_PAIRS_PER_QUESTION})`
    );
  }

  const questions = [];
  const maxAttempts = count * 20; // sampling can miss the pair/dedupe rules; cap it
  let attempts = 0;
  while (questions.length < count && attempts < maxAttempts) {
    attempts += 1;

    // One difficulty band per question (adjacent difficulties only).
    const anchor = words[Math.floor(Math.random() * words.length)].difficulty;
    const band = words.filter((w) => Math.abs(w.difficulty - anchor) <= 1);
    if (band.length < MATCH_PAIRS_PER_QUESTION) continue;

    const picked = shuffle(band).slice(0, MATCH_PAIRS_PER_QUESTION);
    // Distinct Albanian values, else the right column would be ambiguous to grade.
    if (new Set(picked.map((w) => normalize(w.correct_albanian))).size !== picked.length) continue;

    // left keeps picked order; pairId === leftId. right is a shuffle carrying pairId.
    const left = picked.map((w, i) => ({ id: i, text: w.borrowed_word, pairId: i }));
    const rightOrder = shuffle(picked.map((w, i) => ({ word: w, pairId: i })));
    const right = rightOrder.map((r, j) => ({ id: j, text: r.word.correct_albanian, pairId: r.pairId }));

    // Correct mapping: leftId (= pairId) -> the rightId holding that pairId.
    const answer = {};
    rightOrder.forEach((r, j) => { answer[r.pairId] = j; });

    questions.push({
      type: 'match',
      word_ids: picked.map((w) => w.id),
      prompt: { left, right },
      answer,
    });
  }

  if (questions.length < count) {
    throw new QuestionPoolError(
      `match: built only ${questions.length}/${count} questions from ${words.length} words`
    );
  }
  return questions;
}

// Split a clean sentence at the exact blank_form surface form (guaranteed present by
// the import contract). Returns the text before/after the blank so the renderer can
// draw a real blank slot without parsing a sentinel token. Case-insensitive, first
// occurrence.
function blankOut(sentenceClean, blankForm) {
  const at = sentenceClean.toLowerCase().indexOf(blankForm.toLowerCase());
  if (at < 0) return null;
  return { before: sentenceClean.slice(0, at), after: sentenceClean.slice(at + blankForm.length) };
}

// GAME-3 (Plotëso vendin bosh): the learner produces the Albanian word inside a real
// sentence via a tap word-bank (typed input is banned — the ë/ç problem). Only words
// WITH an example carrying blank_form qualify; the sentence is blanked at that exact
// inflected form. Bank = correct lemma + 3 same-origin, adjacent-difficulty distractor
// lemmas (never random, never the borrowed word, no duplicates). Stored answer = the
// correct option INDEX. Throws (fail fast) if the pool can't fill `count`.
async function buildFillBlankQuestions(origin, words, count) {
  if (words.length < 4) {
    throw new QuestionPoolError(`fill_blank: only ${words.length} words for a 4-option bank (need >= 4)`);
  }

  const { rows: candidates } = await pool.query(
    `SELECT w.id AS word_id, w.borrowed_word, w.correct_albanian, w.difficulty, w.slug,
            we.sentence_loan, we.sentence_clean, we.blank_form
       FROM words w
       JOIN word_examples we ON we.word_id = w.id
      WHERE w.origin_language = $1
        AND w.word_type = 'replace'
        AND w.correct_albanian IS NOT NULL
        AND we.blank_form IS NOT NULL`,
    [origin]
  );
  if (!candidates.length) {
    throw new QuestionPoolError(`fill_blank: no examples with blank_form for "${origin}"`);
  }

  const questions = [];
  const usedWordIds = new Set(); // one question per word keeps a session varied
  for (const cand of shuffle(candidates)) {
    if (questions.length >= count) break;
    if (usedWordIds.has(cand.word_id)) continue;

    const split = blankOut(cand.sentence_clean, cand.blank_form);
    if (!split) continue; // import guarantees a match, but never trust — skip if not

    // 3 distractor lemmas: same origin (pool already is), adjacent difficulty (±1),
    // distinct values, never the correct word.
    const seen = new Set([normalize(cand.correct_albanian)]);
    const distractors = [];
    for (const w of shuffle(words)) {
      if (w.id === cand.word_id) continue;
      if (Math.abs(w.difficulty - cand.difficulty) > 1) continue;
      if (seen.has(normalize(w.correct_albanian))) continue;
      seen.add(normalize(w.correct_albanian));
      distractors.push(w.correct_albanian);
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) continue;

    const bank = shuffle([cand.correct_albanian, ...distractors]);
    const answer = bank.findIndex((opt) => normalize(opt) === normalize(cand.correct_albanian));

    usedWordIds.add(cand.word_id);
    questions.push({
      type: 'fill_blank',
      word_id: cand.word_id,
      prompt: { before: split.before, after: split.after, bank },
      answer,
      // Teaching block (served only on submit): the full loan/clean pair is the
      // learning moment; reuses the review renderer (no fork — GAME-4 too).
      teach: {
        borrowed_word: cand.borrowed_word,
        correct_albanian: cand.correct_albanian,
        slug: cand.slug,
        example: { loan: cand.sentence_loan, clean: cand.sentence_clean },
      },
    });
  }

  if (questions.length < count) {
    throw new QuestionPoolError(
      `fill_blank: built only ${questions.length}/${count} from ${candidates.length} examples for "${origin}"`
    );
  }
  return questions;
}

// Tokenizer rule for spot-the-loanword (stated per the task): split on WHITESPACE
// only. Punctuation stays attached to its token for display; a token's "core" (outer
// punctuation stripped, inner apostrophes/hyphens kept) is what we match the loanword
// against. This keeps Albanian apostrophe-words ("t'i", "s'e") and loan-suffix
// attachments ("Manager-i", "budget-in") as single tappable tokens — splitting on
// apostrophe or hyphen would shatter real words. Verified against imported sentences.
const EDGE_PUNCT = /^[.,;:!?"'“”‘’«»…()[\]]+|[.,;:!?"'“”‘’«»…()[\]]+$/g;
function tokenCore(token) {
  return token.replace(EDGE_PUNCT, '');
}
function tokenizeLoan(sentence) {
  return sentence.split(/\s+/).filter(Boolean);
}
// Index of the token that IS the loanword: prefer an exact core match, else the first
// token whose core contains the borrowed word (catches "Manager-i" ⊃ "manager").
// Returns -1 if not found or the borrowed form is multiword (one target per v1).
function findLoanwordIndex(tokens, borrowedWord) {
  const bw = borrowedWord.trim().toLowerCase();
  if (!bw || bw.includes(' ')) return -1;
  const cores = tokens.map((t) => tokenCore(t).toLowerCase());
  const exact = cores.findIndex((c) => c === bw);
  if (exact >= 0) return exact;
  return cores.findIndex((c) => c.includes(bw));
}

// GAME-4 (Gjej fjalën e huazuar) — the signature mechanic: show a real loan sentence
// and have the learner tap the foreign word. Tokenized SERVER-side so grading is exact
// and the answer index never reaches the client. Only examples whose sentence_loan
// contains a locatable borrowed token qualify; stored answer = that token index.
async function buildSpotLoanwordQuestions(origin, count) {
  const { rows: candidates } = await pool.query(
    `SELECT w.id AS word_id, w.borrowed_word, w.correct_albanian, w.difficulty, w.slug,
            we.sentence_loan, we.sentence_clean
       FROM words w
       JOIN word_examples we ON we.word_id = w.id
      WHERE w.origin_language = $1
        AND w.word_type = 'replace'
        AND w.correct_albanian IS NOT NULL`,
    [origin]
  );
  if (!candidates.length) {
    throw new QuestionPoolError(`spot_loanword: no examples for "${origin}"`);
  }

  const questions = [];
  const usedWordIds = new Set();
  for (const cand of shuffle(candidates)) {
    if (questions.length >= count) break;
    if (usedWordIds.has(cand.word_id)) continue;

    const tokens = tokenizeLoan(cand.sentence_loan);
    const answer = findLoanwordIndex(tokens, cand.borrowed_word);
    if (answer < 0) continue; // loanword inflected past recognition, or multiword — skip

    usedWordIds.add(cand.word_id);
    questions.push({
      type: 'spot_loanword',
      word_id: cand.word_id,
      prompt: { tokens },
      answer,
      teach: {
        borrowed_word: cand.borrowed_word,
        correct_albanian: cand.correct_albanian,
        slug: cand.slug,
        example: { loan: cand.sentence_loan, clean: cand.sentence_clean },
      },
    });
  }

  if (questions.length < count) {
    throw new QuestionPoolError(
      `spot_loanword: built only ${questions.length}/${count} from ${candidates.length} examples for "${origin}"`
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
        built = built.concat(buildMatchQuestions(words, count));
        break;
      case 'fill_blank':
        built = built.concat(await buildFillBlankQuestions(origin, words, count));
        break;
      case 'spot_loanword':
        built = built.concat(await buildSpotLoanwordQuestions(origin, count));
        break;
      default:
        throw new Error(`buildQuestions: unknown question type "${type}"`);
    }
  }

  const questions = built.slice(0, count).map((question, idx) => ({ idx, ...question }));
  await attachTranslateTeaching(questions, words);
  return questions;
}

module.exports = {
  buildQuestions,
  QuestionPoolError,
  ORIGIN_CODES,
  QUESTION_TYPES,
  MATCH_PAIRS_PER_QUESTION,
};
