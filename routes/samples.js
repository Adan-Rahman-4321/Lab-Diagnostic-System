const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const status = req.query.status;
    let sql = `SELECT s.*, p.Name as PatientName, u.Name as TechnicianName, a.QueueToken
               FROM Samples s
               JOIN Patients p ON s.PatientID = p.PatientID
               LEFT JOIN Users u ON s.TechnicianID = u.UserID
               LEFT JOIN Appointments a ON s.AppointmentID = a.AppointmentID`;
    if (status) {
      sql += ` WHERE s.Status = ? ORDER BY s.CollectedAt DESC`;
      return res.json(dbAll(sql, [status]));
    }
    sql += ' ORDER BY s.CollectedAt DESC LIMIT 200';
    res.json(dbAll(sql));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/tests', requireLogin, (req, res) => {
  try { res.json(dbAll('SELECT * FROM Tests WHERE IsActive = 1 ORDER BY Category, TestName')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { AppointmentID, PatientID, SampleType, TestIDs, Notes } = req.body;
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const count = dbGet("SELECT COUNT(*) as c FROM Samples WHERE Barcode LIKE ?", [`LAB-${today}%`]).c;
    const barcode = `LAB-${today}-${String(count + 1).padStart(4, '0')}`;
    const techId = req.session.user.Role === 'Technician' ? req.session.user.UserID : null;

    const result = dbRun(
      'INSERT INTO Samples (AppointmentID, PatientID, TechnicianID, SampleType, Barcode, Notes) VALUES (?, ?, ?, ?, ?, ?)',
      [AppointmentID || null, PatientID, techId, SampleType, barcode, Notes || null]
    );

    if (TestIDs && TestIDs.length > 0) {
      TestIDs.forEach(tid => {
        dbRun('INSERT INTO SampleTests (SampleID, TestID) VALUES (?, ?)', [result.lastInsertRowid, tid]);
        dbRun('INSERT INTO Results (SampleID, TestID, EnteredBy) VALUES (?, ?, ?)', [result.lastInsertRowid, tid, techId]);
      });
    }
    res.json({ success: true, SampleID: result.lastInsertRowid, Barcode: barcode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { Status, TechnicianID } = req.body;
    if (Status === 'Processing' && TechnicianID) {
      dbRun('UPDATE Samples SET Status=?, TechnicianID=?, ProcessedAt=CURRENT_TIMESTAMP WHERE SampleID=?', [Status, TechnicianID, req.params.id]);
    } else {
      dbRun('UPDATE Samples SET Status=? WHERE SampleID=?', [Status, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/results', requireLogin, (req, res) => {
  try {
    res.json(dbAll(`SELECT r.*, t.TestName, t.Category, t.ReferenceRange, t.Unit
      FROM Results r JOIN Tests t ON r.TestID = t.TestID WHERE r.SampleID = ?`, [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:sampleId/results/:resultId', requireLogin, (req, res) => {
  try {
    const { ResultValue, Remarks, IsAbnormal } = req.body;
    dbRun("UPDATE Results SET ResultValue=?, Remarks=?, IsAbnormal=?, Status='Entered', EnteredBy=?, EnteredAt=CURRENT_TIMESTAMP WHERE ResultID=?",
      [ResultValue, Remarks || null, IsAbnormal ? 1 : 0, req.session.user.UserID, req.params.resultId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
