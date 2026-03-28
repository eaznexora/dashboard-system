const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Folder = require('../models/Folder');

// GET all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('client', 'company contactName')
      .populate('lead', 'name email image')
      .populate('members', 'name email image')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('[PROJECTS_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// CREATE project
router.post('/', async (req, res) => {
  try {
    const project = await Project.create(req.body);

    // AUTO-CREATE PROJECT FOLDER IN ASSET HUB
    try {
        await Folder.create({
            name: project.name,
            linkedProject: project._id,
            isPrivate: true,
            authorizedUsers: [project.lead, ...(project.assignedEmployees || [])].filter(Boolean),
            createdBy: '000000000000000000000000' // Admin Ghost ID
        });
        if (global.io) global.io.emit('asset_update');
    } catch (folderErr) {
        console.error('[AUTO_FOLDER_CREATE_ERROR]:', folderErr);
    }

    res.status(201).json(project);
  } catch (err) {
    console.error('[PROJECT_CREATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// GET single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client')
      .populate('lead')
      .populate('members');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// UPDATE project
router.patch('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

module.exports = router;
