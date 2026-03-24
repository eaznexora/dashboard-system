const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const { createOnboardingTasks, logActivity } = require('../utils/automation');

// GET all clients
router.get('/', async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    console.error('[CLIENTS_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

// CREATE client
router.post('/', async (req, res) => {
  try {
    const client = await Client.create(req.body);
    // If created as active, trigger onboarding
    if (client.status === 'active') {
      await createOnboardingTasks(client._id, req.body.actorId); 
    } else {
      await logActivity(req.body.actorId || client._id, 'created_client', 'Client', client._id);
    }
    res.status(201).json(client);
  } catch (err) {
    console.error('[CLIENT_CREATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to create client' });
  }
});

// UPDATE client
router.patch('/:id', async (req, res) => {
  try {
    const oldClient = await Client.findById(req.params.id);
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Trigger onboarding if status changed to active
    if (oldClient.status !== 'active' && client.status === 'active') {
      await createOnboardingTasks(client._id, req.body.actorId);
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// DELETE client
router.delete('/:id', async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete client' });
  }
});

module.exports = router;
