# Product Catalogue (PoC foundation)

Search and browse a product catalogue, and send an enquiry to the sales inbox.

| Layer | Choice | Why |
|---|---|---|
| Client | React 18 + TypeScript (Vite) | Web needs no emulator, fastest for a reviewer to run; TS gives a typed API contract. |
| Backend | Node.js 22 + TypeScript (Express) | Same language across the stack; small surface; easy to containerise for AWS (ECS Fargate / App Runner). |
| Email (local) | Mailpit via SMTP | Catches mail locally, so no paid account or real email is needed. SMTP also works with Amazon SES. |
| Data | Fake Store API, **only through the backend** | Behind a `ProductProvider` interface so it can be swapped. |

## Run it (about 5 minutes)

Requires Docker Desktop (or Docker + Compose v2).

```bash
docker compose up --build
```

- Web app: http://localhost:8080
- Sales inbox (Mailpit): http://localhost:8025 — submit an enquiry and the email appears here
- API: http://localhost:8080/api/health (proxied by nginx)

The backend needs internet access to reach `https://fakestoreapi.com`.

Optional configuration: copy `.env.example` to `.env` (sales inbox address, featured product ids, product source URL).

### Without Docker

Needs Node 22.18+ and a running Mailpit (`docker compose up mailpit`) or any SMTP server.

```bash
cd backend  && cp .env.example .env && npm install && npm run dev    # API on :3000
cd frontend && npm install && npm run dev                            # UI on :5173 (proxies /api)
```

## Tests

```bash
cd backend  && npm test        # node:test, no extra test framework
cd frontend && npm test        # vitest + Testing Library
npm run typecheck              # in either folder
```

## How the acceptance criteria map to the code

| Criterion | Endpoint | UI |
|---|---|---|
| Home shows 5 top-rated products | `GET /api/products/featured` | `HomePage` |
| Category: top rated, then additional | `GET /api/categories/:name/products` | `CategoryPage` |
| Search | `GET /api/products?q=` | header `SearchBar`, `SearchPage` |
| Product details | `GET /api/products/:id` | `ProductPage` |
| Enquiry emails sales, shows "Thank you" | `POST /api/enquiries` | `EnquiryForm` |

## Layout

```
backend/src
  domain/      Product model, errors (no framework imports)
  ports/       ProductProvider, EmailSender interfaces  <- the seams
  adapters/    FakeStore provider, cache decorator, SMTP sender
  services/    CatalogueService, EnquiryService (business rules)
  validation/  enquiry input validation
  http/        Express app: routes, security middleware, error mapping
  server.ts    composition root: the only place adapters are chosen
frontend/src
  api/         typed client (the only code that calls fetch)
  pages/ components/ hooks/ styles.css (design tokens)
```

## Other documents

- [DECISIONS.md](DECISIONS.md): assumptions, cuts, growth path, next steps
- [AI_USAGE.md](AI_USAGE.md): AI tools, prompts, mistakes caught, time spent
- [CLAUDE.md](CLAUDE.md): instructions given to the AI agent
