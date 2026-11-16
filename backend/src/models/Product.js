const { mongoose } = require('../config/db');

const money = {
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: 'Money must be an integer amount in centavos.' },
};

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, trim: true, default: '', maxlength: 120 },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    priceCents: { ...money, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    stock: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'Stock must be an integer.' } },
    courseCode: { type: String, trim: true, uppercase: true, default: '', index: true },
    imageUrl: { type: String, trim: true, default: '' },
    isPreOrder: { type: Boolean, default: false },
    releaseDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true }, // deactivate = soft delete (L1-09)
  },
  { timestamps: true }
);

productSchema.index({ title: 1, author: 1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
