import type { Product } from '../domain/product.ts';
import type { ProductProvider } from '../ports/productProvider.ts';

/**
 * Decorator adding a short in-memory cache to any ProductProvider.
 * Keeps us polite to the upstream and fast; replace with Redis/ElastiCache if we scale out.
 * Failures are never cached.
 */
export class CachedProductProvider implements ProductProvider {
  private readonly inner: ProductProvider;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private cache: { products: Product[]; expiresAt: number } | null = null;

  constructor(inner: ProductProvider, ttlSeconds: number, now: () => number = Date.now) {
    this.inner = inner;
    this.ttlMs = ttlSeconds * 1000;
    this.now = now;
  }

  async listProducts(): Promise<Product[]> {
    if (this.cache && this.cache.expiresAt > this.now()) return this.cache.products;
    const products = await this.inner.listProducts();
    this.cache = { products, expiresAt: this.now() + this.ttlMs };
    return products;
  }

  async getProduct(id: number): Promise<Product | null> {
    const products = await this.listProducts();
    return products.find((p) => p.id === id) ?? this.inner.getProduct(id);
  }
}
