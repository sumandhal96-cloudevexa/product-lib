import type { Product } from '../domain/product.ts';

/**
 * Boundary to wherever products live (Fake Store today; a database or PIM later).
 * Implement this interface and wire it in server.ts - nothing else changes.
 */
export interface ProductProvider {
  listProducts(): Promise<Product[]>;
  /** Resolves null when the product does not exist. */
  getProduct(id: number): Promise<Product | null>;
}
