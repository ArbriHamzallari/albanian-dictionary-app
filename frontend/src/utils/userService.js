// Theme + lightweight client-side user utilities.
// NOTE: Some components import streak/xp helpers from here. Keep exports stable.

const THEME_KEY = 'fjalingo_theme';
const GUEST_PROGRESS_KEY = 'fjalingo_guest_progress';
const DAILY_STREAK_LONGEST_KEY = 'fjalingo_daily_longest_streak';
const DAILY_STREAK_LAST_DATE_KEY = 'fjalingo_daily_last_date';
const UNLOCKED_ACHIEVEMENTS_KEY = 'fjalingo_unlocked_achievements';

function todayUtcString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function yesterdayUtcString() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function readGuestProgress() {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    return raw
      ? JSON.parse(raw)
      : { xp: 0, total_quizzes: 0, correct_answers: 0, streak: 0 };
  } catch {
    return { xp: 0, total_quizzes: 0, correct_answers: 0, streak: 0 };
  }
}

function writeGuestProgress(progress) {
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progress));
}

function computeLevelFromXp(xp) {
  // Mirrors backend formula: floor(sqrt(xp/100)) + 1
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

// ─────────────────────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────────────────────
export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function initTheme() {
  const theme = getTheme();
  setTheme(theme);
  return theme;
}

// ─────────────────────────────────────────────────────────────
// Daily challenge helpers (client-side; used by DailyChallengeCard)
// ─────────────────────────────────────────────────────────────
export async function getStreak() {
  const gp = readGuestProgress();
  const longest = Number(localStorage.getItem(DAILY_STREAK_LONGEST_KEY) || 0) || 0;
  return {
    current_streak: Number(gp.streak || 0) || 0,
    longest_streak: longest,
  };
}

export async function updateStreak() {
  const gp = readGuestProgress();
  const last = localStorage.getItem(DAILY_STREAK_LAST_DATE_KEY);
  const today = todayUtcString();
  const yesterday = yesterdayUtcString();

  let nextStreak = Number(gp.streak || 0) || 0;
  if (last === today) {
    // already counted today
  } else if (last === yesterday) {
    nextStreak = nextStreak + 1;
  } else {
    nextStreak = 1;
  }

  gp.streak = nextStreak;
  writeGuestProgress(gp);
  localStorage.setItem(DAILY_STREAK_LAST_DATE_KEY, today);

  const prevLongest = Number(localStorage.getItem(DAILY_STREAK_LONGEST_KEY) || 0) || 0;
  const nextLongest = Math.max(prevLongest, nextStreak);
  localStorage.setItem(DAILY_STREAK_LONGEST_KEY, String(nextLongest));

  return { current_streak: nextStreak, longest_streak: nextLongest };
}

export async function awardPoints(points = 0) {
  const add = Number(points) || 0;
  if (add <= 0) return { xp: readGuestProgress().xp || 0, level: computeLevelFromXp(readGuestProgress().xp || 0) };

  const gp = readGuestProgress();
  gp.xp = (Number(gp.xp) || 0) + add;

  // Optional: keep level in guest progress for components that expect it later.
  gp.level = computeLevelFromXp(gp.xp);

  writeGuestProgress(gp);
  return { xp: gp.xp, level: gp.level };
}

// ─────────────────────────────────────────────────────────────
// Achievements (client-side)
// ─────────────────────────────────────────────────────────────
export function unlockAchievement(key) {
  if (!key) return false;
  try {
    const raw = localStorage.getItem(UNLOCKED_ACHIEVEMENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const set = new Set(Array.isArray(arr) ? arr : []);
    const before = set.size;
    set.add(String(key));
    if (set.size !== before) {
      localStorage.setItem(UNLOCKED_ACHIEVEMENTS_KEY, JSON.stringify([...set]));
      return true;
    }
    return false;
  } catch {
    // If storage is blocked/corrupted, fail silently.
    return false;
  }
}
