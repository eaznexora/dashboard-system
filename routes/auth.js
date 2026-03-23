const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_eaz_123';

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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password provided.' });

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // httpOnly=false ensures offline Legacy JS files can extract JWT payload cleanly acting as local session storage manually
    res.cookie('eaz_token', token, { httpOnly: false, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }); 

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

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('eaz_token', token, { httpOnly: false, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ message: 'Google Auth Extracted Successfully', role: user.role });
  } catch (error) {
    console.error("[GOOGLE_OAUTH_ERROR]:", error);
    res.status(500).json({ message: 'Error processing Google Cloud Identity Token' });
  }
});

// 4. LOGOUT ROUTING
router.post('/logout', (req, res) => {
  res.clearCookie('eaz_token');
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
