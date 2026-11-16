// Demo data used by both `npm run seed` and the in-memory development database.
// All writes are upserts with $setOnInsert, so re-running is safe and never
// overwrites data that already exists.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const PickupSlot = require('../models/PickupSlot');
const { toCents } = require('../utils/money');

const CATEGORIES = [
  { name: 'Textbooks', description: 'Required textbooks per course' },
  { name: 'School Supplies', description: 'Notebooks, pens, lab kits' },
  { name: 'Uniforms & Apparel', description: 'PE uniforms and college shirts' },
  { name: 'General Books', description: 'Fiction, reference and self-help' },
  { name: 'Reviewers & Materials', description: 'Board exam and quiz reviewers' },
];

const PRODUCTS = [
  ['Understanding the Self', 'Maria Anderson', 'Textbooks', 350, 25, 'GE101', 'A core general education textbook for first year students.'],
  ['Readings in Philippine History', 'Jose Ramos', 'Textbooks', 420, 18, 'GE102', 'Primary sources and commentary for Philippine history.'],
  ['Mathematics in the Modern World', 'Ana Cruz', 'Textbooks', 390, 22, 'GE103', 'Practical mathematics for non-math majors.'],
  ['Purposive Communication', 'Liza Santos', 'Textbooks', 330, 20, 'GE104', 'Communication skills workbook with campus examples.'],
  ['Introduction to Computing', 'David Reyes', 'Textbooks', 480, 15, 'IT101', 'First programming course text with JavaScript exercises.'],
  ['Data Structures and Algorithms in JavaScript', 'Grace Lim', 'Textbooks', 520, 12, 'CS201', 'Classic data structures taught in modern JavaScript.'],
  ['Database Management Systems', 'Peter Ocampo', 'Textbooks', 550, 10, 'IT202', 'Relational and document databases with lab activities.'],
  ['Web Systems and Technologies', 'Carla Cruz', 'Textbooks', 495, 14, 'IT301', 'Building full stack web applications, React and Express.'],
  ['Networking Fundamentals', 'Ramon Garcia', 'Textbooks', 560, 8, 'IT305', 'TCP/IP, routing and campus network labs.'],
  ['Information Assurance and Security', 'Grace Lim', 'Textbooks', 585, 6, 'IT401', 'Security principles, secure coding and incident response.'],
  ['Anatomy and Physiology for Nurses', 'Sofia Bautista', 'Textbooks', 640, 11, 'NUR101', 'Illustrated human anatomy for nursing students.'],
  ['Fundamentals of Accounting', 'Elena Villareal', 'Textbooks', 470, 16, 'ACC101', 'Bookkeeping, journals and financial statements.'],
  ['Principles of Management', 'Ramon Garcia', 'Textbooks', 445, 13, 'BSA201', 'Management theory with case studies.'],
  ['The Child and Adolescent Learners', 'Ana Cruz', 'Textbooks', 430, 9, 'EDU101', 'Developmental psychology for education majors.'],
  ['College Algebra Workbook', 'Math Department', 'School Supplies', 180, 40, 'MATH01', 'Drill workbook used in algebra classes.'],
  ['Science Laboratory Kit (Chemistry)', 'SPC Lab', 'School Supplies', 650, 5, 'CHEM01', 'Basic chemistry lab kit with safety gear.'],
  ['SPC PE Uniform (T-Shirt)', 'SPC Book Store', 'Uniforms & Apparel', 280, 30, '', 'Official white PE shirt, sizes S to XXL.'],
  ['SPC College Jacket', 'SPC Book Store', 'Uniforms & Apparel', 950, 4, '', 'Maroon college jacket with embroidered logo.'],
  ['Ballpoint Pen (Pack of 10)', 'Supplies Co', 'School Supplies', 85, 100, '', 'Black ballpoint pens for quizzes and exams.'],
  ['Illustration Pad A4', 'PaperWorks', 'School Supplies', 120, 35, '', 'A4 pad for engineering plates and art projects.'],
  ['CLEP Reviewer: Professional Education', 'Review Hub', 'Reviewers & Materials', 720, 7, '', 'Licensure exam reviewer with practice tests.'],
  ['Civil Service Reviewer 2026', 'Review Hub', 'Reviewers & Materials', 580, 10, '', 'Updated reviewer for the civil service exam.'],
  ['Atomic Habits (Paperback)', 'James Clear', 'General Books', 850, 12, '', 'An easy and proven way to build good habits.'],
  ['The Lean Startup (Paperback)', 'Eric Ries', 'General Books', 920, 6, '', 'How constant innovation creates radically successful businesses.'],
  ['Filipino: Wika at Panitikan', 'Rizalina Torres', 'Textbooks', 380, 17, 'FIL101', 'Filipino language and literature textbook.'],
  ['SPC 2026 Yearbook (Pre-Order)', 'Yearbook Team', 'General Books', 1200, 0, '', 'The official college yearbook. Ships after graduation.', true, 30],
];

