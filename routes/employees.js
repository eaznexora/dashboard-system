const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

// GET all employees (admin only)
router.get('/', async (req, res) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' }).select('-password').sort({ name: 1 });
    
    // Check who is currently clocked in
    const activeTimeLogs = await TimeLog.find({ clockOut: null });
    const activeIds = activeTimeLogs.map(t => t.userId.toString());

    const result = employees.map(emp => ({
      ...emp.toObject(),
      isCurrentlyWorking: activeIds.includes(emp._id.toString())
    }));

    res.json(result);
  } catch (err) {
    console.error('[EMPLOYEES_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// UPDATE employee (admin only - designation, department, isActive/fire, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const employee = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    console.error('[EMPLOYEE_UPDATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// CLOCK IN
router.post('/clock-in', async (req, res) => {
  try {
    const userId = req.body.userId;
    const existing = await TimeLog.findOne({ userId, clockOut: null });
    if (existing) return res.status(400).json({ message: 'Already clocked in.' });

    const log = await TimeLog.create({ userId, clockIn: new Date() });
    res.status(201).json({ message: 'Clocked in successfully', log });
  } catch (err) {
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
    res.status(500).json({ message: 'Clock-out failed' });
  }
});

// GET current status
router.get('/status/:userId', async (req, res) => {
  try {
    const activeLog = await TimeLog.findOne({ userId: req.params.userId, clockOut: null });
    res.json({ isClockedIn: !!activeLog, log: activeLog });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// GET history and today's hours
router.get('/history/:userId', async (req, res) => {
  try {
    const logs = await TimeLog.find({ userId: req.params.userId }).sort({ clockIn: -1 }).limit(30);
    
    // Calculate today's hours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await TimeLog.find({ 
      userId: req.params.userId, 
      clockIn: { $gte: today } 
    });
    const todayHours = todayLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    
    const totalHours = logs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    res.json({ 
      logs, 
      totalHours: parseFloat(totalHours.toFixed(2)),
      todayHours: parseFloat(todayHours.toFixed(2)) 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

module.exports = router;
