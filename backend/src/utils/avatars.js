const fs = require('fs');
const path = require('path');

// --- Directory resolution ---
function resolveAvatarsDir() {
  // 1. Explicit env override
  if (process.env.AVATARS_DIR) {
    const dir = path.resolve(process.env.AVATARS_DIR);
    if (fs.existsSync(dir)) return dir;
  }

  // 2. Common relative locations (backend cwd 
  // 
  // or project root)
  const candidates = [
    path.resolve(process.cwd(), 'frontend', 'public', 'avatars'),
    path.resolve(process.cwd(), '..', 'frontend', 'public', 'avatars'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }

  return null;
}

// --- In-memory cache (5 minutes) ---
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { list: null, fetchedAt: 0 };

function getAvatarList() {
  const now = Date.now();
  if (cache.list && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.list;
  }

  const dir = resolveAvatarsDir();
  if (!dir) {
    throw new Error('Avatars directory not found. Set AVATARS_DIR env or ensure frontend/public/avatars exists.');
  }

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  cache = { list: files, fetchedAt: now };
  return files;
}

function isValidAvatar(filename) {
  const list = getAvatarList();
  return list.includes(filename);
}

module.exports = { getAvatarList, isValidAvatar, resolveAvatarsDir };