const COUPONS = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minSpendCents: toCents(500), expiresAt: null, usageLimit: 1000, perCustomerLimit: 1, active: true },
  { code: 'BOOKS50', type: 'fixed', value: toCents(50), minSpendCents: toCents(300), expiresAt: null, usageLimit: 500, perCustomerLimit: 2, active: true },
  { code: 'EXPIRED5', type: 'percentage', value: 5, minSpendCents: 0, expiresAt: new Date('2020-01-01'), usageLimit: 100, perCustomerLimit: 1, active: true },
];

function futureSlots() {
  const slots = [];
  const base = new Date();
  for (let day = 1; day <= 5; day += 1) {
    const d = new Date(base.getTime() + day * 24 * 60 * 60 * 1000);
    const date = d.toISOString().slice(0, 10);
    slots.push({ date, timeWindow: '09:00-11:00', capacity: 5, booked: 0 });
    slots.push({ date, timeWindow: '14:00-16:00', capacity: 5, booked: 0 });
  }
  return slots;
}

async function upsert(model, keyField, values) {
  for (const value of values) {
    const query = { [keyField]: value[keyField] };
    await model.updateOne(query, { $setOnInsert: value }, { upsert: true });
  }
}

async function seedDemoData() {
  await upsert(Category, 'name', CATEGORIES);
  const categories = {};
  for (const c of await Category.find()) categories[c.name] = c._id;

  for (const [title, author, category, price, stock, courseCode, description, isPreOrder, releaseInDays] of PRODUCTS) {
    const doc = {
      title,
      author,
      description,
      priceCents: toCents(price),
      category: categories[category],
      stock,
      courseCode,
      imageUrl: '',
      isPreOrder: Boolean(isPreOrder),
      releaseDate: isPreOrder ? new Date(Date.now() + (releaseInDays || 30) * 86400000) : null,
    };
    await Product.updateOne({ title }, { $setOnInsert: doc }, { upsert: true });
  }

  // Demo accounts (TEST ONLY credentials - documented in the README).
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const users = [
    { name: 'SPC Administrator', email: 'admin@spc.edu', passwordHash: hash('Admin#1234'), role: 'admin', student: { status: 'none' } },
    { name: 'Juan Dela Cruz', email: 'juan@spc.edu', passwordHash: hash('Juan#1234'), role: 'customer', student: { number: 'SPC-2023-0001', course: 'BSIT', year: '3rd', status: 'verified' } },
    { name: 'Maria Santos', email: 'maria@spc.edu', passwordHash: hash('Maria#1234'), role: 'customer', student: { status: 'none' } },
  ];
  for (const u of users) await User.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true });

  for (const c of COUPONS) {
    const doc = { ...c, expiresAt: c.expiresAt || new Date(Date.now() + 30 * 86400000) };
    await Coupon.updateOne({ code: c.code }, { $setOnInsert: doc }, { upsert: true });
  }

  for (const s of futureSlots()) {
    await PickupSlot.updateOne({ date: s.date, timeWindow: s.timeWindow }, { $setOnInsert: s }, { upsert: true });
  }

  const [products, cats, coupons, slots] = await Promise.all([
    Product.countDocuments(), Category.countDocuments(), Coupon.countDocuments(), PickupSlot.countDocuments(),
  ]);
  return { products, categories: cats, coupons, slots };
}

async function resetDatabase() {
  const { mongoose } = require('../config/db');
  const collections = Object.keys(mongoose.connection.collections);
  for (const name of collections) await mongoose.connection.dropCollection(name);
  return collections.length;
}

module.exports = { seedDemoData, resetDatabase };
