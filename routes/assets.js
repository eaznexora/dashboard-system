const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const Folder = require('../models/Folder');
const Asset = require('../models/Asset');

module.exports = (io) => {
  const router = express.Router();

  // Configure Multer for processing
  const upload = multer({ dest: 'uploads/temp/' });

  // 1. GET FILESYSTEM CONTENT
  router.get('/', async (req, res) => {
    try {
      const { folderId, trashed } = req.query;
      const query = { 
        isTrashed: trashed === 'true',
        folderId: folderId || null 
      };
      
      const folders = await Folder.find({ ...query, parentId: folderId || null }).sort({ name: 1 });
      const assets = await Asset.find(query).sort({ createdAt: -1 });
      
      res.json({ folders, assets });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. CREATE FOLDER
  router.post('/folders', async (req, res) => {
    try {
      const { name, parentId } = req.body;
      const folder = new Folder({
        name,
        parentId: parentId || null,
        createdBy: req.user._id
      });
      await folder.save();
      
      io.emit('asset_update'); // Live refresh
      res.status(201).json(folder);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. UPLOAD ASSET + COMPRESSION
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { folderId } = req.body;
      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();
      const savedFilename = `${Date.now()}-${req.file.filename}${ext}`;
      const finalPath = path.join('uploads', savedFilename);

      const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      if (isImage) {
        // High-performance compression
        await sharp(req.file.path)
          .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
          .toFormat('webp', { quality: 80 })
          .toFile(finalPath.replace(ext, '.webp'));
        
        // Update filename to .webp
        var finalFilename = savedFilename.replace(ext, '.webp');
        var finalMime = 'image/webp';
      } else {
        // Non-image files: Just move
        fs.renameSync(req.file.path, finalPath);
        var finalFilename = savedFilename;
        var finalMime = req.file.mimetype;
      }

      // Cleanup temp file if still exists
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      const asset = new Asset({
        originalName,
        savedFilename: finalFilename,
        mimeType: finalMime,
        size: fs.statSync(path.join('uploads', finalFilename)).size,
        folderId: folderId || null,
        filePath: finalPath,
        createdBy: req.user._id
      });

      await asset.save();
      io.emit('asset_update');
      res.status(201).json(asset);
    } catch (err) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. RENAME ITEM
  router.patch('/:id/rename', async (req, res) => {
    try {
      const { name, type } = req.body; // type: 'folder' or 'asset'
      if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, { name });
      } else {
        await Asset.findByIdAndUpdate(req.params.id, { originalName: name });
      }
      io.emit('asset_update');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. SOFT DELETE (TRASH)
  router.patch('/:id/trash', async (req, res) => {
    try {
      const { type } = req.body;
      const update = { isTrashed: true, deletedAt: new Date() };
      if (type === 'folder') {
        await Folder.findByIdAndUpdate(req.params.id, update);
        // Recursively trash sub-items? For simplicity, we just trash the folder.
      } else {
        await Asset.findByIdAndUpdate(req.params.id, update);
      }
      io.emit('asset_update');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. PERMANENT DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const { type } = req.query;
      if (type === 'folder') {
        await Folder.findByIdAndDelete(req.params.id);
      } else {
        const asset = await Asset.findById(req.params.id);
        if (asset && fs.existsSync(asset.filePath)) {
          fs.unlinkSync(asset.filePath);
        }
        await Asset.findByIdAndDelete(req.params.id);
      }
      io.emit('asset_update');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. DOWNLOAD
  const archiver = require('archiver');
  
  router.get('/download/:id', async (req, res) => {
    try {
      const asset = await Asset.findById(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      
      const filePath = path.join(__dirname, '..', asset.filePath);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Physical file missing' });

      res.download(filePath, asset.originalName);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/download-folder/:folderId', async (req, res) => {
    try {
      const folder = await Folder.findById(req.params.folderId);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });

      const assets = await Asset.find({ folderId: folder._id, isTrashed: false });
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      res.attachment(`${folder.name}.zip`);
      archive.pipe(res);

      assets.forEach(asset => {
        const filePath = path.join(__dirname, '..', asset.filePath);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: asset.originalName });
        }
      });

      await archive.finalize();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
