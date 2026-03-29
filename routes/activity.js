const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');

// GET all activity (admin)
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('actor', 'name email image')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    console.error('[ACTIVITY_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
});

// GET notifications for a user (unread)
router.get('/notifications/:userId', async (req, res) => {
  try {
    const activities = await Activity.find({
      readBy: { $ne: req.params.userId }
    })
    .populate('actor', 'name email image')
    .sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// MARK AS READ
router.post('/read', async (req, res) => {
  try {
    const { userId, activityIds } = req.body;
    await Activity.updateMany(
      { _id: { $in: activityIds } },
      { $addToSet: { readBy: userId } }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications' });
  }
});

module.exports = router;

