-- 014_words_cascade.sql (idempotent - safe to re-run)
-- Admin "delete word" failed because two child tables reference words(id) with
-- the default ON DELETE NO ACTION (RESTRICT): deleting a word that was ever a
-- Word of the Day, or that has quiz questions, raised a foreign_key_violation.
--
-- definitions.word_id and conjugations.word_id already use ON DELETE CASCADE
-- (see 001_init.sql) so they are intentionally left untouched.
--
-- word_of_the_day is a pure pointer to a word (meaningless without it) -> CASCADE.
-- quiz_questions carries its own self-contained content (question + answers) and
-- should outlive the source word -> SET NULL (word_id is already nullable).

ALTER TABLE word_of_the_day DROP CONSTRAINT IF EXISTS word_of_the_day_word_id_fkey;
ALTER TABLE word_of_the_day
  ADD CONSTRAINT word_of_the_day_word_id_fkey
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE;

ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_word_id_fkey;
ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_word_id_fkey
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE SET NULL;
