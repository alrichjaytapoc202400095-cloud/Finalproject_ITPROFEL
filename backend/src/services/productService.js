// Product catalog rules: public browsing filters + admin catalog + audited stock changes.
const Product = require('../models/Product');
const Category = require('../models/Category');
const StockMovement = require('../models/StockMovement');
const { AppError } = require('../utils/errors');
const { toCents } = require('../utils/money');

const SORTS = {
  price_asc: { priceCents: 1 },
  price_desc: { priceCents: -1 },
  newest: { createdAt: -1 },
  title: { title: 1 },
};

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class ProductService {
  async listCategories() {
    return Category.find().sort({ name: 1 });
  }

  // Public catalog (L1-03): search, filter, sort, paginate. Inactive products never appear.
  async listPublic({ q, category, course, min, max, sort, page = 1, limit = 12 }) {
    const query = { isActive: true };
    if (q) {
      const rx = escapeRegex(q);
      query.$or = [
        { title: { $regex: rx, $options: 'i' } },
        { author: { $regex: rx, $options: 'i' } },
        { description: { $regex: rx, $options: 'i' } },
        { courseCode: { $regex: rx, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (course) query.courseCode = { $regex: escapeRegex(course), $options: 'i' };
    const minCents = min !== undefined ? toCents(min) : null;
    const maxCents = max !== undefined ? toCents(max) : null;
    if (minCents !== null || maxCents !== null) {
      query.priceCents = {};
      if (minCents !== null) query.priceCents.$gte = minCents;
      if (maxCents !== null) query.priceCents.$lte = maxCents;
    }
    const sortKey = SORTS[sort] ? sort : 'newest';
    const lim = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const pg = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Product.find(query).sort(SORTS[sortKey]).skip((pg - 1) * lim).limit(lim).populate('category', 'name'),
      Product.countDocuments(query),
    ]);
    return { items, meta: { total, page: pg, limit: lim, pages: Math.ceil(total / lim) || 1, sort: sortKey } };
  }

  async getPublic(id) {
    const product = await Product.findOne({ _id: id, isActive: true }).populate('category', 'name');
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    return product;
  }

  async adminList({ q, page = 1, limit = 50 }) {
    const query = {};
    if (q) query.title = { $regex: escapeRegex(q), $options: 'i' };
    const lim = Math.min(Number(limit) || 50, 100);
    const pg = Math.max(Number(page) || 1, 1);
    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).populate('category', 'name'),
      Product.countDocuments(query),
    ]);
    return { items, meta: { total, page: pg, limit: lim } };
  }

  async adminCreate({ title, author, description, price, categoryId, stock, courseCode, imageUrl, isPreOrder, releaseDate }) {
    const product = await Product.create({
      title,
      author: author || '',
      description: description || '',
      priceCents: toCents(price),
      category: categoryId,
      stock,
      courseCode: (courseCode || '').toUpperCase(),
      imageUrl: imageUrl || '',
      isPreOrder: Boolean(isPreOrder),
      releaseDate: isPreOrder && releaseDate ? new Date(releaseDate) : null,
    });
    return product;
  }

  async adminUpdate(id, patch) {
    const product = await Product.findById(id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    const allowed = ['title', 'author', 'description', 'categoryId', 'stock', 'courseCode', 'imageUrl', 'isPreOrder', 'releaseDate', 'isActive'];
    const map = {
      title: 'title', author: 'author', description: 'description', categoryId: 'category',
      stock: 'stock', courseCode: 'courseCode', imageUrl: 'imageUrl', isPreOrder: 'isPreOrder',
      releaseDate: 'releaseDate', isActive: 'isActive',
    };
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        if (key === 'price') product.priceCents = toCents(patch.price);
        else if (key === 'priceCents' && patch.priceCents !== undefined) product.priceCents = patch.priceCents;
        else product[map[key]] = patch[key];
      }
    }
    if (patch.price !== undefined) product.priceCents = toCents(patch.price);
    if (patch.releaseDate !== undefined) product.releaseDate = patch.releaseDate ? new Date(patch.releaseDate) : null;
    await product.save();
    return product;
  }

  // Soft delete (L1-09): hides the product but order history keeps its snapshot.
  async adminDelete(id) {
    const product = await Product.findById(id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    product.isActive = false;
    await product.save();
    return product;
  }

  // Auditable stock change (L1-10): previous value, new value, reason, actor, timestamp.
  async adjustStock(id, { delta, reason }, actor) {
    const product = await Product.findById(id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    const previousStock = product.stock;
    let updated;
    if (delta < 0) {
      // Conditional update so stock can never go negative.
      updated = await Product.findOneAndUpdate({ _id: id, stock: { $gte: -delta } }, { $inc: { stock: delta } }, { new: true });
      if (!updated) throw new AppError(422, 'STOCK_NEGATIVE', `Stock cannot go below zero (currently ${previousStock}).`);
    } else {
      updated = await Product.findByIdAndUpdate(id, { $inc: { stock: delta } }, { new: true });
    }
    await StockMovement.create({ product: id, previousStock, newStock: updated.stock, delta, reason, actor });
    return { product: updated, movement: { previousStock, newStock: updated.stock, delta, reason } };
  }

  async stockMovements(id) {
    return StockMovement.find({ product: id }).sort({ at: -1 }).limit(100);
  }
}

module.exports = { ProductService };
