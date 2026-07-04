-- 021_seed_achievements.sql (idempotent - safe to re-run)
-- The achievements table only seeded '7_day_streak', so every other achievement
-- the app can unlock (first_search, suggester, …) had no row — the unlock could
-- not resolve a key -> id and nothing persisted (FEAT-3). Seed the full set the
-- frontend lists in ALL_ACHIEVEMENTS. Names/descriptions mirror sq.json; xp_reward
-- mirrors the points shown on the Achievements page. ON CONFLICT keeps it a no-op
-- for keys that already exist.
INSERT INTO achievements (key, name, description, xp_reward) VALUES
  ('first_search', 'Kërkim i Parë',  'Kërko fjalën e parë',        50),
  ('first_quiz',   'Kuizier',         'Përfundo kuizin e parë',     50),
  ('quiz_master',  'Mjeshtër Kuizi',  'Përfundo 10 kuize',          200),
  ('perfect_quiz', 'Perfekt!',        'Merr 10/10 në kuiz',         300),
  ('streak_3',     'Seria 3',         'Arrit serinë 3-ditore',      100),
  ('7_day_streak', 'Seria 7-Ditore',  'Luaj kuizin 7 ditë rresht',  500),
  ('streak_30',    'Seria 30',        'Arrit serinë 30-ditore',     500),
  ('points_500',   'Grumbullues',     'Merr 500 pikë',              100),
  ('points_1000',  'Ekspert',         'Merr 1000 pikë',             200),
  ('points_5000',  'Legjendë',        'Merr 5000 pikë',             500),
  ('word_explorer','Eksplorues',      'Shiko 20 fjalë',             100),
  ('suggester',    'Kontributor',     'Propozo një fjalë',          50)
ON CONFLICT (key) DO NOTHING;
