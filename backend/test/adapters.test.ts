import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CachedProductProvider } from '../src/adapters/cachedProductProvider.ts';
import { FakeStoreProductProvider } from '../src/adapters/fakeStoreProductProvider.ts';
import { UpstreamError } from '../src/domain/errors.ts';
import { InMemoryProvider } from './fixtures.ts';

const fakeStoreItem = {
  id: 1,
  title: 'Backpack',
  price: 109.95,
  description: 'Fits 15 inch laptops',
  category: "men's clothing",
  image: 'https://fakestoreapi.com/img/1.jpg',
  rating: { rate: 3.9, count: 120 },
};

const stubFetch = (status: number, body: string): typeof fetch =>
  (async () => new Response(body, { status })) as typeof fetch;

describe('FakeStoreProductProvider', () => {
  it('maps the vendor shape into our Product model', async () => {
    const provider = new FakeStoreProductProvider('https://x.test/', stubFetch(200, JSON.stringify([fakeStoreItem])));
    const [product] = await provider.listProducts();
    assert.deepEqual(product, {
      id: 1,
      title: 'Backpack',
      description: 'Fits 15 inch laptops',
      price: 109.95,
      category: "men's clothing",
      imageUrl: 'https://fakestoreapi.com/img/1.jpg',
      rating: { rate: 3.9, count: 120 },
    });
  });

  it('drops malformed records and non-http image urls', async () => {
    const body = JSON.stringify([fakeStoreItem, { id: 'x' }, null, { ...fakeStoreItem, id: 2, image: 'javascript:alert(1)' }]);
    const products = await new FakeStoreProductProvider('https://x.test', stubFetch(200, body)).listProducts();
    assert.deepEqual(products.map((p) => p.id), [1, 2]);
    assert.equal(products[1]!.imageUrl, '');
  });

  it('treats Fake Store\'s empty 200 response for an unknown id as "not found"', async () => {
    const provider = new FakeStoreProductProvider('https://x.test', stubFetch(200, ''));
    assert.equal(await provider.getProduct(9999), null);
  });

  it('wraps upstream errors and network failures in UpstreamError', async () => {
    await assert.rejects(new FakeStoreProductProvider('https://x.test', stubFetch(500, 'boom')).listProducts(), UpstreamError);
    const failing = (async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;
    await assert.rejects(new FakeStoreProductProvider('https://x.test', failing).listProducts(), UpstreamError);
  });

  it('rejects a response that is not a list', async () => {
    await assert.rejects(
      new FakeStoreProductProvider('https://x.test', stubFetch(200, '{"a":1}')).listProducts(),
      UpstreamError,
    );
  });
});

describe('CachedProductProvider', () => {
  it('serves repeat calls from cache until the TTL expires', async () => {
    let now = 0;
    const inner = new InMemoryProvider();
    const cached = new CachedProductProvider(inner, 60, () => now);

    await cached.listProducts();
    await cached.listProducts();
    assert.equal(inner.listCalls, 1);

    now = 61_000;
    await cached.listProducts();
    assert.equal(inner.listCalls, 2);
  });

  it('does not cache failures', async () => {
    let calls = 0;
    const flaky = {
      async listProducts() {
        calls++;
        if (calls === 1) throw new Error('down');
        return [];
      },
      async getProduct() {
        return null;
      },
    };
    const cached = new CachedProductProvider(flaky, 60);
    await assert.rejects(cached.listProducts());
    assert.deepEqual(await cached.listProducts(), []);
  });
});
