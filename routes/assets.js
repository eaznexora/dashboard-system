const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');
const User = require('../models/User');

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_eaz_123';

// --- DIRECTORY GUARANTEE ---
const UPLOAD_ROOT = path.join(__dirname, '../uploads');
const TEMP_ROOT = path.join(UPLOAD_ROOT, 'temp');

try {
  if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  if (!fs.existsSync(TEMP_ROOT)) fs.mkdirSync(TEMP_ROOT, { recursive: true });
} catch (e) {
  console.error('[ASSETS_INIT_ERROR]:', e);
}

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

// --- MULTER CONFIG ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_ROOT),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

/**
 * GET: LIST ASSETS & FOLDERS
 */
router.get('/', async (req, res) => {
  try {
    const parentFolder = (req.query.folderId === 'null' || !req.query.folderId) ? null : req.query.folderId;

    const [folders, assets] = await Promise.all([
      Folder.find({ parentFolder, isTrashed: false }).sort({ name: 1 }),
      Asset.find({ parentFolder, isTrashed: false }).sort({ createdAt: -1 })
    ]);

    // Construct Breadcrumbs
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
    const [folders, assets] = await Promise.all([
      Folder.find({ isTrashed: true }).sort({ name: 1 }),
      Asset.find({ isTrashed: true }).sort({ updatedAt: -1 })
    ]);
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
      createdBy: String(req.user.id)
    });

    await folder.save();
    if (global.io) global.io.emit('asset_update');
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder: ' + err.message });
  }
});

/**
 * POST: UPLOAD FILE (Bulletproof Extension Handling)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentFolder } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file received' });

    const fileName = file.filename; 
    const finalPath = path.join(UPLOAD_ROOT, fileName);
    let thumbnailUrl = null;

    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);

    if (isImage) {
      await sharp(file.path)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .toFile(finalPath);

      const thumbName = 'thumb-' + fileName;
      const thumbPath = path.join(UPLOAD_ROOT, thumbName);
      await sharp(file.path)
        .resize(400, 400, { fit: 'cover' })
        .toFile(thumbPath);
      thumbnailUrl = `/uploads/${thumbName}`;
    } else {
      fs.renameSync(file.path, finalPath);
    }

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const asset = new Asset({
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${fileName}`,
      thumbnailUrl,
      parentFolder: (parentFolder === 'null' || !parentFolder) ? null : parentFolder,
      uploadedBy: String(req.user.id)
    });

    await asset.save();
    if (global.io) global.io.emit('asset_update');
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
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
        // Physically delete main file
        const mainPath = path.join(__dirname, '..', asset.url);
        if (fs.existsSync(mainPath)) fs.unlinkSync(mainPath);
        
        // Physically delete thumbnail
        if (asset.thumbnailUrl) {
          const thumbPath = path.join(__dirname, '..', asset.thumbnailUrl);
          if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        }
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
        createdBy: String(req.user.id)
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
        uploadedBy: String(req.user.id)
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
