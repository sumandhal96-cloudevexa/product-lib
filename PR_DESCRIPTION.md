# Product catalogue: browse, search and enquire

## What this adds

A web product catalogue with a Node/TypeScript API and a React/TypeScript client.

- Home page with 5 curated top-rated products
- Category pages: top rated first, then additional products
- Search by term, product detail page
- Enquiry form: emails the sales inbox and shows a Thank you message

Run it: `docker compose up --build`, then open http://localhost:8080 (emails appear at http://localhost:8025).

## Key design choices

- Ports and adapters: `ProductProvider` and `EmailSender` are interfaces; Fake Store and SMTP are adapters chosen in one composition root. The client only calls our API.
- Business rules are in framework-free services and are unit-tested.
- Security basics: server-side validation, rate limiting, helmet, CORS allow-list, email header injection protection, no PII in logs, fail-fast config.

## Assumptions and cuts

See [DECISIONS.md](DECISIONS.md). The main ones: featured list is configured, category "top rated" is by rating, enquiries are not persisted, no pagination.

## Testing

- Backend: services, validation, adapters, config, HTTP contract (`cd backend && npm test`)
- Frontend: API client, enquiry form, page flows (`cd frontend && npm test`)

## AI usage

See [AI_USAGE.md](AI_USAGE.md).

## Reviewer checklist

- [ ] `docker compose up --build` works from a clean checkout
- [ ] Enquiry email appears in Mailpit
- [ ] Tests pass in both folders
