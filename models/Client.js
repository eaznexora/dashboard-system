const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  company: { type: String, required: true },
  contactName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  industry: { type: String },
  address: { type: String },
  status: { 
    type: String, 
    enum: ['lead', 'not started', 'in progress', 'active', 'completed', 'inactive', 'churned'], 
    default: 'lead' 
  },
  source: { type: String },
  notes: { type: String },
  onboardedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);

