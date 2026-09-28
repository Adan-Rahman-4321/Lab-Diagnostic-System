const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun } = require('../database');

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = dbGet('SELECT * FROM Users WHERE Email = ? AND IsActive = 1', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!bcrypt.compareSync(password, user.PasswordHash)) return res.status(401).json({ error: 'Invalid email or password' });
    req.session.user = { UserID: user.UserID, Name: user.Name, Email: user.Email, Role: user.Role };
    res.json({ success: true, user: req.session.user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

router.get('/me', (req, res) => {
  if (req.session && req.session.user) res.json({ user: req.session.user });
  else res.status(401).json({ error: 'Not logged in' });
});

router.get('/users', (req, res) => {
  try { res.json(dbAll('SELECT UserID, Name, Email, Role, IsActive, CreatedAt FROM Users ORDER BY UserID')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const result = dbRun('INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
    res.json({ success: true, UserID: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
