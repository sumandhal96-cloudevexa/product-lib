import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/http/app.ts';
import { silentLogger } from '../src/logger.ts';
import { CatalogueService } from '../src/services/catalogueService.ts';
import { EnquiryService } from '../src/services/enquiryService.ts';
import { FakeMailer, InMemoryProvider, validEnquiry } from './fixtures.ts';

describe('HTTP API', () => {
  let server: Server;
  let base: string;

  before(async () => {
    const provider = new InMemoryProvider();
    const app = createApp({
      catalogue: new CatalogueService(provider, { featuredIds: [5, 2, 7, 3, 1], categoryTopRatedCount: 2 }, silentLogger),
      enquiries: new EnquiryService(provider, new FakeMailer(), { salesInbox: 's@x.test', from: 'c@x.test' }, silentLogger),
      logger: silentLogger,
      corsOrigins: ['http://allowed.test'],
      trustProxy: 0,
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(() => {
    server.close();
  });

  const post = (body: unknown) =>
    fetch(`${base}/api/enquiries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  it('GET /api/products/featured returns the 5 curated products', async () => {
    const res = await fetch(`${base}/api/products/featured`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { products: { id: number }[] };
    assert.deepEqual(body.products.map((p) => p.id), [5, 2, 7, 3, 1]);
  });

  it('GET /api/categories/:name/products returns topRated then additional', async () => {
    const res = await fetch(`${base}/api/categories/jewelery/products`);
    const body = (await res.json()) as { topRated: { id: number }[]; additional: { id: number }[] };
    assert.deepEqual(body.topRated.map((p) => p.id), [3, 2]);
    assert.deepEqual(body.additional.map((p) => p.id), [1, 4]);
  });

  it('unknown category is a 404 with a JSON error', async () => {
    const res = await fetch(`${base}/api/categories/toys/products`);
    assert.equal(res.status, 404);
    assert.equal(((await res.json()) as { error: { code: string } }).error.code, 'NOT_FOUND');
  });

  it('GET /api/products?q= returns only matches; a missing term is a 400', async () => {
    const hit = (await (await fetch(`${base}/api/products?q=monitor`)).json()) as { products: { id: number }[] };
    assert.deepEqual(hit.products.map((p) => p.id), [5]);
    assert.equal((await fetch(`${base}/api/products`)).status, 400);
    assert.equal((await fetch(`${base}/api/products?q=a&q=b`)).status, 400);
  });

  it('GET /api/products/:id returns the product, 404 when missing, 400 when malformed', async () => {
    assert.equal((await fetch(`${base}/api/products/3`)).status, 200);
    assert.equal((await fetch(`${base}/api/products/999`)).status, 404);
    assert.equal((await fetch(`${base}/api/products/abc`)).status, 400);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('POST /api/enquiries validates input with field errors', async () => {
    const res = await post({ productId: 2 });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: { fields: Record<string, string> } };
    assert.ok(body.error.fields.name && body.error.fields.email && body.error.fields.message);
  });

  it('POST /api/enquiries rejects malformed JSON with 400, not 500', async () => {
    assert.equal((await post('{not json')).status, 400);
  });

  it('POST /api/enquiries rejects oversized bodies', async () => {
    assert.equal((await post({ ...validEnquiry, message: 'x'.repeat(20_000) })).status, 413);
  });

});

/** Spins up a dedicated app so each scenario starts with a clean rate-limit window. */
async function withApp(
  mailer: FakeMailer,
  enquiryRateLimit: { windowMs: number; limit: number } | undefined,
  run: (post: () => Promise<Response>) => Promise<void>,
) {
  const provider = new InMemoryProvider();
  const app = createApp({
    catalogue: new CatalogueService(provider, { featuredIds: [], categoryTopRatedCount: 2 }, silentLogger),
    enquiries: new EnquiryService(provider, mailer, { salesInbox: 's@x.test', from: 'c@x.test' }, silentLogger),
    logger: silentLogger,
    corsOrigins: [],
    trustProxy: 0,
    ...(enquiryRateLimit ? { enquiryRateLimit } : {}),
  });
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/enquiries`;
  try {
    await run(() =>
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validEnquiry) }),
    );
  } finally {
    server.close();
  }
}

describe('HTTP API enquiry behaviour', () => {
  it('returns 201 and sends one email on success', async () => {
    const mailer = new FakeMailer();
    await withApp(mailer, undefined, async (submit) => {
      assert.equal((await submit()).status, 201);
      assert.equal(mailer.sent.length, 1);
    });
  });

  it('rate-limits repeated enquiries from one client with 429', async () => {
    const mailer = new FakeMailer();
    await withApp(mailer, { windowMs: 60_000, limit: 2 }, async (submit) => {
      assert.equal((await submit()).status, 201);
      assert.equal((await submit()).status, 201);
      assert.equal((await submit()).status, 429);
      assert.equal(mailer.sent.length, 2);
    });
  });

  it('never reports success when email fails: unexpected errors become a generic 500 with no detail', async () => {
    const mailer = new FakeMailer();
    mailer.fail = true;
    await withApp(mailer, undefined, async (submit) => {
      const res = await submit();
      assert.equal(res.status, 500);
      assert.ok(!(await res.text()).includes('smtp down'));
    });
  });
});
