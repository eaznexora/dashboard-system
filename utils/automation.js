const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const TimeLog = require('../models/TimeLog');

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
    const defaultTasks = [];

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

const autoClockOutIdleUsers = async () => {
  try {
    const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const cutoff = new Date(Date.now() - IDLE_THRESHOLD_MS);

    const idleLogs = await TimeLog.find({
      clockOut: null,
      status: 'working',  // Only sweep actively working sessions, not intentional breaks
      lastPingTime: { $lt: cutoff }
    });

    for (const log of idleLogs) {
      log.clockOut = log.lastPingTime; // Fair: only count time until last known alive
      log.totalHours = parseFloat(((log.clockOut - log.clockIn) / (1000 * 60 * 60)).toFixed(2));
      await log.save();
      console.log(`[SWEEPER]: Auto-clocked out userId ${log.userId} — idle since ${log.lastPingTime.toISOString()}`);
    }

    if (idleLogs.length > 0) {
      console.log(`[SWEEPER]: Total auto-clockouts this cycle: ${idleLogs.length}`);
    }
  } catch (err) {
    console.error('[SWEEPER_ERROR]:', err);
  }
};

module.exports = {
  logActivity,
  createOnboardingTasks,
  checkOverdueInvoices,
  autoClockOutIdleUsers
};

