// CRITICAL: Force Google Public DNS BEFORE any network calls
// This bypasses ISP DNS blocks that refuse MongoDB SRV queries
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables directly from .env.local (using absolute path for VPS reliability)
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 3000;

// Parser Middleware (MUST come before routes and authGuard)
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
}).then(async () => {
    console.log("######################################################");
    console.log("⚡ SUCCESS: Express Connected Cleanly to MongoDB Atlas! ⚡");
    console.log("######################################################");
    
    // AUTO-SEED: Ensure dashboard data exists on first VPS boot
    const DashboardMetrics = require('./models/DashboardMetrics');
    const count = await DashboardMetrics.countDocuments();
    if (count === 0) {
        console.log("📦 SEEDING: Initializing dashboard metrics...");
        // Trigger the seed logic (reuse from routes/dashboard or simple bulk insert)
        const dashboardModule = require('./routes/dashboard');
        const { defaultMetrics } = dashboardModule; 
        for (const [category, metrics] of Object.entries(defaultMetrics || {})) {
            await DashboardMetrics.findOneAndUpdate({ category }, { metrics }, { upsert: true });
        }
        console.log("✅ SEEDED: Dashboard ready.");
    }
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
const dashboardModule = require('./routes/dashboard');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardModule.router);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EazDash Backend API is live.' });
});

// Boot Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 EazDash Node Server Live: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
