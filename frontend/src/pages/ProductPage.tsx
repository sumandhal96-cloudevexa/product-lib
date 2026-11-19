import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { EnquiryForm } from '../components/EnquiryForm';
import { ErrorMessage, Loading } from '../components/Status';
import { formatPrice, titleCase } from '../format';
import { useAsync } from '../hooks/useAsync';

export function ProductPage() {
  const { id } = useParams();
  const productId = Number(id);
  const [enquiring, setEnquiring] = useState(false);
  const { data: product, error, loading } = useAsync(() => api.product(productId), [productId]);

  return (
    <section>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} />}
      {product && (
        <article className="product">
          {product.imageUrl && <img src={product.imageUrl} alt={product.title} className="product__image" />}
          <div className="product__body">
            <span className="card__category">{titleCase(product.category)}</span>
            <h1>{product.title}</h1>
            <p className="product__price">{formatPrice(product.price)}</p>
            <p>
              ★ {product.rating.rate.toFixed(1)} ({product.rating.count} reviews)
            </p>
            <p>{product.description}</p>
            {!enquiring && (
              <button type="button" onClick={() => setEnquiring(true)}>
                Enquire
              </button>
            )}
            {enquiring && <EnquiryForm productId={product.id} productTitle={product.title} />}
          </div>
        </article>
      )}
    </section>
  );
}
