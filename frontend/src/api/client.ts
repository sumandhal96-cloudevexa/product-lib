import type { CategoryListing, EnquiryRequest, Product } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Same-origin '/api' by default (Vite proxy in dev, nginx in Docker). Override to point at another host.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Please check your connection and try again.');
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body: fall through to the generic error below.
  }

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Something went wrong', err?.fields);
  }
  return body as T;
}

export const api = {
  featured: () => request<{ products: Product[] }>('/products/featured').then((r) => r.products),
  categories: () => request<{ categories: string[] }>('/categories').then((r) => r.categories),
  category: (name: string) => request<CategoryListing>(`/categories/${encodeURIComponent(name)}/products`),
  search: (q: string) => request<{ products: Product[] }>(`/products?q=${encodeURIComponent(q)}`).then((r) => r.products),
  product: (id: number) => request<{ product: Product }>(`/products/${id}`).then((r) => r.product),
  submitEnquiry: (enquiry: EnquiryRequest) =>
    request<{ status: string }>('/enquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(enquiry),
    }),
};
