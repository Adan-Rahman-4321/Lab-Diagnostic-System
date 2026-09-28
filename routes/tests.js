const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin, requireRole } = require('../middleware/auth');

// GET all tests
router.get('/', requireLogin, (req, res) => {
  try {
    const tests = dbAll('SELECT * FROM Tests ORDER BY Category, TestName');
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new test
router.post('/', requireLogin, (req, res) => {
  try {
    const { TestName, Category, Price, TurnaroundHours, ReferenceRange, Unit } = req.body;
    const result = dbRun(
      'INSERT INTO Tests (TestName, Category, Price, TurnaroundHours, ReferenceRange, Unit, IsActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [TestName, Category, Price || 0, TurnaroundHours || 24, ReferenceRange || null, Unit || null]
    );
    res.json({ success: true, TestID: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update test
router.put('/:id', requireLogin, (req, res) => {
  try {
    const { TestName, Category, Price, TurnaroundHours, ReferenceRange, Unit, IsActive } = req.body;
    dbRun(
      'UPDATE Tests SET TestName=?, Category=?, Price=?, TurnaroundHours=?, ReferenceRange=?, Unit=?, IsActive=? WHERE TestID=?',
      [TestName, Category, Price, TurnaroundHours, ReferenceRange, Unit, IsActive ? 1 : 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE test
router.delete('/:id', requireLogin, (req, res) => {
  try {
    dbRun('DELETE FROM Tests WHERE TestID = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
