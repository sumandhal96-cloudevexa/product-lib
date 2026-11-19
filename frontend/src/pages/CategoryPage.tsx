import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ProductGrid } from '../components/ProductCard';
import { ErrorMessage, Loading } from '../components/Status';
import { titleCase } from '../format';
import { useAsync } from '../hooks/useAsync';

export function CategoryPage() {
  const { name = '' } = useParams();
  const { data, error, loading } = useAsync(() => api.category(name), [name]);

  return (
    <section>
      <h1>{titleCase(data?.category ?? name)}</h1>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} />}
      {data && (
        <>
          <h2>Top rated</h2>
          <ProductGrid products={data.topRated} />
          {data.additional.length > 0 && (
            <>
              <h2>More in this category</h2>
              <ProductGrid products={data.additional} />
            </>
          )}
        </>
      )}
    </section>
  );
}
