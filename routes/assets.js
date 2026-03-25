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
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// --- AUTH PROTECT MIDDLEWARE ---
const protect = (req, res, next) => {
    const token = req.cookies?.eaz_token;
    if (!token) return res.status(401).json({ error: 'Session expired. Please login again.' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('[ASSETS_AUTH_ERROR]:', err.message);
        res.status(401).json({ error: 'Invalid authentication' });
    }
};

router.use(protect);

// --- MULTER SETUP ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

/**
 * GET - List Folders and Assets
 */
router.get('/', async (req, res) => {
  try {
    const parentFolder = req.query.folderId === 'null' || !req.query.folderId ? null : req.query.folderId;
    
    const [folders, assets] = await Promise.all([
      Folder.find({ parentFolder, isTrashed: false }).sort({ name: 1 }),
      Asset.find({ parentFolder, isTrashed: false }).sort({ createdAt: -1 })
    ]);

    // Construct breadcrumbs
    let breadcrumbs = [];
    if (parentFolder) {
        let current = await Folder.findById(parentFolder);
        while (current) {
            breadcrumbs.unshift({ id: current._id, name: current.name });
            if (current.parentFolder) {
                current = await Folder.findById(current.parentFolder);
            } else {
                current = null;
            }
        }
    }
    
    res.json({ folders, assets, breadcrumbs });
  } catch (err) {
    console.error('[ASSETS_GET_ERROR]:', err);
    res.status(500).json({ error: 'Failed to fetch contents: ' + err.message });
  }
});

/**
 * POST - Create Folder
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });

    const folder = new Folder({ 
      name, 
      parentFolder: parentFolder === 'null' || !parentFolder ? null : parentFolder,
      createdBy: req.user.id 
    });
    
    await folder.save();
    if (global.io) global.io.emit('asset_update');
    res.status(201).json(folder);
  } catch (err) {
    console.error('[ASSETS_CREATE_FOLDER_ERROR]:', err);
    res.status(500).json({ error: 'Creation failed: ' + err.message });
  }
});

/**
 * POST - Upload File
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentFolder } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file received' });

    const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    const finalPath = path.join(UPLOAD_DIR, fileName);
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('image/')) {
      // Optimize Main Image
      await sharp(file.path)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .toFile(finalPath);
      
      // Create Square Thumbnail
      const thumbName = 'thumb-' + fileName;
      const thumbPath = path.join(UPLOAD_DIR, thumbName);
      await sharp(file.path)
        .resize(400, 400, { fit: 'cover' })
        .toFile(thumbPath);
      thumbnailUrl = `/uploads/${thumbName}`;
    } else {
      // Direct Move for non-images
      fs.renameSync(file.path, finalPath);
    }

    // Always clean up temp
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const asset = new Asset({
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${fileName}`,
      thumbnailUrl,
      parentFolder: parentFolder === 'null' || !parentFolder ? null : parentFolder,
      uploadedBy: req.user.id
    });

    await asset.save();
    if (global.io) global.io.emit('asset_update');
    res.status(201).json(asset);
  } catch (err) {
    console.error('[ASSETS_UPLOAD_ERROR]:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

/**
 * PATCH - Move to Trash
 */
router.patch('/:id/trash', async (req, res) => {
  try {
    const { type } = req.query;
    if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, { isTrashed: true });
    } else {
        await Asset.findByIdAndUpdate(req.params.id, { isTrashed: true });
    }
    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH - Rename
 */
router.patch('/:id/rename', async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name cannot be empty' });

    if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, { name });
    } else {
        await Asset.findByIdAndUpdate(req.params.id, { name });
    }
    if (global.io) global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
