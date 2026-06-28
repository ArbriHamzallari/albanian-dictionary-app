// Generates frontend/public/sitemap.xml from the words table.
//
// Run in CI before the Netlify build (needs DB access + backend deps):
//   cd backend && npm ci && npm run generate-sitemap
// Configure the public origin with SITE_URL (defaults to the live domain).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/utils/db');

const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://fjalingo.al').replace(/\/$/, '');
const OUT_PATH = path.join(__dirname, '..', '..', 'frontend', 'public', 'sitemap.xml');

// Static, publicly indexable routes (no auth-gated or per-user pages).
const STATIC_ROUTES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/fjala-e-dites', changefreq: 'daily', priority: '0.8' },
  { loc: '/renditja', changefreq: 'daily', priority: '0.6' },
  { loc: '/kuizi', changefreq: 'weekly', priority: '0.6' },
  { loc: '/propozo', changefreq: 'monthly', priority: '0.5' },
  { loc: '/premium', changefreq: 'monthly', priority: '0.5' },
  { loc: '/hyr', changefreq: 'monthly', priority: '0.3' },
  { loc: '/regjistrohu', changefreq: 'monthly', priority: '0.4' },
];

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${SITE_URL}${loc}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

async function main() {
  const { rows } = await pool.query('SELECT id, updated_at FROM words ORDER BY id ASC');

  const wordEntries = rows.map((w) =>
    urlEntry({
      loc: `/fjala/${w.id}`,
      lastmod: w.updated_at ? new Date(w.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: 'monthly',
      priority: '0.7',
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC_ROUTES.map(urlEntry).join('\n')}
${wordEntries.join('\n')}
</urlset>
`;

  fs.writeFileSync(OUT_PATH, xml);
  console.log(`Wrote ${OUT_PATH} with ${STATIC_ROUTES.length} static + ${rows.length} word URLs.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Sitemap generation failed:', err.message);
  pool.end().catch(() => {});
  process.exit(1);
});
