import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.ts';

const base = { SMTP_HOST: 'mailpit', MAIL_FROM: 'a@b.co', SALES_INBOX_EMAIL: 'sales@b.co' };

describe('loadConfig', () => {
  it('applies sensible defaults', () => {
    const config = loadConfig(base);
    assert.equal(config.port, 3000);
    assert.deepEqual(config.featuredProductIds, [3, 5, 7, 11, 12]);
    assert.equal(config.fakeStoreBaseUrl, 'https://fakestoreapi.com');
  });

  it('fails fast and lists every problem', () => {
    assert.throws(
      () => loadConfig({ SALES_INBOX_EMAIL: 'nope', FEATURED_PRODUCT_IDS: '1,abc' }),
      (err: Error) =>
        /SMTP_HOST is required/.test(err.message) &&
        /MAIL_FROM is required/.test(err.message) &&
        /SALES_INBOX_EMAIL must be an email/.test(err.message) &&
        /FEATURED_PRODUCT_IDS/.test(err.message),
    );
  });

  it('parses featured ids and cors origins', () => {
    const config = loadConfig({ ...base, FEATURED_PRODUCT_IDS: '2, 4', CORS_ORIGINS: 'http://a.test, http://b.test' });
    assert.deepEqual(config.featuredProductIds, [2, 4]);
    assert.deepEqual(config.corsOrigins, ['http://a.test', 'http://b.test']);
  });
});
