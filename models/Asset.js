const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['document', 'image', 'video', 'design', 'other'], 
    default: 'other' 
  },
  url: { type: String, required: true }, // File storage path or external URL
  size: { type: Number }, // Bytes
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Asset', AssetSchema);
