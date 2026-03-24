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

    // 1. Task Distribution & Productivity
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const taskStats = {
      todo: tasks.filter(t => t.status === 'pending').length,
      working: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: completedTasks,
    };

    // 2. Active Projects
    const activeProjectsCount = projects.filter(p => p.status === 'active').length;

    // 3. Total Revenue (Sum of all project budgets)
    const totalRevenue = projects.reduce((sum, proj) => sum + (proj.budget || 0), 0);

    // 4. Avg Productivity (Based on Task Distribution - Completed %)
    const avgProductivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 5. Revenue Forecast (Forward-looking 7 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const revenueHistory = new Array(7).fill(0);
    const categories = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        categories.push(months[d.getMonth()]);
        
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        projects.forEach(p => {
            if (!p.budget) return;
            
            // Fallback for missing dates
            const pStart = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
            const pEnd = p.endDate ? new Date(p.endDate) : new Date(pStart.getFullYear(), pStart.getMonth() + 3, pStart.getDate());
            
            // If project is active during this month
            if (pStart <= monthEnd && pEnd >= monthStart) {
                // Calculate duration in months (min 1)
                const monthDiff = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
                const monthlyWeight = p.budget / (monthDiff || 1);
                revenueHistory[i] += monthlyWeight;
            }
        });
        revenueHistory[i] = Math.round(revenueHistory[i]);
    }

    // 6. Employee Utilization (Today's Working Hours - Only Active Employees)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const activeEmployees = await User.find({ role: 'EMPLOYEE', isActive: true });
    const todayLogs = await TimeLog.find({ clockIn: { $gte: todayStart } });

    const employeeHours = activeEmployees.map(e => {
        const empLogs = todayLogs.filter(l => l.userId.toString() === e._id.toString());
        const hoursToday = empLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
        return parseFloat(hoursToday.toFixed(1));
    });

    res.json({
      totalRevenue,
      avgProductivity,
      activeProjectsCount,
      revenueHistory,
      revenueCategories: categories,
      taskStats: [taskStats.todo, taskStats.working, taskStats.review, taskStats.done],
      employeeHours,
      employeeNames: activeEmployees.map(e => e.name)
    });
  } catch (err) {
    console.error('[REPORTS_API_ERROR]:', err);
    res.status(500).json({ message: 'Failed to generate report data' });
  }
});

module.exports = router;
