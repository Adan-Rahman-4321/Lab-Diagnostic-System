const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const queue = dbAll(`
      SELECT a.AppointmentID, a.QueueToken, a.Priority, a.Status, a.Notes,
             p.Name as PatientName, p.Phone as PatientPhone, p.PatientID,
             s.StartTime, s.EndTime, s.SlotType
      FROM Appointments a
      JOIN Patients p ON a.PatientID = p.PatientID
      JOIN Slots s ON a.SlotID = s.SlotID
      WHERE s.Date = ? AND a.Status != 'Cancelled'
      ORDER BY
        CASE a.Priority WHEN 'Emergency' THEN 0 WHEN 'High' THEN 1 ELSE 2 END,
        a.QueueToken ASC
    `, [date]);

    let waitMinutes = 0;
    const enriched = queue.map((item, idx) => {
      if (item.Status === 'Completed' || item.Status === 'In-Progress') {
        item.EstimatedWait = item.Status === 'In-Progress' ? 'Now Serving' : 'Done';
      } else {
        item.EstimatedWait = waitMinutes === 0 ? 'Next' : `~${waitMinutes} min`;
        waitMinutes += 8;
      }
      item.Position = idx + 1;
      return item;
    });
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', requireLogin, (req, res) => {
  try {
    dbRun('UPDATE Appointments SET Status = ? WHERE AppointmentID = ?', [req.body.Status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', requireLogin, (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const stats = dbGet(`
      SELECT COUNT(*) as Total,
        SUM(CASE WHEN a.Status = 'Scheduled' THEN 1 ELSE 0 END) as Waiting,
        SUM(CASE WHEN a.Status = 'In-Progress' THEN 1 ELSE 0 END) as InProgress,
        SUM(CASE WHEN a.Status = 'Completed' THEN 1 ELSE 0 END) as Completed,
        SUM(CASE WHEN a.Priority = 'Emergency' THEN 1 ELSE 0 END) as Emergency
      FROM Appointments a JOIN Slots s ON a.SlotID = s.SlotID
      WHERE s.Date = ? AND a.Status != 'Cancelled'
    `, [date]);
    res.json(stats || { Total: 0, Waiting: 0, InProgress: 0, Completed: 0, Emergency: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
