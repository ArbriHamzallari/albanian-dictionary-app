// Canonical list of preset avatars — the single source of truth the backend uses
// to (a) serve the picker via GET /avatars and (b) validate PUT /profile/avatar.
//
// The matching PNG files live in frontend/public/avatars and are served by the
// frontend origin (the <Avatar> component loads /avatars/<file>). The backend
// deploys WITHOUT the frontend (see Dockerfile / .dockerignore), so it must not
// read that directory — doing so threw "Avatars directory not found" in
// production, leaving the picker empty (FEAT-2). It only needs the names here.
//
// Keep this list in sync with frontend/public/avatars/*.png.
const AVATAR_FILENAMES = [
  'bear.png',
  'bird.png',
  'book.png',
  'brain.png',
  'cat.png',
  'crown.png',
  'default.png',
  'dragon.png',
  'eagle.png',
  'fox.png',
  'lion.png',
  'owl.png',
  'panda.png',
  'parrot.png',
  'penguin.png',
  'robot.png',
  'rocket.png',
  'snail.png',
  'think.png',
];

function getAvatarList() {
  return [...AVATAR_FILENAMES];
}

function isValidAvatar(filename) {
  return AVATAR_FILENAMES.includes(filename);
}

module.exports = { getAvatarList, isValidAvatar, AVATAR_FILENAMES };
