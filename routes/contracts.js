const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');

// GET all contracts
router.get('/', async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate('client', 'company contactName email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE new contract
router.post('/', async (req, res) => {
  try {
    const count = await Contract.countDocuments();
    const contractId = `CON-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;
    
    const contract = new Contract({
      ...req.body,
      contractId
    });
    
    const saved = await contract.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE contract
router.delete('/:id', async (req, res) => {
  try {
    await Contract.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contract deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
