const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');

// Ensure upload directories exist
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/**
 * GET - List Folders and Assets in a specific directory
 */
router.get('/', async (req, res) => {
  try {
    const parentFolder = req.query.folderId === 'null' ? null : (req.query.folderId || null);
    
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST - Create a new Folder
 */
router.post('/folders', async (req, res) => {
  try {
    const { name, parentFolder } = req.body;
    const folder = new Folder({ 
      name, 
      parentFolder: parentFolder === 'null' ? null : (parentFolder || null),
      createdBy: req.user.id 
    });
    await folder.save();
    global.io.emit('asset_update');
    res.status(201).json(folder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST - Upload an Asset (File/Image)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentFolder } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    const finalPath = path.join(UPLOAD_DIR, fileName);
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('image/')) {
      // Compress and Save Main Image
      await sharp(file.path)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .toFile(finalPath);
      
      // Generate Sharp Thumbnail
      const thumbName = 'thumb-' + fileName;
      const thumbPath = path.join(UPLOAD_DIR, thumbName);
      await sharp(file.path)
        .resize(400, 400, { fit: 'cover' })
        .toFile(thumbPath);
      thumbnailUrl = `/uploads/${thumbName}`;
    } else {
      // Move other files directly
      fs.renameSync(file.path, finalPath);
    }

    // Clean up temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const asset = new Asset({
      name: file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${fileName}`,
      thumbnailUrl,
      parentFolder: parentFolder === 'null' ? null : (parentFolder || null),
      uploadedBy: req.user.id
    });

    await asset.save();
    global.io.emit('asset_update');
    res.status(201).json(asset);
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'File processing failed' });
  }
});

/**
 * PATCH - Move to Trash
 */
router.patch('/:id/trash', async (req, res) => {
  try {
    const { type } = req.query; // 'folder' or 'asset'
    if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, { isTrashed: true });
    } else {
        await Asset.findByIdAndUpdate(req.params.id, { isTrashed: true });
    }
    global.io.emit('asset_update');
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
    if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, { name });
    } else {
        await Asset.findByIdAndUpdate(req.params.id, { name });
    }
    global.io.emit('asset_update');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
