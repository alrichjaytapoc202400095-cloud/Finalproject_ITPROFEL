import { useEffect, useState } from 'react';
import { api, getToken } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';
import Alert from '../components/Alert.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Home() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [filters, setFilters] = useState({ q: '', category: '', sort: 'newest', course: '', min: '', max: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.course) params.set('course', filters.course);
    if (filters.min) params.set('min', filters.min);
    if (filters.max) params.set('max', filters.max);
    params.set('sort', filters.sort);
    params.set('page', String(page));
    params.set('limit', '12');
    let active = true;
    const timer = setTimeout(() => {
      api(`/products?${params.toString()}`)
        .then((data) => {
          if (!active) return;
          setProducts(data);
          setMeta(data.meta || { page: 1, pages: 1, total: data.length });
          // Clear an error from an earlier failed request (e.g. the API was
          // still starting). Without this it stays on screen until a reload.
          setError('');
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, page]);

  async function quickAdd(productId) {
    setBusy(true);
    setError('');
    try {
      await addItem(productId, 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Catalog</h1>
      <Alert kind="error">{error}</Alert>
      <div className="toolbar">
        <input placeholder="Search title, author, course…" value={filters.q} onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }} />
        <select value={filters.category} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value }); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input placeholder="Course code e.g. IT101" value={filters.course} onChange={(e) => { setPage(1); setFilters({ ...filters, course: e.target.value }); }} style={{ maxWidth: 170 }} />
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="title">Title A–Z</option>
        </select>
        <input type="number" placeholder="Min ₱" value={filters.min} onChange={(e) => { setPage(1); setFilters({ ...filters, min: e.target.value }); }} style={{ maxWidth: 90 }} />
        <input type="number" placeholder="Max ₱" value={filters.max} onChange={(e) => { setPage(1); setFilters({ ...filters, max: e.target.value }); }} style={{ maxWidth: 90 }} />
      </div>

      <div className="grid">
        {products.map((p) => (
          <div key={p._id}>
            <ProductCard product={p} />
            {p.stock > 0 && getToken() && (
              <button className="btn small secondary" style={{ marginTop: 6, width: '100%' }} disabled={busy} onClick={() => quickAdd(p._id)}>
                Quick add
              </button>
            )}
          </div>
        ))}
      </div>
      {products.length === 0 && <p className="muted">No products match your filters.</p>}

      <div className="pagination">
        <button className="btn small secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="muted">Page {meta.page} of {meta.pages} · {meta.total} items</span>
        <button className="btn small secondary" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </>
  );
}
