-- 025_word_example_blank_form.sql (GAME-3 content contract)
--
-- Fill-blank blanks the EXACT surface form as it appears in sentence_clean. Albanian
-- inflection means that form frequently differs from the lemma correct_albanian
-- (miratoj -> "miratoi", i njëjtë -> "të njëjta"), so the content contract now carries
-- a per-example blank_form: the exact string in sentence_clean to blank out.
--
-- Nullable: legacy example rows have no blank_form until their batch is re-imported,
-- and are simply not eligible for fill-blank until then (the factory requires it).
ALTER TABLE word_examples ADD COLUMN IF NOT EXISTS blank_form TEXT;
