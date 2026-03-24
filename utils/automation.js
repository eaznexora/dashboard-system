const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const Activity = require('../models/Activity');
const Project = require('../models/Project');

const logActivity = async (actorId, action, target, targetId, metadata) => {
  try {
    await Activity.create({
      actor: actorId,
      action,
      target,
      targetId,
      metadata
    });
  } catch (err) {
    console.error('[ACTIVITY_LOG_ERROR]:', err);
  }
};

const createOnboardingTasks = async (clientId, actorId) => {
  try {
    const defaultTasks = [
      { title: 'Kickoff meeting', priority: 'high', description: 'Schedule and conduct a kickoff meeting with the client.' },
      { title: 'Collect brand assets', priority: 'medium', description: 'Request logos, brand guidelines, and other assets.' },
      { title: 'Setup project workspace', priority: 'medium', description: 'Prepare internal tools and project folders.' }
    ];

    for (const t of defaultTasks) {
      await Task.create({
        ...t,
        status: 'pending'
      });
    }

    await logActivity(actorId, 'onboarded_client', 'Client', clientId, { message: 'Auto-onboarding tasks created' });
  } catch (err) {
    console.error('[ONBOARDING_TASKS_ERROR]:', err);
  }
};

const checkOverdueInvoices = async () => {
  try {
    const now = new Date();
    const result = await Invoice.updateMany(
      { 
        status: 'sent', 
        dueDate: { $lt: now } 
      },
      { status: 'overdue' }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`[AUTOMATION]: Flagged ${result.modifiedCount} invoices as overdue.`);
      // Note: Ideally log activity for each, but for now we skip to avoid flooding
    }
  } catch (err) {
    console.error('[OVERDUE_INVOICE_CHECK_ERROR]:', err);
  }
};

module.exports = {
  logActivity,
  createOnboardingTasks,
  checkOverdueInvoices
};
