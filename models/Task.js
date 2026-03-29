const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  status: { 
    type: String, 
    enum: ['backlog', 'pending', 'in-progress', 'review', 'completed'], 
    default: 'pending' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  deadline: { type: Date },
  completedAt: { type: Date },
  // --- NEW FIELDS ---
  tags: [{ type: String }],
  attachments: [{ type: String }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);

