import { useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { describeError, fieldErrors } from '../../utils/errors.js';
import { formatDate, pesos } from '../../utils/format.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Sheet from '../../components/ui/Sheet.jsx';
import { ListSkeleton } from '../../components/ui/Skeleton.jsx';

function defaultExpiry() {
  const date = new Date(Date.now() + 30 * 86400000);
  return date.toISOString().slice(0, 10);
}

const EMPTY = {
  code: '',
  type: 'percentage',
  value: '10',
  minSpend: '0',
  expiresAt: defaultExpiry(),
  usageLimit: '0',
  perCustomerLimit: '1',
};

export default function AdminCoupons() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.coupons({ token, signal }),
    [token]
  );

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  async function createCoupon(event) {
    event.preventDefault();
    const nextErrors = {};
    if (form.code.trim().length < 3) nextErrors.code = 'Use at least 3 characters.';
    if (!form.value || Number(form.value) <= 0) nextErrors.value = 'Enter a value greater than 0.';
    if (form.type === 'percentage' && Number(form.value) > 100) nextErrors.value = 'Percentage cannot exceed 100.';
    if (!form.expiresAt) nextErrors.expiresAt = 'Choose an expiry date.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy('create');
    try {
      await adminApi.createCoupon(
        {
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: form.type === 'fixed' ? Math.round(Number(form.value) * 100) : Number(form.value),
          minSpendCents: Math.round(Number(form.minSpend || 0) * 100),
          expiresAt: form.expiresAt,
          usageLimit: Number(form.usageLimit || 0),
          perCustomerLimit: Number(form.perCustomerLimit || 1),
          active: true,
        },
        { token }
      );
      notify('Coupon created.', { tone: 'success' });
      setForm(EMPTY);
      setOpen(false);
      refetch();
    } catch (caught) {
      const fields = fieldErrors(caught);
      if (Object.keys(fields).length > 0) setErrors(fields);
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  async function toggleCoupon(coupon) {
    setBusy(coupon._id);
    try {
      await adminApi.updateCoupon(coupon._id, { active: !coupon.active }, { token });
      notify(coupon.active ? 'Coupon deactivated.' : 'Coupon activated.', { tone: 'success' });
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack">
      <div className="admin-toolbar">
        <p className="muted">Server validates every code, expiry and usage limit.</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> New coupon
        </button>
      </div>

      {loading && !data ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState title="Coupons unavailable" message={describeError(error)} onRetry={refetch} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No coupons yet" description="Create a welcome code or a fixed-amount book discount." icon="tag" />
      ) : (
        <div className="stack">
          {data.map((coupon) => (
            <article className="admin-card" key={coupon._id}>
              <div className="admin-card__top">
                <div>
                  <h2 className="coupon-code">{coupon.code}</h2>
                  <p className="muted">
                    {coupon.type === 'percentage' ? `${coupon.value}% off` : `${pesos(coupon.value)} off`} · min{' '}
                    {pesos(coupon.minSpendCents)}
                  </p>
                </div>
                <Badge tone={coupon.active ? 'success' : 'danger'}>{coupon.active ? 'Active' : 'Off'}</Badge>
              </div>
              <dl className="admin-card__facts">
                <div><dt>Expires</dt><dd>{formatDate(coupon.expiresAt)}</dd></div>
                <div><dt>Used</dt><dd>{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</dd></div>
                <div><dt>Per customer</dt><dd>{coupon.perCustomerLimit}</dd></div>
              </dl>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => toggleCoupon(coupon)}
                disabled={busy === coupon._id}
              >
                {coupon.active ? 'Deactivate' : 'Activate'}
              </button>
            </article>
          ))}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New coupon"
        description="Fixed discounts are entered in pesos and stored as centavos."
      >
        <form className="stack" onSubmit={createCoupon} noValidate>
          <Field label="Coupon code" required error={errors.code}>
            {(aria) => (
              <input
                {...aria}
                value={form.code}
                onChange={(event) => update('code', event.target.value.toUpperCase())}
                placeholder="WELCOME10"
                maxLength={30}
                autoCapitalize="characters"
              />
            )}
          </Field>
          <Field label="Discount type">
            {(aria) => (
              <select {...aria} value={form.type} onChange={(event) => update('type', event.target.value)}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (₱)</option>
              </select>
            )}
          </Field>
          <div className="field-row">
            <Field label={form.type === 'percentage' ? 'Percent off' : 'Amount off (₱)'} required error={errors.value}>
              {(aria) => (
                <input {...aria} type="number" inputMode="decimal" min="0" value={form.value} onChange={(event) => update('value', event.target.value)} />
              )}
            </Field>
            <Field label="Minimum spend (₱)">
              {(aria) => (
                <input {...aria} type="number" inputMode="decimal" min="0" value={form.minSpend} onChange={(event) => update('minSpend', event.target.value)} />
              )}
            </Field>
          </div>
          <Field label="Expires on" required error={errors.expiresAt}>
            {(aria) => (
              <input {...aria} type="date" value={form.expiresAt} onChange={(event) => update('expiresAt', event.target.value)} />
            )}
          </Field>
          <div className="field-row">
            <Field label="Usage limit" hint="0 means unlimited.">
              {(aria) => (
                <input {...aria} type="number" inputMode="numeric" min="0" value={form.usageLimit} onChange={(event) => update('usageLimit', event.target.value)} />
              )}
            </Field>
            <Field label="Per customer">
              {(aria) => (
                <input {...aria} type="number" inputMode="numeric" min="0" value={form.perCustomerLimit} onChange={(event) => update('perCustomerLimit', event.target.value)} />
              )}
            </Field>
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={busy === 'create'}>
            {busy === 'create' ? 'Creating…' : 'Create coupon'}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
