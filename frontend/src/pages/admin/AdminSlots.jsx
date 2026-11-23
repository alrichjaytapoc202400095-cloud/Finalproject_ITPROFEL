import { useState } from 'react';
import { adminApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useToast } from '../../context/ToastContext.jsx';
import { describeError, fieldErrors } from '../../utils/errors.js';
import { formatDate } from '../../utils/format.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Sheet from '../../components/ui/Sheet.jsx';
import { ListSkeleton } from '../../components/ui/Skeleton.jsx';

export default function AdminSlots() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', timeWindow: '09:00-11:00', capacity: '5' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, loading, error, refetch } = useApiQuery(
    ({ signal }) => adminApi.pickupSlots({ token, signal }),
    [token]
  );

  async function createSlot(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.date) nextErrors.date = 'Choose a date.';
    if (!form.timeWindow.trim()) nextErrors.timeWindow = 'Enter a time window.';
    if (!form.capacity || Number(form.capacity) < 1) nextErrors.capacity = 'Capacity must be at least 1.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy('create');
    try {
      await adminApi.createPickupSlot(
        { date: form.date, timeWindow: form.timeWindow.trim(), capacity: Number(form.capacity) },
        { token }
      );
      notify('Pickup slot created.', { tone: 'success' });
      setForm({ date: '', timeWindow: '09:00-11:00', capacity: '5' });
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

  async function toggleSlot(slot) {
    setBusy(slot._id);
    try {
      await adminApi.updatePickupSlot(slot._id, { isActive: !slot.isActive }, { token });
      notify(slot.isActive ? 'Slot closed.' : 'Slot reopened.', { tone: 'success' });
      refetch();
    } catch (caught) {
      notify(describeError(caught), { tone: 'error' });
    } finally {
      setBusy('');
    }
  }

  async function deleteSlot() {
    setBusy('delete');
    try {
      await adminApi.deletePickupSlot(deleteTarget._id, { token });
      notify('Pickup slot deleted.', { tone: 'success' });
      setDeleteTarget(null);
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
        <p className="muted">Campus pickup capacity is claimed atomically at checkout.</p>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> New slot
        </button>
      </div>

      {loading && !data ? (
        <ListSkeleton rows={2} />
      ) : error ? (
        <ErrorState title="Pickup slots unavailable" message={describeError(error)} onRetry={refetch} />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No pickup slots" description="Add capacity for the coming campus pickup days." icon="clock" />
      ) : (
        <div className="stack">
          {data.map((slot) => {
            const remaining = slot.capacity - slot.booked;
            return (
              <article className="admin-card" key={slot._id}>
                <div className="admin-card__top">
                  <div>
                    <h2>{formatDate(slot.date)} · {slot.timeWindow}</h2>
                    <p className="muted">{slot.booked} of {slot.capacity} booked</p>
                  </div>
                  <Badge tone={!slot.isActive ? 'danger' : remaining > 0 ? 'success' : 'warn'}>
                    {!slot.isActive ? 'Closed' : remaining > 0 ? `${remaining} left` : 'Full'}
                  </Badge>
                </div>
                <div className="admin-order-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => toggleSlot(slot)}
                    disabled={busy === slot._id}
                  >
                    {slot.isActive ? 'Close slot' : 'Reopen'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setDeleteTarget(slot)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="New pickup slot" description="Capacity is shared across all students.">
        <form className="stack" onSubmit={createSlot} noValidate>
          <Field label="Date" required error={errors.date}>
            {(aria) => (
              <input {...aria} type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            )}
          </Field>
          <Field label="Time window" required error={errors.timeWindow} hint="Example: 09:00-11:00">
            {(aria) => (
              <input {...aria} value={form.timeWindow} onChange={(event) => setForm({ ...form, timeWindow: event.target.value })} maxLength={40} />
            )}
          </Field>
          <Field label="Capacity" required error={errors.capacity}>
            {(aria) => (
              <input {...aria} type="number" inputMode="numeric" min="1" max="500" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
            )}
          </Field>
          <button type="submit" className="btn btn--primary btn--full" disabled={busy === 'create'}>
            {busy === 'create' ? 'Creating…' : 'Create slot'}
          </button>
        </form>
      </Sheet>

      <Sheet
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete pickup slot?"
        description={deleteTarget ? `${formatDate(deleteTarget.date)} · ${deleteTarget.timeWindow}` : ''}
        footer={
          <div className="sheet__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setDeleteTarget(null)}>Keep slot</button>
            <button type="button" className="btn btn--danger" onClick={deleteSlot} disabled={busy === 'delete'}>
              {busy === 'delete' ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }
      >
        <p className="muted">Slots with existing bookings should be closed instead of deleted.</p>
      </Sheet>
    </div>
  );
}
