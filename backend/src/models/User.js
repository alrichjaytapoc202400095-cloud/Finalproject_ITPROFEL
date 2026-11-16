const { mongoose } = require('../config/db');

const studentSchema = new mongoose.Schema(
  {
    number: { type: String, trim: true, default: '' },
    course: { type: String, trim: true, default: '' },
    year: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['none', 'pending', 'verified', 'rejected'], default: 'none' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true }, // bcrypt hash only (S-01) - plain text is never stored
    role: { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    student: { type: studentSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
