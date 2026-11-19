import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './client';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

afterEach(() => vi.unstubAllGlobals());

describe('api client', () => {
  it('only ever calls the backend (/api), never the Fake Store directly', async () => {
    const fetchMock = respond(200, { products: [] });
    vi.stubGlobal('fetch', fetchMock);
    await api.featured();
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/products/featured');
  });

  it('url-encodes search terms and category names', async () => {
    const fetchMock = respond(200, { products: [] });
    vi.stubGlobal('fetch', fetchMock);
    await api.search('men & women/jackets');
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/products?q=men%20%26%20women%2Fjackets');
  });

  it('turns an error response into ApiError with field errors', async () => {
    vi.stubGlobal('fetch', respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Bad', fields: { email: 'Nope' } } }));
    await expect(api.submitEnquiry({ productId: 1, name: 'a', email: 'b', message: 'c' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      fields: { email: 'Nope' },
    });
  });

  it('turns a network failure into a friendly ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await api.featured().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('NETWORK');
  });
});
