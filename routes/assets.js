const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');



const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_eaz_123';

// --- DIRECTORY GUARANTEE ---
const UPLOAD_ROOT = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// --- AUTH PROTECTION ---
const protect = (req, res, next) => {
  try {
    const token = req.cookies?.eaz_token;
    if (!token) return res.status(401).json({ error: 'Session expired. Please log in again.' });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized access' });
  }
};

router.use(protect);

// --- CREATOR ID RESOLUTION ---
const getCreatorId = (user) => {
    if (!user) return '000000000000000000000000';
    const id = String(user._id || user.id);
    return (id && id.length === 24) ? id : '000000000000000000000000'; // 24-zeros represents the Admin
};


// --- BULLETPROOF MULTER CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB Limit
});

/**
 * GET: LIST ASSETS & FOLDERS
 */
router.get('/', async (req, res) => {
  try {
    const parentFolder = (req.query.folderId === 'null' || !req.query.folderId) ? null : req.query.folderId;
    const mongoose = require('mongoose');

    // 1. USE .lean() TO BYPASS MONGOOSE STRICT MODE
    let folderQuery = { parentFolder, isTrashed: false };
    
    // Privacy Filter: Employees only see public folders OR those they are authorized for
    if (req.user && req.user.role !== 'ADMIN') {
        const userId = req.user.id || req.user._id;
        folderQuery.$or = [
            { isPrivate: false },
            { isPrivate: { $exists: false } }, // Fallback for old data
            { authorizedUsers: userId }
        ];
    }

    let folders = await Folder.find(folderQuery).sort({ name: 1 }).lean();
    let assets = await Asset.find({ parentFolder, isTrashed: false }).sort({ createdAt: -1 }).lean();

    // 2. NATIVE DATABASE LOOKUP
    try {
      const creatorIds = [...new Set([
        ...folders.map(f => String(f.createdBy)),
        ...assets.map(a => String(a.createdBy))
      ])].filter(id => id && id !== '000000000000000000000000' && id !== 'undefined');

      const objectIds = creatorIds.reduce((acc, id) => {
        try { acc.push(new mongoose.Types.ObjectId(id)); } catch(e) {}
        return acc;
      }, []);

      const db = mongoose.connection.db;
      let users = [];
      if (objectIds.length > 0 && db) {
        users = await db.collection('users').find({ _id: { $in: objectIds } }).toArray();
        if (users.length === 0) users = await db.collection('employees').find({ _id: { $in: objectIds } }).toArray();
      }

      const userMap = {};
      users.forEach(u => {
        userMap[String(u._id)] = { _id: String(u._id), name: u.name || u.fullName || u.email || 'Employee' };
      });

      const mapCreator = (item) => {
        const idStr = String(item.createdBy);
        if (idStr === '000000000000000000000000') item.createdBy = { _id: idStr, name: 'Admin' };
        else if (userMap[idStr]) item.createdBy = userMap[idStr];
        else item.createdBy = { _id: idStr, name: 'Unknown Employee' };
        return item;
      };

      folders = folders.map(mapCreator);
      assets = assets.map(mapCreator);
    } catch (nativePopErr) {
      console.error('[Native Populate Error]:', nativePopErr);
    }

    let breadcrumbs = [];
    if (parentFolder) {
      let current = await Folder.findById(parentFolder);
      while (current) {
        breadcrumbs.unshift({ id: current._id, name: current.name });
        current = current.parentFolder ? await Folder.findById(current.parentFolder) : null;
      }
    }

    res.json({ folders, assets, breadcrumbs });
  } catch (err) {
    res.status(500).json({ error: 'Query failed: ' + err.message });
  }
});

/**
 * GET: LIST TRASHED ITEMS
 */
router.get('/trash', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let folders = await Folder.find({ isTrashed: true }).sort({ name: 1 }).lean();
    let assets = await Asset.find({ isTrashed: true }).sort({ updatedAt: -1 }).lean();

    try {
      const creatorIds = [...new Set([
        ...folders.map(f => String(f.createdBy)),
        ...assets.map(a => String(a.createdBy))
      ])].filter(id => id && id !== '000000000000000000000000' && id !== 'undefined');

      const objectIds = creatorIds.reduce((acc, id) => {
        try { acc.push(new mongoose.Types.ObjectId(id)); } catch(e) {}
        return acc;
      }, []);

      const db = mongoose.connection.db;
      let users = [];
      if (objectIds.length > 0 && db) {
        users = await db.collection('users').find({ _id: { $in: objectIds } }).toArray();
        if (users.length === 0) users = await db.collection('employees').find({ _id: { $in: objectIds } }).toArray();
      }

      const userMap = {};
      users.forEach(u => {
        userMap[String(u._id)] = { _id: String(u._id), name: u.name || u.fullName || u.email || 'Employee' };
      });

      const mapCreator = (item) => {
        const idStr = String(item.createdBy);
        if (idStr === '000000000000000000000000') item.createdBy = { _id: idStr, name: 'Admin' };
        else if (userMap[idStr]) item.createdBy = userMap[idStr];
        else item.createdBy = { _id: idStr, name: 'Unknown Employee' };
        return item;
      };

      folders = folders.map(mapCreator);
      assets = assets.map(mapCreator);
    } catch (nativePopErr) {
      console.error('[Native Populate Error]:', nativePopErr);
    }

    res.json({ folders, assets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trash: ' + err.message });
  }
});

