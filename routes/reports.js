const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');
const Invoice = require('../models/Invoice');

// GET agency intelligence data
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    const projects = await Project.find();
    const employees = await User.find({ role: 'EMPLOYEE' });
    const invoices = await Invoice.find({ status: 'paid' });

    // 1. Task Distribution
    const taskStats = {
      todo: tasks.filter(t => t.status === 'pending').length,
      working: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'completed').length,
    };

    // 2. Active Projects
    const activeProjectsCount = projects.filter(p => p.status !== 'completed').length;

    // 3. Real Financials (Sum of paid invoices)
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    // 4. Productivity (7-day rolling average)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day 7 days ago
    
    const recentLogs = await TimeLog.find({ clockIn: { $gte: sevenDaysAgo } });
    
    const totalHoursRecent = recentLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    // Target: 8 hours per employee per day across 5 working days in a week
    const targetHours = employees.length * 8 * 5; 
    const avgProductivity = targetHours > 0 ? Math.min(100, Math.round((totalHoursRecent / targetHours) * 100)) : 0;

    // 5. Revenue History (Last 7 months including current)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const revenueHistory = [];
    const categories = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[targetDate.getMonth()];
      categories.push(mName);
      
      const monthlyTotal = invoices
        .filter(inv => {
          const invDate = new Date(inv.issueDate);
          return invDate.getMonth() === targetDate.getMonth() && invDate.getFullYear() === targetDate.getFullYear();
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      revenueHistory.push(monthlyTotal);
    }

    // 6. Employee Utilization (Resource Capacity % of 40hr week)
    const utilChart = employees.map(e => {
        const empLogs = recentLogs.filter(l => l.userId.toString() === e._id.toString());
        const hoursThisWeek = empLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
        // Capacity is 40 hours for a 7-day period
        return Math.min(100, Math.round((hoursThisWeek / 40) * 100));
    });

    res.json({
      totalRevenue,
      avgProductivity,
      activeProjectsCount,
      revenueHistory,
      revenueCategories: categories,
      taskStats: [taskStats.todo, taskStats.working, taskStats.review, taskStats.done],
      employeeHours: utilChart,
      employeeNames: employees.map(e => e.name)
    });
  } catch (err) {
    console.error('[REPORTS_API_ERROR]:', err);
    res.status(500).json({ message: 'Failed to generate report data' });
  }
});

module.exports = router;
