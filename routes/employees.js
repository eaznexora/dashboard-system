const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TimeLog = require('../models/TimeLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER STORAGE FOR AVATARS (No DB Asset sync) ---
const UPLOAD_ROOT = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit for avatars

// GET all employees (admin only)
router.get('/', async (req, res) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' }).select('-password').sort({ name: 1 });
    
    // Check who is currently clocked in
    const activeTimeLogs = await TimeLog.find({ clockOut: null });
    const activeIds = activeTimeLogs.map(t => t.userId.toString());

    const result = employees.map(emp => ({
      ...emp.toObject(),
      isCurrentlyWorking: activeIds.includes(emp._id.toString())
    }));

    res.json(result);
  } catch (err) {
    console.error('[EMPLOYEES_LIST_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// UPDATE employee (admin only - designation, department, isActive/fire, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Handle 'Firing' logic: clock out if currently active
    if (isActive === false && employee.isActive !== false) {
      const activeLog = await TimeLog.findOne({ userId: employee._id, clockOut: null });
      if (activeLog) {
        activeLog.clockOut = new Date();
        activeLog.totalHours = parseFloat(((activeLog.clockOut - activeLog.clockIn) / (1000 * 60 * 60)).toFixed(2));
        await activeLog.save();
        console.log(`[FIRE_AUTO_CLOCKOUT]: Employee ${employee.name} clocked out.`);
      }
    }

    Object.assign(employee, req.body);
    await employee.save();
    
    res.json(employee);
  } catch (err) {
    console.error('[EMPLOYEE_UPDATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update employee' });
  }
});

// CLOCK IN
router.post('/clock-in', async (req, res) => {
  try {
    const userId = req.body.userId;
    const existing = await TimeLog.findOne({ userId, clockOut: null });
    if (existing) return res.status(400).json({ message: 'Already clocked in.' });

    const now = new Date();
    const log = await TimeLog.create({ userId, clockIn: now, lastPingTime: now });
    res.status(201).json({ message: 'Clocked in successfully', log });
  } catch (err) {
    res.status(500).json({ message: 'Clock-in failed' });
  }
});

// CLOCK OUT
router.post('/clock-out', async (req, res) => {
  try {
    const userId = req.body.userId;
    const log = await TimeLog.findOne({ userId, clockOut: null });
    if (!log) return res.status(400).json({ message: 'No active clock-in found.' });

    const now = new Date();

    // Auto-close any open break
    if (log.status === 'on_break' && log.breaks.length > 0) {
      const lastBreak = log.breaks[log.breaks.length - 1];
      if (!lastBreak.pauseEnd) {
        lastBreak.pauseEnd = now;
      }
    }

    log.clockOut = now;
    log.status = 'completed';

    // Calculate total break duration in ms
    const totalBreakMs = log.breaks.reduce((sum, b) => {
      const start = new Date(b.pauseStart).getTime();
      const end = b.pauseEnd ? new Date(b.pauseEnd).getTime() : now.getTime();
      return sum + (end - start);
    }, 0);

    const grossMs = log.clockOut - log.clockIn;
    const netMs = grossMs - totalBreakMs;
    log.totalHours = parseFloat((netMs / (1000 * 60 * 60)).toFixed(2));
    await log.save();

    res.json({ message: 'Clocked out successfully', totalHours: log.totalHours });
  } catch (err) {
    res.status(500).json({ message: 'Clock-out failed' });
  }
});

// PAUSE (Take Break)
router.post('/pause', async (req, res) => {
  try {
    const userId = req.body.userId;
    const log = await TimeLog.findOne({ userId, clockOut: null, status: 'working' });
    if (!log) return res.status(400).json({ message: 'No active working session found.' });

    log.status = 'on_break';
    log.breaks.push({ pauseStart: new Date() });
    await log.save();

    res.json({ message: 'Break started', log });
  } catch (err) {
    res.status(500).json({ message: 'Pause failed' });
  }
});

