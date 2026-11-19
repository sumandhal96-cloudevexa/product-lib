import { Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { SearchPage } from './pages/SearchPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:name" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route
          path="*"
          element={
            <p className="status">
              Page not found. <Link to="/">Back to home</Link>
            </p>
          }
        />
      </Route>
    </Routes>
  );
}
