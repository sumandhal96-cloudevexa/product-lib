import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client';
import { titleCase } from '../format';
import { useAsync } from '../hooks/useAsync';
import { SearchBar } from './SearchBar';

export function Layout() {
  const { data: categories } = useAsync(() => api.categories(), []);

  return (
    <>
      <header className="header">
        <div className="container header__row">
          <Link to="/" className="brand">
            Catalogue
          </Link>
          <SearchBar />
        </div>
        <nav className="container nav" aria-label="Categories">
          {(categories ?? []).map((c) => (
            <NavLink key={c} to={`/categories/${encodeURIComponent(c)}`}>
              {titleCase(c)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