// RESUME (End Break)
router.post('/resume', async (req, res) => {
  try {
    const userId = req.body.userId;
    const log = await TimeLog.findOne({ userId, clockOut: null, status: 'on_break' });
    if (!log) return res.status(400).json({ message: 'No active break found.' });

    const lastBreak = log.breaks[log.breaks.length - 1];
    if (lastBreak && !lastBreak.pauseEnd) {
      lastBreak.pauseEnd = new Date();
    }

    log.status = 'working';
    log.lastPingTime = new Date();
    await log.save();

    res.json({ message: 'Break ended, back to work', log });
  } catch (err) {
    res.status(500).json({ message: 'Resume failed' });
  }
});

// HEARTBEAT PING — Frontend sends every 30s to prove browser is alive
router.post('/ping', async (req, res) => {
  try {
    const userId = req.body.userId;
    const activeLog = await TimeLog.findOne({ userId, clockOut: null });
    if (!activeLog) return res.status(400).json({ message: 'No active session.' });

    activeLog.lastPingTime = new Date();
    await activeLog.save();
    res.json({ message: 'Ping received' });
  } catch (err) {
    res.status(500).json({ message: 'Ping failed' });
  }
});

// GET current status
router.get('/status/:userId', async (req, res) => {
  try {
    const activeLog = await TimeLog.findOne({ userId: req.params.userId, clockOut: null });
    res.json({ 
      isClockedIn: !!activeLog, 
      status: activeLog ? activeLog.status : null,
      log: activeLog 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to check status' });
  }
});

// GET history and today's hours
router.get('/history/:userId', async (req, res) => {
  try {
    const logs = await TimeLog.find({ userId: req.params.userId }).sort({ clockIn: -1 }).limit(30);
    
    // Calculate today's hours (including active sessions)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await TimeLog.find({ 
      userId: req.params.userId, 
      clockIn: { $gte: today } 
    });
    const now = new Date();
    const todayHours = todayLogs.reduce((sum, l) => {
      if (l.clockOut) {
        // Completed session — use stored totalHours
        return sum + (l.totalHours || 0);
      } else {
        // Active session — calculate live net hours (subtract breaks)
        const breakMs = (l.breaks || []).reduce((bSum, b) => {
          const start = new Date(b.pauseStart).getTime();
          const end = b.pauseEnd ? new Date(b.pauseEnd).getTime() : now.getTime();
          return bSum + (end - start);
        }, 0);
        const netMs = (now - new Date(l.clockIn)) - breakMs;
        return sum + (netMs / (1000 * 60 * 60));
      }
    }, 0);
    
    const totalHours = logs.reduce((sum, l) => sum + (l.totalHours || 0), 0);
    res.json({ 
      logs, 
      totalHours: parseFloat(totalHours.toFixed(2)),
      todayHours: parseFloat(todayHours.toFixed(2)) 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// DELETE an employee permanently
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'Employee permanently removed' });
    } catch (err) {
        res.status(500).json({ message: 'Deletion failed' });
    }
});

// GET: Fetch Single Profile (Excludes password)
router.get('/profile/:id', async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    console.error('[PROFILE_FETCH_ERROR]:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PATCH: Employee Self-Service (Whitelisted Profile Update)
router.patch('/:id/self-update', async (req, res) => {
  try {
    const { 
      image, phone, age, birthDate, address, 
      about, socialLinks, projectLinks 
    } = req.body;

    const employee = await User.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // STRICT WHITELIST UPDATE - Manual mapping avoids Object.assign() risks
    if (image !== undefined) employee.image = image;
    if (phone !== undefined) employee.phone = phone;
    if (age !== undefined) employee.age = age;
    if (birthDate !== undefined) employee.birthDate = birthDate;
    if (address !== undefined) employee.address = address;
    if (about !== undefined) employee.about = about;
    if (socialLinks !== undefined) employee.socialLinks = socialLinks;
    if (projectLinks !== undefined) employee.projectLinks = projectLinks;

    await employee.save();
    res.json({ message: 'Profile updated successfully', employee });
  } catch (err) {
    console.error('[SELF_UPDATE_ERROR]:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// POST: Upload Avatar (Bypasses Asset Hub)
router.post('/upload-avatar', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

module.exports = router;

