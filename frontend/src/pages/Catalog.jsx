import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { catalogApi } from '../api/endpoints.js';
import { readJsonCache, writeJsonCache } from '../api/client.js';
import { PAGE_SIZE, SORT_OPTIONS } from '../utils/constants.js';
import { describeError } from '../utils/errors.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useNetworkStatus } from '../context/NetworkStatusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/ui/Alert.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Icon from '../components/ui/Icon.jsx';
import PageHeader from '../components/layout/PageHeader.jsx';
import Sheet from '../components/ui/Sheet.jsx';
import Field from '../components/ui/Field.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';

const DEFAULTS = { q: '', category: '', course: '', sort: 'newest', min: '', max: '', page: '1' };

export default function Catalog() {
  useDocumentTitle('Catalog');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addItem, pendingIds } = useCart();
  const { online } = useNetworkStatus();
  const { notify } = useToast();

  const urlQuery = searchParams.get('q') || '';
  const [search, setSearch] = useState(urlQuery);
  const debouncedSearch = useDebounce(search, 350);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const queryString = searchParams.toString();
  const activeFilters = useMemo(() => {
    const names = [];
    if (searchParams.get('category')) names.push('Category');
    if (searchParams.get('course')) names.push('Course');
    if (searchParams.get('min') || searchParams.get('max')) names.push('Price');
    if ((searchParams.get('sort') || DEFAULTS.sort) !== DEFAULTS.sort) names.push('Sort');
    return names;
  }, [searchParams]);

  // Keep the controlled search box in sync with deep links / back-button changes.
  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  // Push the debounced value into the URL (single source of truth for filters).
  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Categories are public and rarely change: fetch once with abort cleanup.
  useEffect(() => {
    const controller = new AbortController();
    catalogApi
      .categories({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setCategories(data);
      })
      .catch(() => {
        /* the filter sheet simply shows no categories */
      });
    return () => controller.abort();
  }, []);

  // Catalog query (abortable). Cached per query string for offline browsing.
  useEffect(() => {
    const controller = new AbortController();
    const params = Object.fromEntries(new URLSearchParams(queryString));
    setLoading(true);
    setError('');

    catalogApi
      .products({ ...params, limit: PAGE_SIZE }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setProducts(data);
        setMeta(data.meta || { page: 1, pages: 1, total: data.length });
        setCached(false);
        writeJsonCache(`spc.cache.catalog.${queryString}`, {
          products: data,
          meta: data.meta || null,
        });
      })
      .catch((caught) => {
        if (controller.signal.aborted || caught.name === 'AbortError') return;
        const snapshot = readJsonCache(`spc.cache.catalog.${queryString}`, null);
        if (snapshot?.products?.length) {
          setProducts(snapshot.products);
          setMeta(snapshot.meta || { page: 1, pages: 1, total: snapshot.products.length });
          setCached(true);
          setError('You are viewing a saved copy of this catalog page.');
        } else {
          setProducts([]);
          setError(describeError(caught));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryString, reloadKey]);

  function setParam(key, value) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true }
    );
  }

  function changePage(nextPage) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (nextPage <= 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const currentPage = Number(searchParams.get('page') || 1);
  const course = searchParams.get('course') || '';
  const hasAnyFilter = activeFilters.length > 0 || Boolean(searchParams.get('q'));

  return (
    <div className="page">
      <PageHeader
        title="Catalog"
        subtitle={meta.total ? `${meta.total} title${meta.total === 1 ? '' : 's'} available` : 'Browse the campus bookstore'}
        backTo="/"
        backLabel="Back to home"
        action={
          <button
            type="button"
            className="icon-btn"
            aria-label={`Open filters${activeFilters.length ? `, ${activeFilters.length} active` : ''}`}
            onClick={() => setFilterOpen(true)}
          >
            <Icon name="filter" />
            {activeFilters.length > 0 && <span className="count-badge">{activeFilters.length}</span>}
          </button>
        }
      />

      <div className="catalog-search">
        <form className="search-bar" role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="catalog-search" className="sr-only">
            Search the catalog
          </label>
          <Icon name="search" size={19} className="search-bar__icon" />
          <input
            id="catalog-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, author or course code"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="search"
          />
          {search && (
            <button type="button" className="search-bar__clear" aria-label="Clear search" onClick={() => setSearch('')}>
              <Icon name="close" size={16} />
            </button>
          )}
        </form>
      </div>

      {activeFilters.length > 0 && (
        <div className="chip-row chip-row--tight" aria-label="Active filters">
          {course && (
            <button type="button" className="chip chip--removable" onClick={() => setParam('course', '')}>
              Course: {course} <Icon name="close" size={13} />
            </button>
          )}
          {searchParams.get('category') && (
            <button type="button" className="chip chip--removable" onClick={() => setParam('category', '')}>
              Category <Icon name="close" size={13} />
            </button>
          )}
          {(searchParams.get('min') || searchParams.get('max')) && (
            <button type="button" className="chip chip--removable" onClick={() => { setParam('min', ''); setParam('max', ''); }}>
              Price <Icon name="close" size={13} />
            </button>
          )}
          <button type="button" className="text-link" onClick={() => setSearchParams({}, { replace: true })}>
            Clear all
          </button>
        </div>
      )}

      {error && (
        <Alert
          kind={cached ? 'info' : 'error'}
          onRetry={cached ? undefined : () => setReloadKey((value) => value + 1)}
        >
          {error}
        </Alert>
      )}

      <div className="catalog-meta" aria-live="polite">
        <p className="muted">
          {loading ? 'Loading books…' : `${meta.total || 0} result${meta.total === 1 ? '' : 's'}`}
        </p>
        {!loading && meta.pages > 1 && (
          <Badge tone="muted">
            Page {meta.page} of {meta.pages}
          </Badge>
        )}
      </div>

      <h2 className="sr-only">Book results</h2>
      {loading && products.length === 0 ? (
        <ProductGridSkeleton count={6} />
      ) : products.length > 0 ? (
        <ProductGrid
          products={products}
          onAdd={handleAdd}
          pendingIds={pendingIds}
          addDisabled={!online}
        />
      ) : !loading && !error ? (
        <EmptyState
          title={hasAnyFilter ? 'No books match those filters' : 'The catalog is empty'}
          description={
            hasAnyFilter
              ? 'Try a different course code, widen the price range, or clear the filters.'
              : 'New titles will appear here as soon as the store adds them.'
          }
          actionLabel={hasAnyFilter ? 'Clear filters' : undefined}
          onAction={hasAnyFilter ? () => setSearchParams({}, { replace: true }) : undefined}
        />
      ) : !loading && error && products.length === 0 ? (
        <ErrorState
          title="Catalog unavailable"
          message={error}
          offline={!online}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      ) : null}

      {meta.pages > 1 && products.length > 0 && (
        <nav className="pagination" aria-label="Catalog pages">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
          >
            Previous
          </button>
          <span className="pagination__label" aria-current="page">
            {currentPage} / {meta.pages}
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage >= meta.pages || loading}
          >
            Next
          </button>
        </nav>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories}
        searchParams={searchParams}
        onApply={(values) => {
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            Object.entries(values).forEach(([key, value]) => {
              if (value) next.set(key, value);
              else next.delete(key);
            });
            next.delete('page');
            return next;
          });
          setFilterOpen(false);
        }}
      />
    </div>
  );
}

