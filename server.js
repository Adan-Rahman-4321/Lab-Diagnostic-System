const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Wait for database setup before serving requests.
const databaseReady = initDatabase();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    await databaseReady;
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'smart-lab-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/samples', require('./routes/samples'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/tests', require('./routes/tests'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🔬 Smart Diagnostic Lab System running at http://localhost:${PORT}`);
    console.log(`\n📋 Default Login Credentials:`);
    console.log(`   Admin:        admin@lab.com / admin123`);
    console.log(`   Receptionist: receptionist@lab.com / rec123`);
    console.log(`   Technician:   tech@lab.com / tech123`);
    console.log(`   Doctor:       doctor@lab.com / doc123`);
    console.log(`   Patient:      patient@lab.com / pat123\n`);
  });
}

module.exports = app;
