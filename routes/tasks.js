const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// GET all tasks (admin) or assigned tasks (employee)
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let filter = {};
    if (role !== 'ADMIN' && userId) {
      filter.assignedTo = userId;
    }
    const tasks = await Task.find(filter).populate('assignedTo', 'name email').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('[TASKS_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// CREATE task (admin assigns)
router.post('/', async (req, res) => {
  try {
    const { title, description, assignedTo, project, priority, estimatedHours, deadline } = req.body;
    const task = await Task.create({ title, description, assignedTo, project, priority, estimatedHours, deadline });
    res.status(201).json(task);
  } catch (err) {
    console.error('[TASK_CREATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// UPDATE task status (employee marks progress)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'completed') update.completedAt = new Date();
    
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('[TASK_STATUS_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// GET task stats (counts by status)
router.get('/stats', async (req, res) => {
  try {
    const total = await Task.countDocuments();
    const pending = await Task.countDocuments({ status: 'pending' });
    const inProgress = await Task.countDocuments({ status: 'in-progress' });
    const completed = await Task.countDocuments({ status: 'completed' });
    res.json({ total, pending, inProgress, completed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;
