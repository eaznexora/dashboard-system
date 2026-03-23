const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: String, default: 'General' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  deadline: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
