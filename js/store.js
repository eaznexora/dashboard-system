// EazStore — Fetches dashboard data from MongoDB API instead of localStorage

window.EazStore = {
  // Fetch metrics for a category from the API
  getCategory: async (category) => {
    try {
      const res = await fetch(`/api/dashboard/${category}`);
      if (res.ok) return await res.json();
      console.error(`Fetch failed for ${category}: Status ${res.status}`);
      return null;
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
      return null;
    }
  },

  // Legacy sync getter (returns defaults if API unavailable)
  get: () => {
    // Return defaults for pages that still use sync access during transition
    return {
      marketing: { visitors: "—", visitorsChange: "—", visitorsPos: true, leads: "—", leadsChange: "—", leadsPos: true, cost: "—", costChange: "—", costPos: true, spend: "—", spendChange: "—", spendPos: true, chart: [0,0,0,0,0,0,0] },
      financial: { revenue: "—", revenueChange: "—", revenuePos: true, invoices: "—", invoicesChange: "—", invoicesPos: true, margin: "—", marginChange: "—", marginPos: true, cashflow: "—", cashflowChange: "—", cashflowPos: true, revenueChart: [0,0,0,0,0,0], expenseChart: [0,0,0,0,0], cashFlowIncomeQ1:[0,0,0],cashFlowExpenseQ1:[0,0,0],cashFlowIncomeQ2:[0,0,0],cashFlowExpenseQ2:[0,0,0],plWaterfall:[0,0,0,0,0] },
      operations: { utilization: "—", utilizationChange: "—", utilizationPos: true, deliveryVar: "—", deliveryVarChange: "—", deliveryVarPos: true, activeProjects: "—", activeProjectsChange: "—", activeProjectsPos: true, benchTime: "—", benchTimeChange: "—", benchTimePos: true, designWorkload:[0,0,0,0,0,0],devWorkload:[0,0,0,0,0,0],estHours:[0,0,0,0],actHours:[0,0,0,0] },
      support: { response: "—", responseChange: "—", responsePos: true, resolution: "—", resolutionChange: "—", resolutionPos: true, tickets: "—", ticketsChange: "—", ticketsPos: true, csat: "—", csatChange: "—", csatPos: true, volumeChart:[0,0,0,0,0,0,0] },
      sales: { contracts: "—", contractsChange: "—", contractsPos: true, bookings: "—", bookingsChange: "—", bookingsPos: true, winRate: "—", winRateChange: "—", winRatePos: true, avgProj: "—", avgProjChange: "—", avgProjPos: true, salesLine:[0,0,0,0,0],salesBar:[0,0,0,0],pipelineFunnel:[0,0,0,0],serviceRevenue:[0,0,0,0],serviceCost:[0,0,0,0] },
      executive: { mrr: "—", mrrChange: "—", mrrPos: true, retainers: "—", retainersChange: "—", retainersPos: true, margin: "—", marginChange: "—", marginPos: true, runway: "—", runwayChange: "—", runwayPos: true, revBar:[0,0,0,0,0,0],expBar:[0,0,0,0,0,0],growthLine:[0,0,0,0],clientRisk:[0,0],topClientsList:[0,0,0] }
    };
  },

  // Save is now handled by the admin panel via API
  save: () => {},
  reset: () => {}
};
