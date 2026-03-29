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
  isActive: { type: Boolean, default: true },
  address: { type: String, default: '' },
  about: { type: String, default: '' },
  employeeId: { type: String, default: '' },
  joiningDate: { type: Date, default: null },
  age: { type: Number, default: null },
  birthDate: { type: Date, default: null },
  experience: { type: String, enum: ['Fresher (Entry)', 'Intermediate (Mid)', 'Professional (Senior)', 'Expert (Advanced)', 'Strategic / Executive (Top Tier)'], default: 'Fresher (Entry)' },
  socialLinks: [{ title: String, url: String }],
  projectLinks: [{ title: String, url: String }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

