import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api/client';
import type { Product } from './api/types';
import { App } from './App';

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
  return {
    ...actual,
    api: { featured: vi.fn(), categories: vi.fn(), category: vi.fn(), search: vi.fn(), product: vi.fn(), submitEnquiry: vi.fn() },
  };
});

const make = (id: number, title: string): Product => ({
  id,
  title,
  description: `About ${title}`,
  price: 20,
  category: 'jewelery',
  imageUrl: '',
  rating: { rate: 4.2, count: 10 },
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  beforeEach(() => {
    vi.mocked(api.categories).mockResolvedValue(['electronics', 'jewelery']);
  });

  it('home page shows the featured products', async () => {
    vi.mocked(api.featured).mockResolvedValue([make(1, 'Gold Ring'), make(2, 'Silver Necklace')]);
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Gold Ring' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Silver Necklace' })).toBeInTheDocument();
  });

  it('navigation lists categories and the category page shows top rated then more', async () => {
    vi.mocked(api.category).mockResolvedValue({ category: 'jewelery', topRated: [make(1, 'Gold Ring')], additional: [make(2, 'Plain Chain')] });
    renderAt('/categories/jewelery');
    expect(await screen.findByRole('heading', { name: 'Top rated' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'More in this category' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Electronics' })).toBeInTheDocument();
  });

  it('searching from the header shows only the results returned for that term', async () => {
    vi.mocked(api.featured).mockResolvedValue([]);
    vi.mocked(api.search).mockResolvedValue([make(3, 'Pearl Bracelet')]);
    renderAt('/');

    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'pearl');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Pearl Bracelet' })).toBeInTheDocument();
    expect(api.search).toHaveBeenCalledWith('pearl');
  });

  it('shows a friendly message when nothing matches', async () => {
    vi.mocked(api.search).mockResolvedValue([]);
    renderAt('/search?q=zzz');
    expect(await screen.findByText(/No products match/)).toBeInTheDocument();
  });

  it('product page shows details and reveals the enquiry form on Enquire', async () => {
    vi.mocked(api.product).mockResolvedValue(make(5, 'Gaming Monitor'));
    renderAt('/products/5');
    expect(await screen.findByRole('heading', { name: 'Gaming Monitor', level: 1 })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Enquire' }));
    expect(screen.getByRole('form', { name: 'Product enquiry' })).toBeInTheDocument();
  });

  it('shows an error when the product cannot be loaded', async () => {
    vi.mocked(api.product).mockRejectedValue(new Error('Product not found'));
    renderAt('/products/404');
    expect(await screen.findByRole('alert')).toHaveTextContent('Product not found');
  });
});
