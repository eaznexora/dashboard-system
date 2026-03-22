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
    expenseChart: [55, 15, 20, 10]
  },
  operations: {
    success: "99.8%", successChange: "+0.1%", successPos: true,
    failures: "24", failuresChange: "+4", failuresPos: false,
    downtime: "₹42,000", downtimeChange: "Protected via failover", downtimePos: true,
    load: "42%", loadChange: "Stable", loadPos: true,
    cpuChart: [20, 15, 45, 60, 42, 35, 25],
    memChart: [40, 40, 50, 75, 78, 55, 45]
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
    salesBar: [1500000, 4200000, 850000, 1200000]
  },
  executive: {
    mrr: "₹14,25,000", mrrChange: "Target: ₹15,00,000", mrrPos: true,
    retainers: "124", retainersChange: "+4 this month", retainersPos: true,
    margin: "76.4%", marginChange: "Industry Avg: 72%", marginPos: true,
    runway: "18 Months", runwayChange: "Stable", runwayPos: true,
    revBar: [1200000, 1350000, 1250000, 1500000, 1450000, 1600000],
    expBar: [800000, 850000, 800000, 950000, 900000, 1000000],
    growthLine: [1.2, 1.4, 1.8, 2.5]
  }
};

const STORE_VERSION = "1.0.1";

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
