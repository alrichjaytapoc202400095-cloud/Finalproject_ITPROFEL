// Integration tests (T-14/T-25): they call the API over HTTP with Supertest against a
// real MongoDB. With MONGO_URI unset they use an in-memory MongoDB, so they run anywhere,
// clean up after themselves and can be repeated safely: `npm test`.
const request = require('supertest');
const crypto = require('crypto');
const { app } = require('../server');
const db = require('../src/config/db');
const Category = require('../src/models/Category');
const Order = require('../src/models/Order');

let memServer = null;
let mongoUri = null;

let fetchMock = null;
let payStatus = 'paid';
let payAmountCents = 0;

// ---------- helpers ----------
const jsonOk = (body) => ({ ok: true, status: 200, json: async () => body });

async function registerUser({ name, email, password }) {
  const res = await request(app).post('/api/v1/auth/register').send({ name, email, password });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function createAdmin() {
  return registerUser({ name: 'Admin', email: `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@test.edu`, password: 'Admin#1234' });
}

async function createCustomer(verifiedStudent = false) {
  const user = await registerUser({
    name: 'Juan Dela Cruz',
    email: `juan-${Date.now()}-${Math.random().toString(36).slice(2)}@test.edu`,
    password: 'Juan#1234',
    ...(verifiedStudent ? { student: { number: 'SPC-2023-0001', course: 'BSIT', year: '3rd' } } : {}),
  });
  return user;
}

async function createProduct(token, { stock = 5, price = 100, title = 'Test Book' } = {}) {
  const category = await Category.create({ name: `Cat-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  const res = await request(app)
    .post('/api/v1/admin/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, author: 'Author X', description: 'desc', price, categoryId: String(category._id), stock, courseCode: 'IT101' });
  if (res.status !== 201) throw new Error(`product create failed: ${JSON.stringify(res.body)}`);
  return res.body.data;
}

async function checkout(token, body, idempotencyKey) {
  const req = request(app).post('/api/v1/checkout').set('Authorization', `Bearer ${token}`).send(body);
  if (idempotencyKey) req.set('Idempotency-Key', idempotencyKey);
  return req;
}

function paymongoSignature(body) {
  const t = Math.floor(Date.now() / 1000);
  const hmac = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex');
  return `t=${t},test=${hmac}`;
}

const deliveryBody = (items, extra = {}) => ({
  method: 'delivery',
  items,
  shipping: { name: 'Juan', phone: '09171234567', address: 'Tubod, Iligan City' },
  ...extra,
});

// ---------- lifecycle ----------
beforeAll(async () => {
  // Test database: real MONGO_URI if provided, otherwise an in-memory MongoDB.
  if (process.env.MONGO_URI_TEST || process.env.MONGO_URI) {
    mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    mongoUri = memServer.getUri();
  }
  await db.connect(mongoUri);

  // Mock the PayMongo HTTP API so payment tests run without real network calls.
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
    const u = String(url);
    if (u.startsWith('https://api.paymongo.com/v1/checkout_sessions')) {
      if (!opts || opts.method === 'POST') {
        return jsonOk({ data: { id: 'cs_test_123', attributes: { redirect: { checkout_url: 'https://pay.example/checkout/cs_test_123' } } } });
      }
      return jsonOk({
        data: {
          attributes: {
            status: payStatus,
            amount: payAmountCents,
            payments: [{ data: { attributes: { amount: payAmountCents } } }],
          },
        },
      });
    }
    throw new Error(`unexpected fetch: ${u}`);
  });
});

afterAll(async () => {
  if (fetchMock) fetchMock.mockRestore();
  await db.disconnect();
  if (memServer) await memServer.stop();
});

afterEach(async () => {
  const collections = db.mongoose.connection.collections;
  for (const collection of Object.values(collections)) await collection.deleteMany({});
});

// ---------- tests ----------
describe('authentication and roles', () => {
  test('L1-01 duplicate email registration returns 409', async () => {
    await createAdmin();
    const user = await createCustomer();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Copy', email: user.user.email, password: 'Copy#1234' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  test('L1-01 invalid credentials return 401 with a generic message', async () => {
    const user = await createCustomer();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.user.email, password: 'WrongPass#999' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    // Generic on purpose: it must not reveal whether the email or the password was wrong.
    expect(res.body.error.message).toBe('Email or password is incorrect.');
  });

  test('S-03/L1-02 a customer token receives 403 on an admin endpoint', async () => {
    await createAdmin(); // bootstrap the admin first
    const customer = await createCustomer();
    const res = await request(app)
      .get('/api/v1/admin/products')
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('checkout pricing and stock', () => {
  test('L2-02 checkout ignores client-sent prices and recomputes from the database', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 100, stock: 10 });
    const res = await checkout(customer.token, deliveryBody([
      { productId: String(product._id), qty: 2, priceCents: 1, title: 'TAMPERED' }, // tampered fields
    ]));
    expect(res.status).toBe(201);
    const { order } = res.body.data;
    expect(order.subtotalCents).toBe(20000); // 2 x PHP 100.00 from the DB
    expect(order.totalCents).toBe(25000); // subtotal + PHP 50 shipping fee
    expect(order.items[0].priceCents).toBe(10000);
    expect(order.items[0].title).toBe('Test Book'); // snapshot from the DB, not the client
  });

  test('L2-03 two concurrent checkouts for the last unit: one 201, one 409', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 100, stock: 1 });
    const body = deliveryBody([{ productId: String(product._id), qty: 1 }]);
    const [a, b] = await Promise.all([checkout(customer.token, body), checkout(customer.token, body)]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('OUT_OF_STOCK');
  });

  test('L2-01 an expired coupon returns 422 COUPON_EXPIRED and no discount', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 500, stock: 5 });
    const Coupon = require('../src/models/Coupon');
    await Coupon.create({ code: 'OLD1', type: 'percentage', value: 50, expiresAt: new Date('2020-01-01'), active: true });
    const res = await checkout(customer.token, deliveryBody(
      [{ productId: String(product._id), qty: 1 }],
      { couponCode: 'OLD1' }
    ));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COUPON_EXPIRED');
  });

  test('L2-08 repeating checkout with the same idempotency key returns the same order', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 100, stock: 5 });
    const body = deliveryBody([{ productId: String(product._id), qty: 1 }]);
    const first = await checkout(customer.token, body, 'key-001');
    const second = await checkout(customer.token, body, 'key-001');
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.meta.replayed).toBe(true);
    expect(second.body.data.order._id).toBe(first.body.data.order._id);
  });
});

describe('payment webhooks', () => {
  async function paidOrderFixture() {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 100, stock: 5 });
    const res = await checkout(customer.token, deliveryBody([{ productId: String(product._id), qty: 2 }]));
    expect(res.status).toBe(201);
    const order = res.body.data.order;
    payAmountCents = order.totalCents;
    payStatus = 'paid';
    return { admin, customer, product, order };
  }
  test('S-07/L2-05 an invalid webhook signature returns 401 and does not change the order', async () => {
    const { order } = await paidOrderFixture();
    const body = JSON.stringify({ data: { id: 'evt_bad', type: 'checkout_session.payment.paid', attributes: { data: { id: 'cs_test_123' } } } });
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('paymongo-signature', 't=1,test=deadbeef')
      .send(body);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_WEBHOOK_SIGNATURE');
    const after = await Order.findById(order._id);
    expect(after.status).toBe('pending_payment'); // untouched
  });

  test('L2-05 a valid webhook marks the order paid; replaying it does not duplicate anything', async () => {
    const { customer, order } = await paidOrderFixture();
    const body = JSON.stringify({ data: { id: 'evt_1', type: 'checkout_session.payment.paid', attributes: { data: { id: 'cs_test_123' } } } });
    const res = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('paymongo-signature', paymongoSignature(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.data.received).toBe(true);

    const replay = await request(app)
      .post('/api/v1/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('paymongo-signature', paymongoSignature(body))
      .send(body);
    expect(replay.status).toBe(200);
    expect(replay.body.data.duplicate).toBe(true);

    const detail = await request(app).get(`/api/v1/orders/${order._id}`).set('Authorization', `Bearer ${customer.token}`);
    expect(detail.body.data.order.status).toBe('paid');
    const paidTransitions = detail.body.data.history.filter((h) => h.to === 'paid');
    expect(paidTransitions).toHaveLength(1); // exactly one transition despite the replay
  });

  test('L2-06 a missed webhook is recovered by the retrieve-on-return status endpoint', async () => {
    const { customer, order } = await paidOrderFixture();
    // No webhook is sent at all - the gateway simply says the payment succeeded.
    const res = await request(app)
      .get(`/api/v1/payments/status/${order._id}`)
      .set('Authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.gateway.verified).toBe(true);
    expect(res.body.data.order.status).toBe('paid');
  });
});

describe('order lifecycle', () => {
  test('L1-07/L2-04 a customer can cancel an unpaid order; a second cancel is 409', async () => {
    const admin = await createAdmin();
    const customer = await createCustomer();
    const product = await createProduct(admin.token, { price: 100, stock: 5 });
    const placed = await checkout(customer.token, deliveryBody([{ productId: String(product._id), qty: 1 }]));
    const orderId = placed.body.data.order._id;

    const cancel = await request(app).post(`/api/v1/orders/${orderId}/cancel`).set('Authorization', `Bearer ${customer.token}`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');

    const again = await request(app).post(`/api/v1/orders/${orderId}/cancel`).set('Authorization', `Bearer ${customer.token}`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('AI assistant (Level 4)', () => {
  test('L4-06 without an API key the endpoint falls back to keyword search with database products', async () => {
    const admin = await createAdmin();
    await createProduct(admin.token, { title: 'Web Systems and Technologies', price: 300, stock: 4 });
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/v1/ai/assistant')
      .set('Authorization', `Bearer ${customer.token}`)
      .send({ question: 'I need a book for my web systems subject' });
    expect(res.status).toBe(200); // controlled response, never a 500
    expect(res.body.data.source).toBe('fallback');
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    // Authoritative data comes from the database:
    expect(res.body.data.products[0].priceCents).toBe(30000);
    expect(res.body.data.products[0].stock).toBe(4);
  });
});
