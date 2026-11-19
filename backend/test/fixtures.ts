import type { Product } from '../src/domain/product.ts';
import type { EmailMessage, EmailSender } from '../src/ports/emailSender.ts';
import type { ProductProvider } from '../src/ports/productProvider.ts';

export const product = (id: number, category: string, rate: number, count = 10, title = `Product ${id}`): Product => ({
  id,
  title,
  description: `Description of product ${id}`,
  price: 10 + id,
  category,
  imageUrl: `https://img.example/${id}.png`,
  rating: { rate, count },
});

export const PRODUCTS: Product[] = [
  product(1, 'jewelery', 3.0, 5, 'Gold Ring'),
  product(2, 'jewelery', 4.5, 20, 'Silver Necklace'),
  product(3, 'jewelery', 4.5, 50, 'Pearl Bracelet'),
  product(4, 'jewelery', 2.0, 8, 'Plain Chain'),
  product(5, 'electronics', 4.8, 30, 'Gaming Monitor'),
  product(6, 'electronics', 3.9, 12, 'USB Drive'),
  product(7, "men's clothing", 4.1, 70, 'Cotton Jacket'),
];

export class InMemoryProvider implements ProductProvider {
  listCalls = 0;
  products: Product[];
  constructor(products: Product[] = PRODUCTS) {
    this.products = products;
  }
  async listProducts() {
    this.listCalls++;
    return this.products;
  }
  async getProduct(id: number) {
    return this.products.find((p) => p.id === id) ?? null;
  }
}

export class FakeMailer implements EmailSender {
  sent: EmailMessage[] = [];
  fail = false;
  async send(message: EmailMessage) {
    if (this.fail) throw new Error('smtp down');
    this.sent.push(message);
  }
}

export const validEnquiry = {
  productId: 2,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+44 20 7946 0958',
  message: 'Is this available in gold?',
};
