import { Link } from 'react-router-dom';
import type { Product } from '../api/types';
import { formatPrice, titleCase } from '../format';

export function ProductCard({ product }: { product: Product }) {
  return (
    <li className="card">
      <Link to={`/products/${product.id}`} className="card__link">
        {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" className="card__image" />}
        <span className="card__category">{titleCase(product.category)}</span>
        <h3 className="card__title">{product.title}</h3>
        <span className="card__meta">
          <strong>{formatPrice(product.price)}</strong>
          <span aria-label={`Rated ${product.rating.rate} out of 5`}>★ {product.rating.rate.toFixed(1)}</span>
        </span>
      </Link>
    </li>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return <p className="status">No products to show.</p>;
  return (
    <ul className="grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}