/**
 * POST: CREATE FOLDER
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const folder = new Folder({
      name,
      parentFolder: (parentFolder === 'null' || !parentFolder) ? null : parentFolder,
      createdBy: getCreatorId(req.user)
    });

    await folder.save();
    if (global.io) global.io.emit('asset_update');
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder: ' + err.message });
  }
});

/**
 * POST: UPLOAD FILES (Support for 5GB + Array Uploads)
 */
router.post('/upload', upload.array('file', 1000), async (req, res) => {
  try {
    const { parentFolder } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files received' });
    }

    const savedAssets = [];
    for (const file of files) {
      try {
        const asset = new Asset({
          name: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/${file.filename}`,
          thumbnailUrl: null,
          parentFolder: (parentFolder === 'null' || !parentFolder) ? null : parentFolder,
          createdBy: getCreatorId(req.user)
        });

        await asset.save();
        savedAssets.push(asset);
      } catch (dbErr) {
        // DATABASE FAIL-SAFE: CLEAN UP ORPHANED FILE
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        console.error('[UPLOAD_DB_ERROR]:', dbErr);
      }
    }

    if (global.io) global.io.emit('asset_update');
    return res.status(200).json(savedAssets);
  } catch (err) {
    console.error('[CRITICAL_UPLOAD_FAILURE]:', err);
    return res.status(500).json({ error: 'Upload process failed: ' + err.message });
  }
});

/**
 * PATCH: RESTORE FROM TRASH
 */
router.patch('/:id/restore', async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'folder') await Folder.findByIdAndUpdate(req.params.id, { isTrashed: false });
    else await Asset.findByIdAndUpdate(req.params.id, { isTrashed: false });

    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

/**
 * DELETE: PERMANENT DELETION
 */
router.delete('/:id/permanent', async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'folder') {
      await Folder.findByIdAndDelete(req.params.id);
    } else {
      const asset = await Asset.findByIdAndDelete(req.params.id);
      if (asset) {
        const filePath = path.join(UPLOAD_ROOT, path.basename(asset.url));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Permanent deletion failed: ' + err.message });
  }
});

/**
 * POST: DUPLICATE
 */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { type, destinationFolder } = req.body;
    const targetFolder = (destinationFolder === 'null' || !destinationFolder) ? null : destinationFolder;

    if (type === 'folder') {
      const original = await Folder.findById(req.params.id);
      const clone = new Folder({
        name: original.name + ' - Copy',
        parentFolder: targetFolder,
        createdBy: getCreatorId(req.user)
      });
      await clone.save();
    } else {
      const original = await Asset.findById(req.params.id);
      const clone = new Asset({
        name: original.name + ' - Copy',
        originalName: original.originalName,
        mimeType: original.mimeType,
        size: original.size,
        url: original.url,
        thumbnailUrl: original.thumbnailUrl,
        parentFolder: targetFolder,
        createdBy: getCreatorId(req.user)
      });
      await clone.save();
    }

    if (global.io) global.io.emit('asset_update');
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Duplicate failed: ' + err.message });
  }
});

/**
 * PATCH: MOVE
 */
router.patch('/:id/move', async (req, res) => {
  try {
    const { type, destinationFolder } = req.body;
    const targetFolder = (destinationFolder === 'null' || !destinationFolder) ? null : destinationFolder;
    if (type === 'folder') await Folder.findByIdAndUpdate(req.params.id, { parentFolder: targetFolder });
    else await Asset.findByIdAndUpdate(req.params.id, { parentFolder: targetFolder });

    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Move failed: ' + err.message });
  }
});

/**
 * PATCH: RENAME / TRASH
 */
router.patch('/:id/trash', async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'folder') await Folder.findByIdAndUpdate(req.params.id, { isTrashed: true });
    else await Asset.findByIdAndUpdate(req.params.id, { isTrashed: true });
    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/rename', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (type === 'folder') await Folder.findByIdAndUpdate(req.params.id, { name });
    else await Asset.findByIdAndUpdate(req.params.id, { name });
    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
