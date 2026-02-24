# Inventario App

SvelteKit-based inventory application backed by Postgres (Neon). Includes DB migrations, seeding, and environment-aware login labeling.

## Prerequisites
- Node 18+
- Postgres database URL (Neon recommended)

## Environment
Create `.env` with at least:
```
POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your-long-secret
DATA=development  # label shown on login (e.g., development, demo, comesa)
```

## Install
```
npm install
```

## Run (dev)
```
npm run dev
```

## Migrations
We use node-pg-migrate via `scripts/run-migrate.js`.
- Apply: `npm run migrate:apply`
- Down:  `npm run migrate:down`

Current migrations:
- 20260223-003-init-js.js: creates schema
- 20260223-004-seed-admin.js: seeds admin role/user (phone 99999999, PIN 9999; hashed)
- 20260223-005-seed-menu-data.js: seeds roles 1-3, menu categories/items, and role links

If schemas change, add a new migration file (do not edit applied ones), then run `npm run migrate:apply`.

## Seeding
`npm run migrate:apply` will also run the seed migrations listed above. Admin default:
- Phone: 99999999
- PIN:   9999

## Database docs
Regenerate DBML from the database:
```
npm run generate-schema
```
Outputs: `toma-inventario-schema.dbml`

## Testing
```
npm test
```

## Deployment
Use `@sveltejs/adapter-vercel`. Set env vars in Vercel (POSTGRES_URL, JWT_SECRET, DATA). Run migrations against the target DB before or during deploy (one-time per release):
```
npm run migrate:apply
```

## Notes
- Login page shows DATA label below the title (red, right-aligned) so users know which dataset they are accessing.
- DB clients are configured for Neon SSL.
