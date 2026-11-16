// Server-owned cart (L1-05): totals are always computed on the server, never accepted from the client.
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { AppError } = require('../utils/errors');

class CartService {
  async getCart(userId) {
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) cart = await Cart.create({ user: userId, items: [] });
    const items = cart.items
      .filter((i) => i.product)
      .map((i) => ({
        productId: i.product._id,
        title: i.product.title,
        author: i.product.author,
        priceCents: i.product.priceCents,
        qty: i.qty,
        stock: i.product.stock,
        isActive: i.product.isActive,
        lineTotalCents: i.product.priceCents * i.qty,
      }));
    const subtotalCents = items.reduce((sum, i) => sum + i.lineTotalCents, 0);
    return { cartId: cart._id, items, itemCount: items.reduce((n, i) => n + i.qty, 0), subtotalCents };
  }

  async addItem(userId, { productId, qty }) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
    this.assertPurchasable(product);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = await Cart.create({ user: userId, items: [] });
    const existing = cart.items.find((i) => i.product.toString() === productId);
    const newQty = (existing ? existing.qty : 0) + qty;
    if (newQty > product.stock) {
      throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.stock} left in stock for "${product.title}".`);
    }
    if (existing) existing.qty = newQty;
    else cart.items.push({ product: productId, qty });
    await cart.save();
    return this.getCart(userId);
  }

  async updateItem(userId, productId, qty) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart is empty.');
    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'That item is not in your cart.');
    if (qty === 0) {
      cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    } else {
      const product = await Product.findById(productId);
      if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
      if (qty > product.stock) throw new AppError(409, 'OUT_OF_STOCK', `Only ${product.stock} left in stock for "${product.title}".`);
      item.qty = qty;
    }
    await cart.save();
    return this.getCart(userId);
  }

  async removeItem(userId, productId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new AppError(404, 'CART_NOT_FOUND', 'Cart is empty.');
    const before = cart.items.length;
    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    if (cart.items.length === before) throw new AppError(404, 'CART_ITEM_NOT_FOUND', 'That item is not in your cart.');
    await cart.save();
    return this.getCart(userId);
  }

  // Shared pre-order rule: unreleased titles cannot be bought yet (Level 3 rule).
  assertPurchasable(product) {
    if (product.isPreOrder && product.releaseDate && product.releaseDate > new Date()) {
      throw new AppError(422, 'PREORDER_NOT_RELEASED', `"${product.title}" is a pre-order available on ${product.releaseDate.toISOString().slice(0, 10)}.`);
    }
  }
}

module.exports = { CartService };
