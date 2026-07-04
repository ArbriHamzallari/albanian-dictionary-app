Content for the importer (docs/plan/content-pipeline.md):
- origins.json      — the five origin histories (upserted)
- batches/*.json    — reviewed word batches, e.g. 2026-07-05-turkish-set-3.json
Import with: npm run import:words -- backend/content/<file>.json
