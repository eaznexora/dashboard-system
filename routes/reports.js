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
            if (!p.budget || !p.startDate || !p.endDate) return;
            
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            
            // If project is active during this month
            if (pStart <= monthEnd && pEnd >= monthStart) {
                // Calculate duration in months (min 1)
                const monthDiff = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
                const monthlyWeight = p.budget / monthDiff;
                revenueHistory[i] += monthlyWeight;
            }
        });
        revenueHistory[i] = Math.round(revenueHistory[i]);
    }

    // 6. Employee Utilization & Payroll Analytics Optimization
    
    // --- TIME BOUNDARIES ---
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    // Week starts on Monday (1)
    const dayOfWeek = now.getDay(); 
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() + diffToMonday);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeEmployees = await User.find({ role: 'EMPLOYEE', isActive: true });
    
    // FETCH ALL LOGS FOR THE CURRENT MONTH (Single Query Optimization)
    const monthLogs = await TimeLog.find({ 
      clockIn: { $gte: monthStart },
      userId: { $in: activeEmployees.map(e => e._id) }
    });

    const payrollData = [];
    const employeeHours = activeEmployees.map(e => {
        const empLogs = monthLogs.filter(l => l.userId.toString() === e._id.toString());
        
        let today = 0, yesterday = 0, week = 0, month = 0, liveNow = false;

        empLogs.forEach(l => {
            const clockIn = new Date(l.clockIn);
            const clockOut = l.clockOut ? new Date(l.clockOut) : now;
            const isLive = !l.clockOut;
            
            // Calculate actual work hours (subtract pause time if provided by schema)
            let total = l.totalHours || (clockOut - clockIn) / (1000 * 60 * 60);
            
            // Today
            if (clockIn >= todayStart) {
                today += total;
                if (isLive) liveNow = true;
            }
            // Yesterday
            if (clockIn >= yesterdayStart && clockIn <= yesterdayEnd) {
                yesterday += total;
            }
            // Week
            if (clockIn >= weekStart) {
                week += total;
            }
            // Month
            month += total;
        });

        payrollData.push({
            id: e._id,
            name: e.name,
            department: e.department || 'Creative',
            today: parseFloat(today.toFixed(2)),
            yesterday: parseFloat(yesterday.toFixed(2)),
            week: parseFloat(week.toFixed(2)),
            month: parseFloat(month.toFixed(2)),
            isLive: liveNow
        });

        return parseFloat(today.toFixed(1));
    });

    res.json({
      totalRevenue,
      avgProductivity,
      activeProjectsCount,
      revenueHistory,
      revenueCategories: categories,
      taskStats: [taskStats.todo, taskStats.working, taskStats.review, taskStats.done],
      employeeHours,
      employeeNames: activeEmployees.map(e => e.name),
      payrollData
    });
  } catch (err) {
    console.error('[REPORTS_API_ERROR]:', err);
    res.status(500).json({ message: 'Failed to generate report data' });
  }
});

module.exports = router;

