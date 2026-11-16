import { useEffect, useState } from 'react';
import { api, pesos, getToken } from '../api/client.js';
import Alert from '../components/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = ['Dashboard', 'Products', 'Coupons', 'Orders', 'Pickup slots', 'Students'];
const NEXT_STATUSES = {
  pending_payment: ['paid', 'cancelled', 'expired'],
  paid: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
  expired: [],
};

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Dashboard');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);

  const load = () => {
    setError('');
    const endpoints = {
      Dashboard: '/admin/dashboard',
      Products: '/admin/products?limit=100',
      Coupons: '/admin/coupons',
      Orders: '/admin/orders?limit=50',
      'Pickup slots': '/admin/pickup-slots',
      Students: '/admin/students',
    };
    api(endpoints[tab], { token: getToken() }).then(setData).catch((e) => setError(e.message));
  };

  useEffect(load, [tab]);
  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  const act = (promise, reload = true) =>
    promise
      .then(() => reload && load())
      .catch((e) => setError(e.details ? `${e.message} ${Object.values(e.details).join(' ')}` : e.message));

  return (
    <>
      <h1>Admin</h1>
      <Alert kind="error">{error}</Alert>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {!data ? <p className="muted">Loading…</p> : (
        <>
          {tab === 'Dashboard' && <Dashboard data={data} />}
          {tab === 'Products' && <Products data={data} categories={categories} act={act} />}
          {tab === 'Coupons' && <Coupons data={data} act={act} />}
          {tab === 'Orders' && <Orders data={data} act={act} />}
          {tab === 'Pickup slots' && <Slots data={data} act={act} />}
          {tab === 'Students' && <Students data={data} act={act} />}
        </>
      )}
      <p className="muted">Signed in as {user?.email}</p>
    </>
  );
}

function Dashboard({ data }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
      <div className="panel"><h3>Total paid orders</h3><p style={{ fontSize: 26, margin: 0 }}>{data.totalPaidOrders}</p></div>
      <div className="panel"><h3>Gross sales</h3><p style={{ fontSize: 26, margin: 0 }}>{pesos(data.grossSalesCents)}</p></div>
      <div className="panel"><h3>Pending orders</h3><p style={{ fontSize: 26, margin: 0 }}>{data.pendingOrders}</p></div>
      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <h3>Low stock (≤ 5)</h3>
        {data.lowStock.length === 0 && <p className="muted">Nothing is running low.</p>}
        {data.lowStock.map((p) => (
          <div className="row space" key={p._id}><span>{p.title} {p.courseCode ? `(${p.courseCode})` : ''}</span><span className="badge danger">{p.stock} left</span></div>
        ))}
      </div>
    </div>
  );
}

