const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  createdBy: { type: String },
  isTrashed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Folder', FolderSchema);
