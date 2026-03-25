const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, 
  image: { type: String },
  role: { type: String, enum: ['ADMIN', 'EMPLOYEE'], default: 'EMPLOYEE' },
  // --- NEW FIELDS ---
  department: { type: String, default: 'General' },
  designation: { type: String, default: 'Employee' },
  phone: { type: String, default: '' },
  skills: [{ type: String }],
  hourlyRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
