// Single source of truth for "may this user skip the free-tier limits?".
//
// Admins always have unlimited access. Regular users get it only with an active
// premium entitlement. Premium status lives in the `entitlements` table (not on
// the user row), so the entitlements middleware computes the `isPremium` flag and
// passes it here — this helper just adds the admin bypass on top, in ONE place,
// so every gate decides the same way.
function hasUnlimitedAccess(user, isPremium = false) {
  return user?.role === 'admin' || isPremium === true;
}

module.exports = { hasUnlimitedAccess };
