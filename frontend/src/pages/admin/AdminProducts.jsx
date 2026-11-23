import { useEffect, useMemo, useState } from 'react';
import { adminApi, catalogApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { describeError, fieldErrors } from '../../utils/errors.js';
import { pesos } from '../../utils/format.js';
import Badge from '../../components/ui/Badge.jsx';
import BookCover from '../../components/product/BookCover.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Sheet from '../../components/ui/Sheet.jsx';
import { ListSkeleton } from '../../components/ui/Skeleton.jsx';

const EMPTY_FORM = {
  title: '',
  author: '',
  description: '',
  price: '',
  categoryId: '',
  stock: '',
  courseCode: '',
  imageUrl: '',
  isPreOrder: false,
  releaseDate: '',
};

export default function AdminProducts() {
  const { token } = useAuth();
  const { notify } = useToast();

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [stockTarget, setStockTarget] = useState(null);
  const [stockForm, setStockForm] = useState({ delta: '', reason: '' });
  const [stockErrors, setStockErrors] = useState({});

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.products({ limit: 100 }, { token, signal }),
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    catalogApi
      .categories({ signal: controller.signal })
      .then((list) => {
        if (!controller.signal.aborted) setCategories(list);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const products = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (product) =>
        product.title.toLowerCase().includes(term) ||
        (product.author || '').toLowerCase().includes(term) ||
        (product.courseCode || '').toLowerCase().includes(term)
    );
  }, [data, search]);

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  async function createProduct(event) {
    event.preventDefault();
    if (busy) return;

    const errors = {};
    if (form.title.trim().length < 2) errors.title = 'Enter a product title.';
    if (!form.categoryId) errors.categoryId = 'Choose a category.';
    if (!form.price || Number(form.price) <= 0) errors.price = 'Enter a price greater than 0.';
    if (form.stock === '' || Number(form.stock) < 0) errors.stock = 'Enter a stock count of 0 or more.';
    if (form.isPreOrder && !form.releaseDate) errors.releaseDate = 'Choose the release date.';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy('create');
    try {
      await adminApi.createProduct(
        {
          title: form.title.trim(),
          author: form.author.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          categoryId: form.categoryId,
          stock: Number(form.stock),
          courseCode: form.courseCode.trim().toUpperCase(),
          imageUrl: form.imageUrl.trim(),
          isPreOrder: form.isPreOrder,
          ...(form.isPreOrder && form.releaseDate ? { releaseDate: form.releaseDate } : {}),
        },
        { token }
      );
      notify('Product created.', { tone: 'success' });
      setForm(EMPTY_FORM);
      setCreateOpen(false);
      refetch();
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setFormErrors(fields);
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  async function toggleActive(product) {
    setBusy(product._id);
    try {
      await adminApi.updateProduct(product._id, { isActive: !product.isActive }, { token });
      notify(product.isActive ? 'Product hidden from catalog.' : 'Product is now visible.', { tone: 'success' });
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  async function adjustStock(event) {
    event.preventDefault();
    const errors = {};
    if (!stockForm.delta || Number(stockForm.delta) === 0) errors.delta = 'Enter a non-zero change.';
    if (stockForm.reason.trim().length < 3) errors.reason = 'Give a reason (at least 3 characters).';
    setStockErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy('stock');
    try {
      await adminApi.adjustStock(
        stockTarget._id,
        { delta: Number(stockForm.delta), reason: stockForm.reason.trim() },
        { token }
      );
      notify('Stock adjusted and recorded in the movement log.', { tone: 'success' });
      setStockTarget(null);
      setStockForm({ delta: '', reason: '' });
      refetch();
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setStockErrors(fields);
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack">
      <div className="admin-toolbar">
        <div className="search-bar search-bar--compact" role="search">
          <label htmlFor="admin-product-search" className="sr-only">Search products</label>
          <Icon name="search" size={17} className="search-bar__icon" />
          <input
            id="admin-product-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
          />
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={16} /> New
        </button>
      </div>

      {loading && !data ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState title="Products unavailable" message={describeError(error)} onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search or add a new title." icon="shop" />
      ) : (
        <div className="stack">
          {products.map((product) => (
            <article className="admin-product" key={product._id}>
              <BookCover product={product} className="admin-product__cover" />
              <div className="admin-product__body">
                <div className="admin-product__top">
                  <div>
                    <h2>{product.title}</h2>
                    <p className="muted">{product.author || 'SPC Book Store'} · {product.courseCode || 'General'}</p>
                  </div>
                  <Badge tone={product.isActive ? 'success' : 'danger'}>
                    {product.isActive ? 'Live' : 'Hidden'}
                  </Badge>
                </div>
                <div className="admin-product__meta">
                  <span className="price">{pesos(product.priceCents)}</span>
                  <span className="muted">{product.category?.name || 'Uncategorised'}</span>
                  <Badge tone={product.stock <= 5 ? 'warn' : 'muted'}>{product.stock} in stock</Badge>
                </div>
                <div className="admin-product__actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      setStockTarget(product);
                      setStockForm({ delta: '', reason: '' });
                      setStockErrors({});
                    }}
                  >
                    <Icon name="plus" size={15} /> Adjust stock
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => toggleActive(product)}
                    disabled={busy === product._id}
                  >
                    {product.isActive ? 'Hide' : 'Publish'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New product"
        description="Price is entered in pesos; the API stores centavos."
      >
        <form className="stack" onSubmit={createProduct} noValidate>
          <Field label="Title" required error={formErrors.title}>
            {(aria) => (
              <input {...aria} value={form.title} onChange={(event) => updateForm('title', event.target.value)} maxLength={200} />
            )}
          </Field>
          <Field label="Author">
            {(aria) => (
              <input {...aria} value={form.author} onChange={(event) => updateForm('author', event.target.value)} maxLength={120} />
            )}
          </Field>
          <Field label="Description">
            {(aria) => (
              <textarea {...aria} rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} maxLength={4000} />
            )}
          </Field>
          <div className="field-row">
            <Field label="Price (₱)" required error={formErrors.price}>
              {(aria) => (
                <input {...aria} type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} />
              )}
            </Field>
            <Field label="Stock" required error={formErrors.stock}>
              {(aria) => (
                <input {...aria} type="number" inputMode="numeric" min="0" value={form.stock} onChange={(event) => updateForm('stock', event.target.value)} />
              )}
            </Field>
          </div>
          <Field label="Category" required error={formErrors.categoryId}>
            {(aria) => (
              <select {...aria} value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)}>
                <option value="">Choose a category…</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            )}
          </Field>
          <div className="field-row">
            <Field label="Course code">
              {(aria) => (
                <input {...aria} value={form.courseCode} onChange={(event) => updateForm('courseCode', event.target.value.toUpperCase())} maxLength={20} placeholder="IT101" />
              )}
            </Field>
            <Field label="Image URL">
              {(aria) => (
                <input {...aria} type="url" value={form.imageUrl} onChange={(event) => updateForm('imageUrl', event.target.value)} maxLength={500} placeholder="https://…" />
              )}
            </Field>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={form.isPreOrder} onChange={(event) => updateForm('isPreOrder', event.target.checked)} />
            <span><strong>Pre-order title</strong><small>Unreleased titles cannot be added to carts.</small></span>
          </label>
          {form.isPreOrder && (
            <Field label="Release date" required error={formErrors.releaseDate}>
              {(aria) => (
                <input {...aria} type="date" value={form.releaseDate} onChange={(event) => updateForm('releaseDate', event.target.value)} />
              )}
            </Field>
          )}
          <button type="submit" className="btn btn--primary btn--full" disabled={busy === 'create'}>
            {busy === 'create' ? 'Creating…' : 'Create product'}
          </button>
        </form>
      </Sheet>

      <Sheet
        open={Boolean(stockTarget)}
        onClose={() => setStockTarget(null)}
        title="Adjust stock"
        description={stockTarget ? stockTarget.title : ''}
      >
        {stockTarget && (
          <form className="stack" onSubmit={adjustStock} noValidate>
            <p className="muted">Current stock: <strong>{stockTarget.stock}</strong></p>
            <Field label="Change (Δ)" required error={stockErrors.delta} hint="Use a negative number to deduct stock.">
              {(aria) => (
                <input {...aria} type="number" inputMode="numeric" value={stockForm.delta} onChange={(event) => setStockForm({ ...stockForm, delta: event.target.value })} placeholder="-3" />
              )}
            </Field>
            <Field label="Reason" required error={stockErrors.reason} hint="Stored in the audited movement log.">
              {(aria) => (
                <input {...aria} value={stockForm.reason} onChange={(event) => setStockForm({ ...stockForm, reason: event.target.value })} maxLength={200} placeholder="Damaged copies" />
              )}
            </Field>
            <button type="submit" className="btn btn--primary btn--full" disabled={busy === 'stock'}>
              {busy === 'stock' ? 'Applying…' : 'Apply adjustment'}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
