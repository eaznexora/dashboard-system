const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_eaz_123';

// --- Helper: Set JWT cookie (works on both localhost and production HTTPS) ---
function setAuthCookie(res, token) {
  const isProd = process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.startsWith('https');
  res.cookie('eaz_token', token, {
    httpOnly: false,       // JS needs to read the payload for role checks
    secure: isProd,        // true on HTTPS production, false on localhost
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    sameSite: 'lax',       // 'lax' works for same-origin auth on all browsers
    path: '/'              // Ensure cookie is available on all paths
  });
}

// 1. STANDARD REGISTRATION PIPELINE
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: 'Email already registered.' });

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({ name, email, password: hashedPassword, role: 'EMPLOYEE' });

    res.status(201).json({ message: 'Account successfully generated.' });
  } catch (error) {
    console.error("[REGISTER_ERROR]:", error);
    res.status(500).json({ message: 'Internal Server Schema Error' });
  }
});

// 2. STANDARD LOGIN PIPELINE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: 'Invalid credentials or you must use Google to sign in.' });

    // Block deactivated employees
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account deactivated. Please contact your administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password provided.' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email, image: user.image }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.status(200).json({ message: 'Logged in successfully', role: user.role });
  } catch (error) {
    console.error("[LOGIN_ERROR]:", error);
    res.status(500).json({ message: 'Internal Server Auth Error' });
  }
});

// 3. GOOGLE OAUTH INTERCEPTION PIPELINE
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'No credential received from Google' });
    }

    // Log for debugging on VPS
    console.log('[GOOGLE_AUTH] Verifying token with CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 25) + '...' : 'MISSING!');

    // Explicitly verify the token signature sent from the Browser via Google Cloud instances
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 12);
      user = await User.create({ name, email, image: picture, password: dummyPassword, role: 'EMPLOYEE' });
    }

    // Block deactivated employees
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account deactivated. Please contact your administrator.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.status(200).json({ message: 'Google Auth Extracted Successfully', role: user.role });
  } catch (error) {
    console.error("[GOOGLE_OAUTH_ERROR]:", error.message || error);
    res.status(500).json({ message: 'Error processing Google Cloud Identity Token: ' + (error.message || 'Unknown error') });
  }
});

// 4. ADMIN LOGIN (credentials from .env.local)
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME;
    const adminHash = process.env.ADMIN_PASSWORD_HASH;

    console.log('[ADMIN_LOGIN] Checking credentials. ADMIN_USERNAME loaded:', !!adminUser, 'ADMIN_PASSWORD_HASH loaded:', !!adminHash, 'Hash length:', adminHash ? adminHash.length : 0);

    if (!adminUser || !adminHash) {
      return res.status(500).json({ message: 'Admin credentials not configured on server. Check .env.local file.' });
    }

    if (username !== adminUser) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, adminHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign({ id: 'admin', role: 'ADMIN', name: 'Eaz Nexora', email: 'admin@eaznexora.com' }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);

    res.status(200).json({ message: 'Admin authenticated', role: 'ADMIN' });
  } catch (error) {
    console.error("[ADMIN_LOGIN_ERROR]:", error);
    res.status(500).json({ message: 'Internal admin auth error' });
  }
});

// 5. GET CURRENT USER FROM DB (REAL-TIME SYNC)
router.get('/me', async (req, res) => {
  const token = req.cookies?.eaz_token;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle Hardcoded Admin Session (Bypass DB lookup)
    if (decoded.id === 'admin') {
      return res.json({ 
        id: 'admin', 
        name: decoded.name || 'Eaz Nexora', 
        email: decoded.email || 'admin@eaznexora.com', 
        role: 'ADMIN',
        image: null 
      });
    }

    // Fetch latest user info from DB to ensure profile image is always real-time
    const user = await User.findById(decoded.id).select('name email role image');
    if (!user) return res.status(404).json({ message: 'User deleted' });

    res.json({ id: user._id, name: user.name, email: user.email, role: user.role, image: user.image });
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// 6. LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('eaz_token', { path: '/' });
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;

