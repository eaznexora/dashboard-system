const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_eaz_123';

// Pages that do NOT require authentication
const PUBLIC_PAGES = ['/login.html', '/register.html', '/admin-login.html'];

// Admin-only analytics dashboards
const ADMIN_PAGES = [
  '/admin-panel.html', '/admin-login.html',
  '/marketing.html', '/financial.html', '/operations.html',
  '/support.html', '/sales.html', '/executive.html'
];

// Employee-accessible pages
const EMPLOYEE_PAGES = ['/employee.html'];

function authGuard(req, res, next) {
  const path = req.path;
  
  // Allow API routes, static assets, and public pages
  if (path.startsWith('/api/') || 
      path.startsWith('/css/') || 
      path.startsWith('/js/') || 
      path.startsWith('/images/') ||
      path.startsWith('/assets/') ||
      path.endsWith('.ico') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.svg') ||
      PUBLIC_PAGES.includes(path)) {
    return next();
  }

  // Check for JWT token in cookie
  const token = req.cookies?.eaz_token;

  if (!token) {
    return res.redirect('/login.html');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // ADMIN gets access to everything
    if (decoded.role === 'ADMIN') {
      req.user = decoded;
      return next();
    }

    // EMPLOYEE can only access employee pages and index
    if (decoded.role === 'EMPLOYEE') {
      if (ADMIN_PAGES.includes(path) && path !== '/admin-login.html') {
        return res.redirect('/employee.html');
      }
      req.user = decoded;
      return next();
    }

    // Unknown role
    res.clearCookie('eaz_token');
    return res.redirect('/login.html');
  } catch (err) {
    res.clearCookie('eaz_token');
    return res.redirect('/login.html');
  }
}

module.exports = authGuard;
