const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const date = req.query.date;
    if (date) {
      res.json(dbAll('SELECT * FROM Slots WHERE Date = ? ORDER BY StartTime', [date]));
    } else {
      res.json(dbAll("SELECT * FROM Slots WHERE Date >= date('now') ORDER BY Date, StartTime"));
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { Date: slotDate, StartTime, EndTime, Capacity, SlotType } = req.body;
    const result = dbRun('INSERT INTO Slots (Date, StartTime, EndTime, Capacity, SlotType) VALUES (?, ?, ?, ?, ?)',
      [slotDate, StartTime, EndTime, Capacity || 10, SlotType || 'Regular']);
    res.json({ success: true, SlotID: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { Date: slotDate, StartTime, EndTime, Capacity, Status, SlotType } = req.body;
    dbRun('UPDATE Slots SET Date=?, StartTime=?, EndTime=?, Capacity=?, Status=?, SlotType=? WHERE SlotID=?',
      [slotDate, StartTime, EndTime, Capacity, Status, SlotType, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireLogin, (req, res) => {
  try { dbRun('DELETE FROM Slots WHERE SlotID = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