function FilterSheet({ open, onClose, categories, searchParams, onApply }) {
  const [draft, setDraft] = useState({ category: '', course: '', min: '', max: '', sort: DEFAULTS.sort });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setDraft({
      category: searchParams.get('category') || '',
      course: searchParams.get('course') || '',
      min: searchParams.get('min') || '',
      max: searchParams.get('max') || '',
      sort: searchParams.get('sort') || DEFAULTS.sort,
    });
    setErrors({});
  }, [open, searchParams]);

  function apply() {
    const nextErrors = {};
    if (draft.min && draft.max && Number(draft.min) > Number(draft.max)) {
      nextErrors.max = 'Maximum price must be higher than the minimum.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onApply(draft);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter & sort"
      description="Narrow the catalog to what you need for class."
      footer={
        <div className="sheet__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              setDraft({ category: '', course: '', min: '', max: '', sort: DEFAULTS.sort });
              setErrors({});
            }}
          >
            Reset
          </button>
          <button type="button" className="btn btn--primary" onClick={apply}>
            Show books
          </button>
        </div>
      }
    >
      <Field label="Category">
        {(aria) => (
          <select
            {...aria}
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Course code" hint="For example IT101 or GE102">
        {(aria) => (
          <input
            {...aria}
            value={draft.course}
            onChange={(event) => setDraft({ ...draft, course: event.target.value.toUpperCase() })}
            placeholder="IT101"
            maxLength={20}
            autoCapitalize="characters"
          />
        )}
      </Field>

      <div className="field-row">
        <Field label="Min price (₱)">
          {(aria) => (
            <input
              {...aria}
              type="number"
              inputMode="decimal"
              min="0"
              value={draft.min}
              onChange={(event) => setDraft({ ...draft, min: event.target.value })}
              placeholder="0"
            />
          )}
        </Field>
        <Field label="Max price (₱)" error={errors.max}>
          {(aria) => (
            <input
              {...aria}
              type="number"
              inputMode="decimal"
              min="0"
              value={draft.max}
              onChange={(event) => setDraft({ ...draft, max: event.target.value })}
              placeholder="Any"
            />
          )}
        </Field>
      </div>

      <Field label="Sort by">
        {(aria) => (
          <select {...aria} value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </Sheet>
  );
}
