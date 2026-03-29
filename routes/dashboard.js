const express = require('express');
const router = express.Router();
const DashboardMetrics = require('../models/DashboardMetrics');

// Default data (migrated from store.js) — used for initial seeding
const defaultMetrics = {
  marketing: {
    visitors: "124,500", visitorsChange: "+12.5%", visitorsPos: true,
    leads: "4,250", leadsChange: "+8.2%", leadsPos: true,
    cost: "₹850", costChange: "-₹45", costPos: true,
    spend: "₹3,40,000", spendChange: "On track", spendPos: true,
    chart: [1200, 1900, 1500, 2500, 2200, 3000, 3500]
  },
  financial: {
    revenue: "₹14,50,000", revenueChange: "+8.2%", revenuePos: true,
    invoices: "142", invoicesChange: "+3.1%", invoicesPos: true,
    margin: "24.5%", marginChange: "-0.8%", marginPos: false,
    cashflow: "₹8,50,000", cashflowChange: "+14.2%", cashflowPos: true,
    revenueChart: [650000, 590000, 800000, 810000, 560000, 1450000],
    expenseChart: [35, 20, 15, 20, 10],
    cashFlowIncomeQ1: [1450000, 1500000, 1600000],
    cashFlowExpenseQ1: [600000, 580000, 500000],
    cashFlowIncomeQ2: [1650000, 1700000, 1850000],
    cashFlowExpenseQ2: [550000, 600000, 620000],
    plWaterfall: [1450000, -350000, -150000, -250000, 700000]
  },
  operations: {
    utilization: "86%", utilizationChange: "+4%", utilizationPos: true,
    deliveryVar: "-12h", deliveryVarChange: "Ahead of schedule", deliveryVarPos: true,
    activeProjects: "18", activeProjectsChange: "+2", activeProjectsPos: true,
    benchTime: "14%", benchTimeChange: "-2%", benchTimePos: true,
    designWorkload: [120, 150, 140, 180, 200, 160],
    devWorkload: [240, 300, 280, 320, 350, 300],
    estHours: [450, 500, 480, 520],
    actHours: [420, 510, 460, 490]
  },
  support: {
    response: "1h 14m", responseChange: "-10m", responsePos: true,
    resolution: "92.4%", resolutionChange: "+2.1%", resolutionPos: true,
    tickets: "34", ticketsChange: "+12 new today", ticketsPos: false,
    csat: "4.8/5.0", csatChange: "Based on 1.2k ratings", csatPos: true,
    volumeChart: [120, 190, 150, 220, 180, 80, 60]
  },
  sales: {
    contracts: "14", contractsChange: "+2", contractsPos: true,
    bookings: "₹4,25,000", bookingsChange: "+₹40,000", bookingsPos: true,
    winRate: "32.4%", winRateChange: "+4.1%", winRatePos: true,
    avgProj: "₹3,10,000", avgProjChange: "-₹15,000", avgProjPos: false,
    salesLine: [1200000, 1800000, 1400000, 2600000, 3100000],
    salesBar: [1500000, 4200000, 850000, 1200000],
    pipelineFunnel: [250, 120, 45, 14],
    serviceRevenue: [800000, 450000, 300000, 200000],
    serviceCost: [300000, 150000, 100000, 80000]
  },
  executive: {
    mrr: "₹14,25,000", mrrChange: "Target: ₹15,00,000", mrrPos: true,
    retainers: "124", retainersChange: "+4 this month", retainersPos: true,
    margin: "76.4%", marginChange: "Industry Avg: 72%", marginPos: true,
    runway: "18 Months", runwayChange: "Stable", runwayPos: true,
    revBar: [1200000, 1350000, 1250000, 1500000, 1450000, 1600000],
    expBar: [800000, 850000, 800000, 950000, 900000, 1000000],
    growthLine: [1.2, 1.4, 1.8, 2.5],
    clientRisk: [45, 55],
    topClientsList: [450000, 320000, 210000]
  }
};

// GET metrics for a category
router.get('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    let doc = await DashboardMetrics.findOne({ category });

    // Auto-seed if not in DB yet
    if (!doc && defaultMetrics[category]) {
      doc = await DashboardMetrics.create({ category, metrics: defaultMetrics[category] });
    }

    if (!doc) return res.status(404).json({ message: 'Category not found' });
    res.json(doc.metrics);
  } catch (err) {
    console.error('[DASHBOARD_GET_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// PUT update metrics (admin saves from panel)
router.put('/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { metrics } = req.body;

    const doc = await DashboardMetrics.findOneAndUpdate(
      { category },
      { metrics, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json({ message: 'Dashboard updated', doc });
  } catch (err) {
    console.error('[DASHBOARD_PUT_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update dashboard' });
  }
});

// SEED all defaults
router.post('/seed/all', async (req, res) => {
  try {
    for (const [category, metrics] of Object.entries(defaultMetrics)) {
      await DashboardMetrics.findOneAndUpdate({ category }, { metrics }, { upsert: true });
    }
    res.json({ message: 'All dashboard metrics seeded successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Seeding failed' });
  }
});

module.exports = router;

