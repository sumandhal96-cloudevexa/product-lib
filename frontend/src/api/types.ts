/** The API contract as the client sees it. Keep in step with backend/src/domain/product.ts. */
export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  rating: { rate: number; count: number };
}

export interface CategoryListing {
  category: string;
  topRated: Product[];
  additional: Product[];
}

export interface EnquiryRequest {
  productId: number;
  name: string;
  email: string;
  phone?: string;
  message: string;
}
