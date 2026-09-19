import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, useParams } from 'react-router-dom';
import { Spinner } from './components/Sheet';
import { LandingPage } from './pages/LandingPage';
import { MenuPage } from './pages/MenuPage';
import { TablePage } from './pages/TablePage';

// Staff screens load separately so diners on slow 4G only download the menu.
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })));

// Hash routing: every link is served by index.html, so the site works on any static host
// with no rewrite rules.
function PublicMenu() {
  const { slug = '' } = useParams();
  return <MenuPage slug={slug} />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/r/:slug" element={<PublicMenu />} />
        <Route path="/t/:token" element={<TablePage />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<Spinner />}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <div className="center-screen">
              <h2>Page not found</h2>
              <a className="btn" href="#/">
                Go home
              </a>
            </div>
          }
        />
      </Routes>
    </HashRouter>
  );
}
