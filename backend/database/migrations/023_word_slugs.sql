-- 023_word_slugs.sql (idempotent — safe to re-run)
--
-- SEO slugs for word pages: /fjala/<slug>. Generated from borrowed_word, lowercased,
-- with whitespace collapsed to hyphens. Diacritics (ë, ç) are PRESERVED — they are
-- valid in URLs (the browser percent-encodes them) and better for Albanian search
-- than an ASCII fold. STORED + GENERATED so every row — including future
-- import_words.js inserts — gets a slug automatically, with no app-side logic.
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS slug TEXT
  GENERATED ALWAYS AS (lower(regexp_replace(btrim(borrowed_word), '\s+', '-', 'g'))) STORED;

-- One slug ↔ one word. If two curated borrowed_words collapse to the same slug this
-- index build fails loudly (fix the offending word); collisions are not silently kept.
CREATE UNIQUE INDEX IF NOT EXISTS idx_words_slug ON words(slug);
