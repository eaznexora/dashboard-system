const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { 
    type: String, 
    enum: ['active', 'on-hold', 'completed', 'archived'], 
    default: 'active' 
  },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  color: { type: String, default: '#3b82f6' }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
