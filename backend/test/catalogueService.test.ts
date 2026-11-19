import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundError } from '../src/domain/errors.ts';
import { silentLogger } from '../src/logger.ts';
import { CatalogueService } from '../src/services/catalogueService.ts';
import { InMemoryProvider } from './fixtures.ts';

const service = (featuredIds = [5, 2, 7, 99], categoryTopRatedCount = 2) =>
  new CatalogueService(new InMemoryProvider(), { featuredIds, categoryTopRatedCount }, silentLogger);

describe('CatalogueService', () => {
  describe('featured (home page)', () => {
    it('returns the curated products in the configured order', async () => {
      const featured = await service().getFeatured();
      assert.deepEqual(featured.map((p) => p.id), [5, 2, 7]);
    });

    it('skips ids that no longer exist in the source instead of failing', async () => {
      const featured = await service([99, 1]).getFeatured();
      assert.deepEqual(featured.map((p) => p.id), [1]);
    });
  });

  describe('categories', () => {
    it('lists unique categories alphabetically', async () => {
      assert.deepEqual(await service().listCategories(), ['electronics', 'jewelery', "men's clothing"]);
    });

    it('puts best rated first (rating, then review count) and the rest as additional', async () => {
      const result = await service().getCategory('jewelery');
      assert.deepEqual(result.topRated.map((p) => p.id), [3, 2]); // 4.5 with 50 reviews beats 4.5 with 20
      assert.deepEqual(result.additional.map((p) => p.id), [1, 4]);
    });

    it('matches the category name case-insensitively', async () => {
      const result = await service().getCategory('  JEWELERY ');
      assert.equal(result.category, 'jewelery');
    });

    it('has no overlap between top rated and additional', async () => {
      const { topRated, additional } = await service().getCategory('jewelery');
      const ids = [...topRated, ...additional].map((p) => p.id);
      assert.equal(new Set(ids).size, ids.length);
    });

    it('throws NotFoundError for an unknown category', async () => {
      await assert.rejects(service().getCategory('toys'), NotFoundError);
    });
  });

  describe('search', () => {
    it('matches title case-insensitively', async () => {
      assert.deepEqual((await service().search('gold')).map((p) => p.id), [1]);
    });

    it('matches description and category text', async () => {
      assert.equal((await service().search('description of product 6')).length, 1);
      assert.equal((await service().search('electronics')).length, 2);
    });

    it('returns only matching products, none when nothing matches', async () => {
      assert.deepEqual(await service().search('zzz-no-match'), []);
    });

    it('returns nothing for a blank term', async () => {
      assert.deepEqual(await service().search('   '), []);
    });
  });

  describe('getProduct', () => {
    it('returns the product', async () => {
      assert.equal((await service().getProduct(3)).title, 'Pearl Bracelet');
    });

    it('throws NotFoundError when missing', async () => {
      await assert.rejects(service().getProduct(404), NotFoundError);
    });
  });
});
