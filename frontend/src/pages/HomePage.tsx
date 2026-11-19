import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function HomePage() {
  const { data, error, loading } = useAsync(() => api.featured(), []);
  return (
    <section>
      <h1>Top rated products</h1>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} />}
      {data && <ProductGrid products={data} />}
    </section>
  );
}
