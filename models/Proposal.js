const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  proposalId: { type: String, required: true, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true },
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  total: { type: Number, required: true },
  validUntil: { type: Date },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft' 
  },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', ProposalSchema);
