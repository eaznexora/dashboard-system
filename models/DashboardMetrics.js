const mongoose = require('mongoose');

const DashboardMetricsSchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true, enum: ['marketing', 'financial', 'operations', 'support', 'sales', 'executive'] },
  metrics: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DashboardMetrics', DashboardMetricsSchema);
