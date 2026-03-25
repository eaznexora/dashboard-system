const express = require('express');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

// Load environment variables directly from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const server = http.createServer(app); // Wrap express app
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Parser Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// Auth Guard Middleware
const authGuard = require('./middleware/authGuard');

// CSS and static assets should be public
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/uploads', express.static('uploads')); // Physical file storage access

app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://accounts.google.com");
    next();
});

// Protect all HTML and API routes
app.use(authGuard);

// Serve static HTML files
app.use(express.static(__dirname));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
const { checkOverdueInvoices } = require('./utils/automation');

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
}).then(() => {
    console.log("⚡ SUCCESS: Express/Socket.io Connected Cleanly to MongoDB Atlas! ⚡");
    setInterval(checkOverdueInvoices, 60 * 60 * 1000);
    checkOverdueInvoices();
}).catch(err => {
    console.error("\n❌ FAILED TO REACH MONGODB! ❌", err.message);
});

// API Routes
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/projects');
const clientRoutes = require('./routes/clients');
const activityRoutes = require('./routes/activity');
const issueRoutes = require('./routes/issues');
const reportRoutes = require('./routes/reports');
const invoiceRoutes = require('./routes/invoices');
const contractRoutes = require('./routes/contracts');
const proposalRoutes = require('./routes/proposals');
const assetRoutes = require('./routes/assets')(io); // Inject Socket.io into Assets logic

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/assets', assetRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EazDash Backend API is live with WebSockets.' });
});

// Public Config (for Client IDs)
app.get('/api/config', (req, res) => {
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID });
});

// Boot Server using 'server.listen' instead of 'app.listen'
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 EazDash Node Server + Socket.io Live: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
