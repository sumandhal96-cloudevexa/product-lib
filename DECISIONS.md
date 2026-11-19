# Decisions and assumptions

## Assumptions (where the acceptance criteria were unclear)

1. **"Top rated" on the home page is a curated list.** The criteria say the business "has chosen 5 products", so the ids come from `FEATURED_PRODUCT_IDS` (default `3,5,7,11,12`). Ids missing from the source are skipped with a warning, so the page degrades rather than breaks. Alternative considered: sort by rating. Rejected because the business, not the data, decides.
2. **"Top rated" on a category page is data-driven.** There is no curated list per category, so the best 3 by rating (ties broken by review count, then id) lead the page. Everything else follows as "additional". The count is `CATEGORY_TOP_RATED_COUNT`. Top-rated and additional never overlap.
3. **Search** is a case-insensitive substring match of the whole term against title, description and category. Term is 1 to 100 characters. No stemming, tokenising or ranking yet.
4. **Enquiry fields:** name, email, optional phone, message (max 2000), and the product being enquired about. No account, no login. The Thank you message is shown only after the email was accepted by the mail server.
5. **Customers are anonymous**, so there is no authentication. The catalogue is public data. Enquiries contain personal data (PII), so they are validated, size-limited, rate-limited and never logged.
6. **Prices are shown in USD** because that is what Fake Store provides. Currency would come from the real source later.
7. **Category URLs use the category name** (`/categories/jewelery`) because Fake Store has no category ids. A real source would introduce slugs or ids behind the provider.

## Requirements simplified or dropped

| Item | Decision | Why |
|---|---|---|
| Persisting enquiries | Not stored; email is the only record | No DB needed for the brief; adds setup. Risk: if the mail server is down the enquiry is lost. The customer is told so (error, not Thank you), so they can retry. |
| Pagination | Not implemented | The source has 20 products. The service layer is the place to add it. |
| Admin UI to choose featured products | Config value instead | Out of scope for MVP; config is the simplest thing that satisfies the criterion. |
| CAPTCHA / honeypot | Per-IP rate limit only (5 enquiries / 15 min) | Keeps the form accessible; strengthen if spam appears. |
| Look and feel | Minimal CSS built on design tokens | Creative work is in progress elsewhere; all colours and spacing are in `:root` variables. |
| Browser / E2E tests | Not included | Time-box. API tests exercise the real Express app and UI tests mock only the API client. |

## How the design supports growth beyond the PoC

- **Product source is replaceable.** `ProductProvider` is the only thing the services know. Moving to a database or PIM means writing one adapter and changing one line in `server.ts`. Fake Store's response shape lives in one file, and records are validated and mapped into our own `Product` model.
- **Email provider is replaceable.** `EmailSender` is an interface; `SmtpEmailSender` works with Mailpit locally and with SES SMTP credentials in AWS. SendGrid, Postmark etc. would be new adapters.
- **Look and feel is replaceable.** Styles are design tokens in one stylesheet; components carry no inline styling. Swapping in a design system or the creative team's CSS does not touch logic.
- **Client never talks to the data source.** The client only calls `/api` on its own origin. The API contract is typed in `frontend/src/api/types.ts`.
- **Business rules are framework-free.** `CatalogueService` and `EnquiryService` take their dependencies by constructor, so they are unit-tested without HTTP, and could move behind another transport (Lambda, GraphQL) unchanged.
- **AWS-compatible.** Two stateless containers (12-factor config through environment variables). Frontend static files could instead go to S3 + CloudFront. Mailpit is replaced by SES.
- **Caching** is a decorator around any provider, so it can become Redis/ElastiCache without touching callers.

## Security basics applied

Server-side allow-list validation on every input; body size limit (10 KB); rate limiting (general and strict on enquiries); helmet security headers; CORS allow-list; email header injection prevented (CR/LF stripped, strict email regex, plain-text body only, no HTML); generic error responses (no stack traces or upstream detail); no PII in logs; secrets only through environment (nothing committed, `.env` ignored); containers run as non-root; upstream data validated and image URLs restricted to http(s); the app refuses to start on invalid configuration.

## What I would do next with another day

1. Persist enquiries (Postgres/DynamoDB) with an outbox so a mail outage never loses a lead, and send a confirmation to the customer.
2. Real featured/category management: admin area behind SSO (OIDC), instead of an env var.
3. Pagination and better search (tokenised, ranked; or a search service) once the data is real.
4. A Playwright smoke test of the full journey against docker compose, and contract tests between client types and API.
5. IaC (CDK/Terraform) for ECS Fargate + SES, plus CI image scans (Mend/Trivy).
6. Generate the API types from an OpenAPI spec so frontend and backend cannot drift.
7. Observability: request ids, metrics, alerting on enquiry failures.
8. Accessibility audit and the real design system.