function Products({ data, categories, act }) {
  const [form, setForm] = useState({ title: '', author: '', price: '', stock: 10, categoryId: '', courseCode: '', isPreOrder: false, releaseDate: '' });
  const [stockForm, setStockForm] = useState({ id: null, delta: 0, reason: '' });

  return (
    <>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Add product</h3>
        <div className="row wrap" style={{ gap: 10 }}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: 220 }} />
          <input placeholder="Author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} style={{ width: 140 }} />
          <input type="number" placeholder="Price ₱" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: 90 }} />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: 80 }} />
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} style={{ width: 170 }}>
            <option value="">Category…</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <input placeholder="Course code" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} style={{ width: 110 }} />
          <label style={{ margin: 0 }}>
            <input type="checkbox" checked={form.isPreOrder} onChange={(e) => setForm({ ...form, isPreOrder: e.target.checked })} /> Pre-order
          </label>
          {form.isPreOrder && <input type="date" value={form.releaseDate} onChange={(e) => setForm({ ...form, releaseDate: e.target.value })} style={{ width: 160 }} />}
          <button
            className="btn"
            onClick={() => act(api('/admin/products', {
              method: 'POST',
              token: getToken(),
              body: {
                title: form.title,
                author: form.author,
                description: '',
                price: Number(form.price),
                categoryId: form.categoryId,
                stock: Number(form.stock),
                courseCode: form.courseCode,
                isPreOrder: form.isPreOrder,
                ...(form.isPreOrder && form.releaseDate ? { releaseDate: form.releaseDate } : {}),
              },
            })).then(() => setForm({ title: '', author: '', price: '', stock: 10, categoryId: '', courseCode: '', isPreOrder: false, releaseDate: '' }))}
          >
            Create
          </button>
        </div>
      </div>

      <table>
        <thead><tr><th>Title</th><th>Course</th><th>Price</th><th>Stock</th><th>Status</th><th>Adjust stock</th><th></th></tr></thead>
        <tbody>
          {data.map((p) => (
            <tr key={p._id}>
              <td><strong>{p.title}</strong><div className="muted">{p.author}</div></td>
              <td>{p.courseCode || '—'}</td>
              <td>{pesos(p.priceCents)}</td>
              <td>{p.stock}</td>
              <td>{p.isActive ? <span className="badge">Active</span> : <span className="badge danger">Hidden</span>}</td>
              <td>
                <div className="row" style={{ gap: 6 }}>
                  <input type="number" style={{ width: 70 }} value={stockForm.id === p._id ? stockForm.delta : ''} placeholder="Δ"
                    onChange={(e) => setStockForm({ id: p._id, delta: Number(e.target.value), reason: stockForm.reason })} />
                  <input style={{ width: 140 }} placeholder="Reason" value={stockForm.id === p._id ? stockForm.reason : ''}
                    onChange={(e) => setStockForm({ id: p._id, delta: stockForm.delta, reason: e.target.value })} />
                  <button className="btn small" disabled={stockForm.id !== p._id || !stockForm.reason}
                    onClick={() => act(api(`/admin/products/${p._id}/stock`, { method: 'POST', token: getToken(), body: { delta: stockForm.delta, reason: stockForm.reason } }))}>
                    Apply
                  </button>
                </div>
              </td>
              <td>
                <button className="btn small secondary"
                  onClick={() => act(api(`/admin/products/${p._id}`, { method: 'PATCH', token: getToken(), body: { isActive: !p.isActive } }))}>
                  {p.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Coupons({ data, act }) {
  const [form, setForm] = useState({ code: '', type: 'percentage', value: 10, minSpendCents: 0, expiresAt: '', usageLimit: 0, perCustomerLimit: 1 });
  const today = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return (
    <>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Add coupon</h3>
        <div className="row wrap" style={{ gap: 10 }}>
          <input placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} style={{ width: 130 }} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: 140 }}>
            <option value="percentage">Percentage %</option>
            <option value="fixed">Fixed centavos</option>
          </select>
          <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} style={{ width: 90 }} />
          <input type="number" placeholder="Min spend (centavos)" value={form.minSpendCents} onChange={(e) => setForm({ ...form, minSpendCents: Number(e.target.value) })} style={{ width: 170 }} />
          <input type="number" placeholder="Usage limit (0 = ∞)" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} style={{ width: 150 }} />
          <input type="number" placeholder="Per customer" value={form.perCustomerLimit} onChange={(e) => setForm({ ...form, perCustomerLimit: Number(e.target.value) })} style={{ width: 120 }} />
          <input type="date" value={form.expiresAt || today} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} style={{ width: 150 }} />
          <button className="btn"
            onClick={() => act(api('/admin/coupons', {
              method: 'POST', token: getToken(),
              body: { ...form, code: form.code, expiresAt: form.expiresAt || today },
            }))}>
            Create
          </button>
        </div>
      </div>
      <table>
        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min spend</th><th>Expires</th><th>Used</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {data.map((c) => (
            <tr key={c._id}>
              <td><strong>{c.code}</strong></td>
              <td>{c.type}</td>
              <td>{c.type === 'percentage' ? `${c.value}%` : pesos(c.value)}</td>
              <td>{pesos(c.minSpendCents)}</td>
              <td>{new Date(c.expiresAt).toDateString()}</td>
              <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
              <td>{c.active ? <span className="badge">Active</span> : <span className="badge danger">Off</span>}</td>
              <td><button className="btn small secondary" onClick={() => act(api(`/admin/coupons/${c._id}`, { method: 'DELETE', token: getToken() }))}>Deactivate</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Orders({ data, act }) {
  return (
    <table>
      <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Set status</th><th>Reconcile</th></tr></thead>
      <tbody>
        {data.map((o) => (
          <tr key={o._id}>
            <td><strong>{o.orderNumber}</strong></td>
            <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            <td>{o.user?.name || o.shipping?.name}</td>
            <td>{pesos(o.totalCents)}</td>
            <td>
              <span className="badge">{o.status}</span>
              {o.payment?.amountMismatch && <div className="badge danger" title={o.payment.mismatchNote}>Amount mismatch</div>}
            </td>
            <td>
              <div className="row" style={{ gap: 6 }}>
                <select style={{ width: 130 }} id={`s-${o._id}`}>
                  <option value="">Choose…</option>
                  {(NEXT_STATUSES[o.status] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn small"
                  onClick={() => act(api(`/admin/orders/${o._id}/status`, { method: 'PATCH', token: getToken(), body: { status: document.getElementById(`s-${o._id}`).value } }))}>
                  Apply
                </button>
              </div>
            </td>
            <td><button className="btn small secondary" onClick={() => act(api(`/admin/orders/${o._id}/reconcile`, { method: 'POST', token: getToken() }))}>Verify with gateway</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Slots({ data, act }) {
  const [form, setForm] = useState({ date: '', timeWindow: '', capacity: 5 });
  return (
    <>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Add pickup slot</h3>
        <div className="row wrap" style={{ gap: 10 }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ width: 160 }} />
          <input placeholder="09:00-11:00" value={form.timeWindow} onChange={(e) => setForm({ ...form, timeWindow: e.target.value })} style={{ width: 140 }} />
          <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} style={{ width: 90 }} />
          <button className="btn" onClick={() => act(api('/admin/pickup-slots', { method: 'POST', token: getToken(), body: form }))}>Create</button>
        </div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Window</th><th>Booked / Capacity</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {data.map((s) => (
            <tr key={s._id}>
              <td>{s.date}</td><td>{s.timeWindow}</td><td>{s.booked} / {s.capacity}</td>
              <td>{s.isActive ? <span className="badge">Active</span> : <span className="badge danger">Off</span>}</td>
              <td>
                <button className="btn small secondary" onClick={() => act(api(`/admin/pickup-slots/${s._id}`, { method: 'PATCH', token: getToken(), body: { isActive: !s.isActive } }))}>
                  {s.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Students({ data, act }) {
  if (data.length === 0) return <p className="muted">No student verification requests yet.</p>;
  return (
    <table>
      <thead><tr><th>Student</th><th>Number</th><th>Course</th><th>Year</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {data.map((s) => (
          <tr key={s._id}>
            <td><strong>{s.name}</strong><div className="muted">{s.email}</div></td>
            <td>{s.student?.number}</td>
            <td>{s.student?.course}</td>
            <td>{s.student?.year}</td>
            <td><span className={`badge ${s.student?.status === 'verified' ? '' : 'warn'}`}>{s.student?.status}</span></td>
            <td>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn small" onClick={() => act(api(`/admin/students/${s._id}/verification`, { method: 'PATCH', token: getToken(), body: { approve: true } }))}>Approve</button>
                <button className="btn small secondary" onClick={() => act(api(`/admin/students/${s._id}/verification`, { method: 'PATCH', token: getToken(), body: { approve: false } }))}>Reject</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
