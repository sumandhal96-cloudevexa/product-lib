import type { Product } from '../domain/product.ts';
import { NotFoundError } from '../domain/errors.ts';
import type { ProductProvider } from '../ports/productProvider.ts';
import type { Logger } from '../logger.ts';

export interface CatalogueOptions {
  /** Curated "top rated" product ids shown on the home page, in display order. */
  featuredIds: number[];
  /** How many top-rated products lead a category page. */
  categoryTopRatedCount: number;
}

export interface CategoryListing {
  category: string;
  topRated: Product[];
  additional: Product[];
}

export class CatalogueService {
  private readonly provider: ProductProvider;
  private readonly options: CatalogueOptions;
  private readonly logger: Logger;

  constructor(provider: ProductProvider, options: CatalogueOptions, logger: Logger) {
    this.provider = provider;
    this.options = options;
    this.logger = logger;
  }

  /** Home page: the products the business chose. Ids missing from the source are skipped. */
  async getFeatured(): Promise<Product[]> {
    const all = await this.provider.listProducts();
    const byId = new Map(all.map((p) => [p.id, p]));
    const featured: Product[] = [];
    for (const id of this.options.featuredIds) {
      const product = byId.get(id);
      if (product) featured.push(product);
      else this.logger.warn('Featured product not found in source', { productId: id });
    }
    return featured;
  }

  async listCategories(): Promise<string[]> {
    const all = await this.provider.listProducts();
    return [...new Set(all.map((p) => p.category))].sort((a, b) => a.localeCompare(b));
  }

  /** Category page: best rated first (rating, then review count), then everything else. */
  async getCategory(name: string): Promise<CategoryListing> {
    const wanted = name.trim().toLowerCase();
    const all = await this.provider.listProducts();
    const inCategory = all.filter((p) => p.category.toLowerCase() === wanted);
    const first = inCategory[0];
    if (!first) throw new NotFoundError('Category not found');

    const ranked = [...inCategory].sort(
      (a, b) => b.rating.rate - a.rating.rate || b.rating.count - a.rating.count || a.id - b.id,
    );
    const topRated = ranked.slice(0, this.options.categoryTopRatedCount);
    const topIds = new Set(topRated.map((p) => p.id));
    return {
      category: first.category,
      topRated,
      additional: inCategory.filter((p) => !topIds.has(p.id)),
    };
  }

  /** Case-insensitive substring match on title, description or category. */
  async search(term: string): Promise<Product[]> {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    const all = await this.provider.listProducts();
    return all.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }

  async getProduct(id: number): Promise<Product> {
    const product = await this.provider.getProduct(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }
}
