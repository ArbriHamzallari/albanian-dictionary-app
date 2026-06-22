// Minimal cookie parsing (no cookie-parser dependency). Reads the raw Cookie
// header into a { name: value } map. Setting cookies uses Express's built-in
// res.cookie/res.clearCookie, so no parser middleware is required.
function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    out[name] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

module.exports = { parseCookies };
