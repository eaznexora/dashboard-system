const defaultAgencyData = {
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
    
    // Updated: Payroll split into Billable vs Non-Billable + Others
    expenseChart: [35, 20, 15, 20, 10], 
    
    // New: Cash Flow Forecast (Income vs Expenses) Q1/Q2 variants (90 Days view)
    cashFlowIncomeQ1: [1450000, 1500000, 1600000],
    cashFlowExpenseQ1: [600000, 580000, 500000],
    cashFlowIncomeQ2: [1650000, 1700000, 1850000],
    cashFlowExpenseQ2: [550000, 600000, 620000],
    
    // New: P&L Waterfall (Revenue, Payroll, Marketing, Ops, Net Income)
    plWaterfall: [1450000, -350000, -150000, -250000, 700000]
  },
  operations: {
    // Replaced DevOps with Resource Utilization & Project Delivery Variance
    utilization: "86%", utilizationChange: "+4%", utilizationPos: true,
    deliveryVar: "-12h", deliveryVarChange: "Ahead of schedule", deliveryVarPos: true,
    activeProjects: "18", activeProjectsChange: "+2", activeProjectsPos: true,
    benchTime: "14%", benchTimeChange: "-2%", benchTimePos: true,
    
    // New: Resource Utilization (Design vs Dev Workload Arrays)
    designWorkload: [120, 150, 140, 180, 200, 160],
    devWorkload: [240, 300, 280, 320, 350, 300],
    
    // New: Project Delivery Variance (Estimated vs Actual Hours)
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
    
    // New: Sales Pipeline Funnel (Lead → Discovery → Proposal → Signed) 
    pipelineFunnel: [250, 120, 45, 14], 
    
    // New: Service Profitability (Revenue vs Cost)
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
    
    // New: Client Concentration Risk (Top 3 clients % vs. rest %)
    clientRisk: [45, 55],
    topClientsList: [450000, 320000, 210000] 
  }
};

// Bump version explicitly to force browsers to blow out old DevOps cached structures
const STORE_VERSION = "1.1.0";

window.EazStore = {
  get: () => {
    try {
      const storedVer = localStorage.getItem('eaz_version');
      if (storedVer !== STORE_VERSION) {
        localStorage.removeItem('eaz_data');
        localStorage.setItem('eaz_version', STORE_VERSION);
        return defaultAgencyData;
      }
      const stored = localStorage.getItem('eaz_data');
      return stored ? JSON.parse(stored) : defaultAgencyData;
    } catch (e) {
      return defaultAgencyData;
    }
  },
  save: (data) => {
    localStorage.setItem('eaz_data', JSON.stringify(data));
    localStorage.setItem('eaz_version', STORE_VERSION);
  },
  reset: () => {
    localStorage.removeItem('eaz_data');
    localStorage.removeItem('eaz_version');
  }
};
