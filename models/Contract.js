const mongoose = require('mongoose');

const ContractSchema = new mongoose.Schema({
  contractId: { type: String, required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Markdown or HTML representation of the legal terms
  value: { type: Number },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'completed', 'terminated'], 
    default: 'draft' 
  },
  signingDate: { type: Date },
  expiryDate: { type: Date },
  signature: { type: String }, // Can be a URL to an image or a base64 string
}, { timestamps: true });

module.exports = mongoose.model('Contract', ContractSchema);

