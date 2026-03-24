const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal');

// GET all proposals
router.get('/', async (req, res) => {
  try {
    const proposals = await Proposal.find()
      .populate('client', 'company contactName email')
      .sort({ createdAt: -1 });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE new proposal
router.post('/', async (req, res) => {
  try {
    const count = await Proposal.countDocuments();
    const proposalId = `PROP-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;
    
    const proposal = new Proposal({
      ...req.body,
      proposalId
    });
    
    const saved = await proposal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE proposal
router.delete('/:id', async (req, res) => {
  try {
    await Proposal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proposal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
