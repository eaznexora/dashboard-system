const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  linkedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  isPrivate: { type: Boolean, default: false },
  authorizedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: String },
  isTrashed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Folder', FolderSchema);

