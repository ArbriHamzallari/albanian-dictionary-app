-- 013_backfill_user_stats.sql (idempotent - safe to re-run)
-- Every user must own exactly one user_stats row (1:1 via users.uuid).
-- Without it, submitQuiz's `UPDATE user_stats ... WHERE user_id = $1 RETURNING *`
-- returns zero rows and the API responds 404 "Statistikat nuk u gjetën".
-- register/guest-upgrade create the row going forward; this backfills any user
-- that predates that (notably the seeded admin) so they can complete a quiz.

INSERT INTO user_stats (user_id)
SELECT u.uuid
FROM users u
LEFT JOIN user_stats s ON s.user_id = u.uuid
WHERE u.uuid IS NOT NULL
  AND s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
