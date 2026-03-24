const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');

// GET agency intelligence data
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    const projects = await Project.find();
    const employees = await User.find({ role: 'EMPLOYEE' });

    // 1. Task Distribution
    const taskStats = {
      todo: tasks.filter(t => t.status === 'pending').length,
      working: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'completed').length,
    };

    // 2. Active Projects
    const activeProjectsCount = projects.filter(p => p.status !== 'completed').length;

    // 3. Financials (Dummy for now, can be expanded)
    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

    // 4. Productivity (Average total hours today vs estimated)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayLogs = await TimeLog.find({ clockIn: { $gte: today } });
    const totalHoursToday = todayLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    const avgProductivity = employees.length > 0 ? Math.min(100, Math.round((totalHoursToday / (employees.length * 8)) * 100)) : 0;

    // 5. Charts Data (Mocking 7 months to match frontend categories)
    const revenueChart = [totalRevenue * 0.4, totalRevenue * 0.5, totalRevenue * 0.7, totalRevenue * 0.6, totalRevenue * 0.8, totalRevenue * 0.9, totalRevenue];
    const taskChart = [taskStats.todo, taskStats.working, taskStats.review, taskStats.done];
    const utilChart = employees.map(e => {
        const empLogs = todayLogs.filter(l => l.userId.toString() === e._id.toString());
        return Math.round((empLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0) / 8) * 100);
    });

    res.json({
      totalRevenue,
      avgProductivity,
      activeProjectsCount,
      revenueHistory: revenueChart,
      taskStats: taskChart,
      employeeHours: utilChart,
      employeeNames: employees.map(e => e.name)
    });
  } catch (err) {
    console.error('[REPORTS_API_ERROR]:', err);
    res.status(500).json({ message: 'Failed to generate report data' });
  }
});

module.exports = router;
