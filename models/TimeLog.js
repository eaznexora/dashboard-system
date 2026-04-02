const mongoose = require('mongoose');

const TimeLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clockIn: { type: Date, required: true },
  clockOut: { type: Date, default: null },
  totalHours: { type: Number, default: 0 },
  lastPingTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['working', 'on_break', 'completed'], default: 'working' },
  breaks: [{ pauseStart: { type: Date }, pauseEnd: { type: Date } }],
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('TimeLog', TimeLogSchema);

