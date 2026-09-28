const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const date = req.query.date;
    let sql = `SELECT a.*, p.Name as PatientName, p.Phone as PatientPhone, p.CNIC,
               s.Date, s.StartTime, s.EndTime, s.SlotType
               FROM Appointments a
               JOIN Patients p ON a.PatientID = p.PatientID
               JOIN Slots s ON a.SlotID = s.SlotID`;
    if (date) {
      sql += ` WHERE s.Date = ? ORDER BY a.QueueToken`;
      return res.json(dbAll(sql, [date]));
    }
    sql += ' ORDER BY a.CreatedAt DESC LIMIT 200';
    res.json(dbAll(sql));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { PatientID, SlotID, Priority, Notes } = req.body;
    const slot = dbGet('SELECT * FROM Slots WHERE SlotID = ?', [SlotID]);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.Booked >= slot.Capacity) return res.status(400).json({ error: 'Slot is fully booked' });

    const count = dbGet('SELECT COUNT(*) as c FROM Appointments WHERE SlotID = ?', [SlotID]).c;
    const token = `${slot.Date.replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;

    const result = dbRun(
      'INSERT INTO Appointments (PatientID, SlotID, Priority, QueueToken, Notes, CreatedBy) VALUES (?, ?, ?, ?, ?, ?)',
      [PatientID, SlotID, Priority || 'Normal', token, Notes || null, req.session.user.UserID]
    );

    dbRun('UPDATE Slots SET Booked = Booked + 1 WHERE SlotID = ?', [SlotID]);
    if (slot.Booked + 1 >= slot.Capacity) {
      dbRun("UPDATE Slots SET Status = 'Full' WHERE SlotID = ?", [SlotID]);
    }
    res.json({ success: true, AppointmentID: result.lastInsertRowid, QueueToken: token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { Status, Priority, Notes } = req.body;
    dbRun('UPDATE Appointments SET Status=?, Priority=?, Notes=? WHERE AppointmentID=?', [Status, Priority, Notes, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireLogin, (req, res) => {
  try {
    const appt = dbGet('SELECT * FROM Appointments WHERE AppointmentID = ?', [req.params.id]);
    if (appt) {
      dbRun("UPDATE Appointments SET Status = 'Cancelled' WHERE AppointmentID = ?", [req.params.id]);
      dbRun('UPDATE Slots SET Booked = MAX(0, Booked - 1) WHERE SlotID = ?', [appt.SlotID]);
      dbRun("UPDATE Slots SET Status = 'Active' WHERE SlotID = ? AND Status = 'Full'", [appt.SlotID]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
