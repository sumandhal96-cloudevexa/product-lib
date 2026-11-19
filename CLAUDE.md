# Agent instructions

Product catalogue: React + TypeScript frontend, Node + TypeScript backend. Read README.md and DECISIONS.md first.

## Architecture rules (do not break)

- The browser only calls `/api` on the backend. Never call Fake Store from the frontend.
- The backend depends on interfaces in `backend/src/ports/`. Only `src/adapters/` knows vendor shapes (Fake Store, SMTP). Only `src/server.ts` chooses adapters.
- Business rules live in `src/services/` and must not import Express.
- Look and feel changes belong in `frontend/src/styles.css` tokens, not scattered inline styles.

## Conventions

- Backend runs TypeScript natively on Node 22 (type stripping): relative imports end in `.ts`, use `import type` for types, no enums, namespaces or constructor parameter properties.
- Tests: backend `node:test` (`npm test`), frontend Vitest + Testing Library. A behaviour change needs a test.
- Validate all input on the server with allow-lists. Never log customer PII. No secrets in code or committed files; configuration through env vars documented in `.env.example`.
- Errors shown to clients must be generic apart from `AppError` messages.
- Add a dependency only when needed; prefer well-maintained, permissively licensed packages (MIT/BSD/Apache/ISC).

## Before finishing a change

Run `npm run typecheck` and `npm test` in the folder you changed, and update DECISIONS.md if you changed an assumption.
