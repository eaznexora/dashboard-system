const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');

// GET all issues (Admin only)
router.get('/', async (req, res) => {
    try {
        const issues = await Issue.find()
            .populate('submittedBy', 'name')
            .populate('project', 'name')
            .sort({ createdAt: -1 });
        res.json(issues);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch issues' });
    }
});

// POST new issue (Employee)
router.post('/', async (req, res) => {
    try {
        const { title, description, project, submittedBy, priority } = req.body;
        const newIssue = new Issue({
            title,
            description,
            project: project || null,
            submittedBy,
            priority: priority || 'medium'
        });
        await newIssue.save();
        res.status(201).json(newIssue);
    } catch (err) {
        res.status(500).json({ message: 'Failed to submit issue' });
    }
});

// PATCH issue status & admin reply
router.patch('/:id', async (req, res) => {
    try {
        const { status, adminReply } = req.body;
        const updateData = { status, updatedAt: Date.now() };
        
        if (adminReply !== undefined) {
            updateData.adminReply = adminReply;
            updateData.adminRepliedAt = Date.now();
        }
        
        if (status === 'resolved' || status === 'approved' || status === 'rejected') {
            updateData.resolvedAt = Date.now();
        }

        const issue = await Issue.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(issue);
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
});

// DELETE issue
router.delete('/:id', async (req, res) => {
    try {
        await Issue.findByIdAndDelete(req.params.id);
        res.json({ message: 'Issue deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
});

module.exports = router;

