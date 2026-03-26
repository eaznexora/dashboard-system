const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  createdBy: { type: String },
  isTrashed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Asset', AssetSchema);
