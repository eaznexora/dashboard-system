const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');

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
    const parentFolder = req.query.folderId === 'null' || !req.query.folderId ? null : req.query.folderId;

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
 * POST: CREATE FOLDER
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const folder = new Folder({
      name,
      parentFolder: parentFolder === 'null' || !parentFolder ? null : parentFolder,
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
 * POST: UPLOAD FILE
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentFolder } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file received' });

    const fileName = file.filename; // Grab the exact name Multer generated
    const finalPath = path.join(UPLOAD_ROOT, fileName);
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('image/')) {
      // Process with Sharp
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
      // Direct Move
      fs.renameSync(file.path, finalPath);
    }

    // Cleanup Temp
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
 * PATCH: TRASH / RENAME
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
