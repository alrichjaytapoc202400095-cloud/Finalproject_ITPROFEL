import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { catalogApi } from '../api/endpoints.js';
import { readJsonCache, writeJsonCache } from '../api/client.js';
import { CACHE_KEYS } from '../utils/constants.js';
import { describeError } from '../utils/errors.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import Alert from '../components/ui/Alert.jsx';
import Icon from '../components/ui/Icon.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';

const VALUE_PROPS = [
  {
    icon: 'store',
    title: 'Campus pickup',
    body: 'Reserve a slot and collect your books without the queue.',
  },
  {
    icon: 'shield',
    title: 'Student discount',
    body: 'Verified students get an automatic discount at checkout.',
  },
  {
    icon: 'card',
    title: 'Secure payment',
    body: 'PayMongo test checkout confirms every payment on the server.',
  },
];

export default function Home() {
  useDocumentTitle('Campus bookstore');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, pendingIds } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const cachedSnapshot = useMemo(() => readJsonCache(CACHE_KEYS.catalog, null), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      catalogApi.products({ limit: 8, sort: 'newest' }, { signal: controller.signal }),
      catalogApi.categories({ signal: controller.signal }),
    ])
      .then(([productList, categoryList]) => {
        if (controller.signal.aborted) return;
        setProducts(productList);
        setCategories(categoryList);
        setCached(false);
        writeJsonCache(CACHE_KEYS.catalog, {
          products: productList,
          categories: categoryList,
        });
      })
      .catch((caught) => {
        if (controller.signal.aborted || caught.name === 'AbortError') return;
        const snapshot = readJsonCache(CACHE_KEYS.catalog, null);
        if (snapshot?.products?.length) {
          setProducts(snapshot.products);
          setCategories(snapshot.categories || []);
          setCached(true);
          setError('Showing the last books you browsed. Some details may have changed.');
        } else {
          setError(describeError(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  function submitSearch(event) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
  }

  async function handleAdd(product) {
    if (!user) {
      notify('Sign in to add books to your cart.', { tone: 'info' });
      navigate('/login', { state: { from: { pathname: `/products/${product._id}` } } });
      return;
    }
    if (!online) {
      notify('You are offline. Reconnect to update your cart.', { tone: 'error' });
      return;
    }
    try {
      await addItem(product._id, 1);
      notify(`${product.title} added to cart.`, { tone: 'success' });
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    }
  }

  return (
    <div className="page page--home">
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__eyebrow">Mobile campus bookstore</p>
        <h1 id="hero-title">
          Your books, <span>one tap away.</span>
        </h1>
        <p className="hero__copy">
          Find required textbooks by course code, reserve campus pickup, and pay securely — right from your phone.
        </p>

        <form className="search-bar" role="search" onSubmit={submitSearch}>
          <label htmlFor="home-search" className="sr-only">
            Search books, authors or course codes
          </label>
          <Icon name="search" size={19} className="search-bar__icon" />
          <input
            id="home-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, author or IT101…"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="search-bar__submit" aria-label="Search catalog">
            <Icon name="arrowRight" size={18} />
          </button>
        </form>

        {categories.length > 0 && (
          <nav className="chip-row" aria-label="Browse categories">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${encodeURIComponent(category._id)}`}
                className="chip"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        )}
      </section>

      {error && (
        <Alert
          kind={cached ? 'info' : 'error'}
          onRetry={cached ? undefined : () => setReloadKey((value) => value + 1)}
        >
          {error}
        </Alert>
      )}

      {!online && (
        <p className="inline-note">
          <Icon name="wifiOff" size={16} /> Offline: showing cached catalog items only.
        </p>
      )}

      <section aria-labelledby="featured-title" className="section">
        <div className="section__header">
          <div>
            <h2 id="featured-title">Fresh on the shelf</h2>
            <p className="muted">Newest arrivals and required course titles</p>
          </div>
          <Link to="/products" className="text-link">
            View all <Icon name="chevronRight" size={15} />
          </Link>
        </div>

        {loading && products.length === 0 ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <ProductGrid
            products={products}
            onAdd={handleAdd}
            pendingIds={pendingIds}
            addDisabled={!online}
          />
        )}

        {!loading && products.length === 0 && !error && (
          <p className="muted">The catalog is being restocked. Please check back shortly.</p>
        )}
      </section>

      <section className="value-props" aria-label="Why shop with us">
        {VALUE_PROPS.map((item) => (
          <article className="value-card" key={item.title}>
            <span className="value-card__icon" aria-hidden="true">
              <Icon name={item.icon} size={19} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </div>
          </article>
        ))}
      </section>

      {cachedSnapshot && !user && (
        <p className="muted home-hint">
          Sign in to keep your cart, receive student pricing and track orders.
        </p>
      )}
    </div>
  );
}
