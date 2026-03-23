const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Structurally optional explicitly supporting dummy hashes or raw OAuth injection arrays
  image: { type: String },
  role: { type: String, enum: ['ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
