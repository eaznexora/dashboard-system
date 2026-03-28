const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Folder = require('../models/Folder');

// GET all tasks (admin) or assigned tasks (employee)
router.get('/', async (req, res) => {
  try {
    const { userId, role, project } = req.query;
    let filter = {};
    if (role !== 'ADMIN' && userId) {
      filter.assignedTo = userId;
    }
    if (project) {
      filter.project = project;
    }
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email image')
      .populate('project', 'name color')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error('[TASKS_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// CREATE task
router.post('/', async (req, res) => {
  try {
    const task = await Task.create(req.body);

    // SMART LINKING: Add employee to Project and Private Folder
    if (task.assignedTo && task.project) {
        try {
            // 1. Sync with Project
            await Project.findByIdAndUpdate(task.project, {
                $addToSet: { assignedEmployees: task.assignedTo }
            });

            // 2. Sync with Private Asset Folder
            await Folder.findOneAndUpdate(
                { linkedProject: task.project, isPrivate: true },
                { $addToSet: { authorizedUsers: task.assignedTo } }
            );

            if (global.io) global.io.emit('asset_update');
        } catch (syncErr) {
            console.error('[TASK_SYNC_ERROR]:', syncErr);
        }
    }

    res.status(201).json(task);
  } catch (err) {
    console.error('[TASK_CREATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// UPDATE task
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (status === 'completed') req.body.completedAt = new Date();
    
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    console.error('[TASK_UPDATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// ADD COMMENT
router.post('/:id/comments', async (req, res) => {
  try {
    const { userId, text } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { userId, text } } },
      { new: true }
    ).populate('comments.userId', 'name image');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment' });
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

// GET task stats
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
