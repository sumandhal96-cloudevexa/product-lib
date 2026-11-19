import type { Product } from '../domain/product.ts';
import { UpstreamError } from '../domain/errors.ts';
import type { ProductProvider } from '../ports/productProvider.ts';

type FetchFn = typeof fetch;

/**
 * Adapter for https://fakestoreapi.com. This is the ONLY file that knows its shape.
 * Upstream data is untrusted: every record is checked and mapped into our Product model.
 */
export class FakeStoreProductProvider implements ProductProvider {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(baseUrl: string, fetchFn: FetchFn = fetch, timeoutMs = 5000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchFn = fetchFn;
    this.timeoutMs = timeoutMs;
  }

  async listProducts(): Promise<Product[]> {
    const body = await this.get('/products');
    if (!Array.isArray(body)) throw new UpstreamError('UPSTREAM_BAD_RESPONSE', 'Product source returned an unexpected response');
    return body.map(toProduct).filter((p): p is Product => p !== null);
  }

  async getProduct(id: number): Promise<Product | null> {
    const body = await this.get(`/products/${encodeURIComponent(String(id))}`);
    return toProduct(body);
  }

  private async get(path: string): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new UpstreamError('UPSTREAM_UNAVAILABLE', 'Product source is unavailable');
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new UpstreamError('UPSTREAM_ERROR', 'Product source returned an error');
    // Fake Store answers 200 with an empty body for unknown ids, so read text first.
    const text = await res.text();
    if (text.trim() === '') return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new UpstreamError('UPSTREAM_BAD_RESPONSE', 'Product source returned an unexpected response');
    }
  }
}

function toProduct(raw: unknown): Product | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r.id !== 'number' ||
    typeof r.title !== 'string' ||
    typeof r.price !== 'number' ||
    typeof r.category !== 'string' ||
    typeof r.description !== 'string'
  ) {
    return null;
  }
  const rating = (typeof r.rating === 'object' && r.rating !== null ? r.rating : {}) as Record<string, unknown>;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    price: r.price,
    category: r.category,
    imageUrl: typeof r.image === 'string' && /^https?:\/\//i.test(r.image) ? r.image : '',
    rating: {
      rate: typeof rating.rate === 'number' ? rating.rate : 0,
      count: typeof rating.count === 'number' ? rating.count : 0,
    },
  };
}
