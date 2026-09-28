const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const search = req.query.search || '';
    let patients;
    if (search) {
      patients = dbAll('SELECT * FROM Patients WHERE Name LIKE ? OR CNIC LIKE ? OR Phone LIKE ? ORDER BY PatientID DESC', [`%${search}%`, `%${search}%`, `%${search}%`]);
    } else {
      patients = dbAll('SELECT * FROM Patients ORDER BY PatientID DESC');
    }
    res.json(patients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireLogin, (req, res) => {
  try {
    const patient = dbGet('SELECT * FROM Patients WHERE PatientID = ?', [req.params.id]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { Name, Age, Gender, CNIC, Phone, Email, Address, BloodGroup } = req.body;
    const result = dbRun(
      'INSERT INTO Patients (Name, Age, Gender, CNIC, Phone, Email, Address, BloodGroup, CreatedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [Name, Age, Gender, CNIC || null, Phone, Email || null, Address || null, BloodGroup || null, req.session.user.UserID]
    );
    res.json({ success: true, PatientID: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'A patient with this CNIC already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { Name, Age, Gender, CNIC, Phone, Email, Address, BloodGroup } = req.body;
    dbRun('UPDATE Patients SET Name=?, Age=?, Gender=?, CNIC=?, Phone=?, Email=?, Address=?, BloodGroup=? WHERE PatientID=?',
      [Name, Age, Gender, CNIC || null, Phone, Email || null, Address || null, BloodGroup || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireLogin, (req, res) => {
  try { dbRun('DELETE FROM Patients WHERE PatientID = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/history', requireLogin, (req, res) => {
  try {
    const appointments = dbAll('SELECT a.*, s.Date, s.StartTime, s.EndTime FROM Appointments a JOIN Slots s ON a.SlotID = s.SlotID WHERE a.PatientID = ? ORDER BY a.CreatedAt DESC', [req.params.id]);
    const bills = dbAll('SELECT * FROM Bills WHERE PatientID = ? ORDER BY CreatedAt DESC', [req.params.id]);
    const samples = dbAll('SELECT * FROM Samples WHERE PatientID = ? ORDER BY CollectedAt DESC', [req.params.id]);
    res.json({ appointments, bills, samples });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
