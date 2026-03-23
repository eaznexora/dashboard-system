// CRITICAL: Force Google Public DNS BEFORE any network calls
// This bypasses ISP DNS blocks that refuse MongoDB SRV queries
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables directly from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Parser Middleware (MUST come before routes and authGuard)
app.set('trust proxy', 1); // Trust Nginx reverse proxy for HTTPS detection
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Auth Guard Middleware — protects all HTML pages behind JWT
const authGuard = require('./middleware/authGuard');

// --- CRITICAL SECURITY HEADERS FOR GOOGLE OAUTH IN PRODUCTION ---
// Google Identity Services (GSI) popup requires these specific headers 
// when the site is running on a live HTTPS domain, otherwise the popup 
// cannot pass the credential back to the parent window (Error 400).
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    
    // Allow Google accounts specific framing
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://accounts.google.com");
    next();
});

app.use(authGuard);

// Serve static HTML/CSS/JS files (after auth guard so pages are protected)
app.use(express.static(__dirname));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log("######################################################");
    console.log("⚡ SUCCESS: Express Connected Cleanly to MongoDB Atlas! ⚡");
    console.log("######################################################");
}).catch(err => {
    console.error("\n❌ FAILED TO REACH MONGODB! ❌");
    console.error("1. Did you add 0.0.0.0/0 to the Atlas Network Access Whitelist?");
    console.error("2. Are you using the direct mongodb:// string without +srv?");
    console.error("RAW ERROR INFO:", err.message);
});

// API Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EazDash Backend API is live.' });
});

// Boot Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 EazDash Node Server Live: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
    // Debug: Show loaded environment variables (masked)
    console.log('ENV CHECK:');
    console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ SET (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : '❌ MISSING');
    console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ SET' : '❌ MISSING');
    console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ MISSING');
    console.log('  ADMIN_USERNAME:', process.env.ADMIN_USERNAME || '❌ MISSING');
    console.log('  ADMIN_PASSWORD_HASH:', process.env.ADMIN_PASSWORD_HASH ? '✅ SET (' + process.env.ADMIN_PASSWORD_HASH.length + ' chars)' : '❌ MISSING');
});
