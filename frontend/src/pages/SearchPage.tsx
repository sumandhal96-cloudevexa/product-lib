import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../hooks/useAsync';

export function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const { data, error, loading } = useAsync(() => (q ? api.search(q) : Promise.resolve([])), [q]);

  return (
    <section>
      <h1>{q ? `Results for “${q}”` : 'Search'}</h1>
      {!q && <p className="status">Enter a search term above.</p>}
      {q && loading && <Loading />}
      {error && <ErrorMessage error={error} />}
      {q && data && (data.length === 0 ? <p className="status">No products match “{q}”.</p> : <ProductGrid products={data} />)}
    </section>
  );
}
