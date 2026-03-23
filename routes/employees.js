const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

// GET all employees (admin only)
router.get('/', async (req, res) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' }).select('-password');
    
    // Attach active status (has open timelog)
    const activeTimeLogs = await TimeLog.find({ clockOut: null }).populate('userId', 'name email');
    const activeIds = activeTimeLogs.map(t => t.userId?._id?.toString());

    const result = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      image: emp.image,
      isActive: activeIds.includes(emp._id.toString()),
      createdAt: emp.createdAt
    }));

    res.json(result);
  } catch (err) {
    console.error('[EMPLOYEES_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// CLOCK IN
router.post('/clock-in', async (req, res) => {
  try {
    const userId = req.body.userId;
    
    // Check if already clocked in
    const existing = await TimeLog.findOne({ userId, clockOut: null });
    if (existing) return res.status(400).json({ message: 'Already clocked in. Clock out first.' });

    const log = await TimeLog.create({ userId, clockIn: new Date() });
    res.status(201).json({ message: 'Clocked in successfully', log });
  } catch (err) {
    console.error('[CLOCK_IN_ERROR]:', err);
    res.status(500).json({ message: 'Clock-in failed' });
  }
});

// CLOCK OUT
router.post('/clock-out', async (req, res) => {
  try {
    const userId = req.body.userId;
    
    const log = await TimeLog.findOne({ userId, clockOut: null });
    if (!log) return res.status(400).json({ message: 'No active clock-in found.' });

    log.clockOut = new Date();
    log.totalHours = parseFloat(((log.clockOut - log.clockIn) / (1000 * 60 * 60)).toFixed(2));
    await log.save();

    res.json({ message: 'Clocked out successfully', totalHours: log.totalHours });
  } catch (err) {
    console.error('[CLOCK_OUT_ERROR]:', err);
    res.status(500).json({ message: 'Clock-out failed' });
  }
});

// GET current status for a user
router.get('/status/:userId', async (req, res) => {
  try {
    const activeLog = await TimeLog.findOne({ userId: req.params.userId, clockOut: null });
    res.json({ isClockedIn: !!activeLog, log: activeLog });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// GET work history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const logs = await TimeLog.find({ userId: req.params.userId }).sort({ clockIn: -1 }).limit(30);
    const totalHours = logs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    res.json({ logs, totalHours: parseFloat(totalHours.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// GET who is currently active (admin view)
router.get('/tracking', async (req, res) => {
  try {
    const activeLogs = await TimeLog.find({ clockOut: null }).populate('userId', 'name email image');
    res.json(activeLogs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch active tracking' });
  }
});

module.exports = router;
