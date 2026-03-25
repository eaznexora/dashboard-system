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

    // 5. Advanced Revenue Intelligence (3 Months History + 4 Months Forecast)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const revenueHistory = new Array(7).fill(0);
    const categories = [];
    const projectBreakdown = []; // To store { month: "Jan", projects: [ { name, amount } ] }

    for (let i = -3; i <= 3; i++) {
        const index = i + 3; // 0 to 6
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthName = months[d.getMonth()];
        categories.push(monthName);
        
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        
        const monthData = { month: monthName, projects: [] };

        projects.forEach(p => {
            if (!p.budget) return;
            
            const pStart = p.startDate ? new Date(p.startDate) : new Date(p.createdAt);
            const pEnd = p.endDate ? new Date(p.endDate) : new Date(pStart.getFullYear(), pStart.getMonth() + 3, pStart.getDate());
            
            if (pStart <= monthEnd && pEnd >= monthStart) {
                const monthDiff = (pEnd.getFullYear() - pStart.getFullYear()) * 12 + (pEnd.getMonth() - pStart.getMonth()) + 1;
                const monthlyWeight = Math.round(p.budget / (monthDiff || 1));
                
                revenueHistory[index] += monthlyWeight;
                monthData.projects.push({ name: p.name, amount: monthlyWeight });
            }
        });
        projectBreakdown.push(monthData);
    }

    // 6. Comprehensive Employee Utilization (All Employees)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Fetch all employees as requested
    const allEmployees = await User.find({ role: 'EMPLOYEE' });
    const todayLogs = await TimeLog.find({ clockIn: { $gte: todayStart } });

    const employeeStats = allEmployees.map(e => {
        const empLogs = todayLogs.filter(l => l.userId.toString() === e._id.toString());
        const hoursToday = empLogs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
        return {
            name: e.name,
            hours: parseFloat(hoursToday.toFixed(1)),
            isActive: e.isActive
        };
    });

    res.json({
      totalRevenue,
      avgProductivity,
      activeProjectsCount,
      revenueHistory,
      revenueCategories: categories,
      projectBreakdown,
      taskStats: [taskStats.todo, taskStats.working, taskStats.review, taskStats.done],
      employeeStats
    });
  } catch (err) {
    console.error('[REPORTS_API_ERROR]:', err);
    res.status(500).json({ message: 'Failed to generate report data' });
  }
});

module.exports = router;
