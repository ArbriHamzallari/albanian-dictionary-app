-- 022_content_model.sql (idempotent — safe to re-run)
--
-- The enriched content model that DATA-2's importer, /origjina (WEB-1) and the
-- enriched word pages (WEB-2) all build on: an origin layer, replace-vs-heritage
-- typing, difficulty, example sentence pairs, and the origin histories.

-- Heritage words (byrek, xhami…) have NO Albanian replacement by design, so the
-- old NOT NULL on correct_albanian must be relaxed.
ALTER TABLE words ALTER COLUMN correct_albanian DROP NOT NULL;

-- Which borrowed layer the word came from. NULL on legacy rows until the import
-- backfills it; the CHECK only constrains non-null values.
ALTER TABLE words ADD COLUMN IF NOT EXISTS origin_language VARCHAR(20)
  CHECK (origin_language IN ('neolatine','anglisht','turqisht','greqisht','sllavisht','gjermanisht'));

-- replace = feeds the games (has a clean Albanian equivalent); heritage = history/
-- awareness only. Existing rows default to 'replace'.
ALTER TABLE words ADD COLUMN IF NOT EXISTS word_type VARCHAR(10) NOT NULL DEFAULT 'replace'
  CHECK (word_type IN ('replace','heritage'));

ALTER TABLE words ADD COLUMN IF NOT EXISTS difficulty SMALLINT NOT NULL DEFAULT 1
  CHECK (difficulty BETWEEN 1 AND 3);

-- Schema-enforced pedagogy: a replace word must carry its replacement. (Added after
-- word_type is populated so it validates cleanly against existing rows.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'words_replace_has_albanian') THEN
    ALTER TABLE words ADD CONSTRAINT words_replace_has_albanian
      CHECK (word_type <> 'replace' OR correct_albanian IS NOT NULL);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_words_origin_type_difficulty
  ON words(origin_language, word_type, difficulty);

-- One row per example sentence pair (loan vs clean). The batch is the source of
-- truth for a word's examples (importer replaces them wholesale).
CREATE TABLE IF NOT EXISTS word_examples (
  id SERIAL PRIMARY KEY,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sentence_loan TEXT NOT NULL,
  sentence_clean TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_word_examples_word_id ON word_examples(word_id);

-- The five origin histories (the /origjina narrative spine). word_count is recomputed
-- by the importer from the words table.
CREATE TABLE IF NOT EXISTS origins (
  code VARCHAR(20) PRIMARY KEY,
  name_sq VARCHAR(60) NOT NULL,
  intro_sq TEXT NOT NULL,
  era_sq VARCHAR(120),
  word_count INTEGER NOT NULL DEFAULT 0
);
