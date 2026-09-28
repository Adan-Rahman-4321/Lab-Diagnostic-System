const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalPatients = dbGet('SELECT COUNT(*) as c FROM Patients').c;
    const todayAppointments = dbGet('SELECT COUNT(*) as c FROM Appointments a JOIN Slots s ON a.SlotID = s.SlotID WHERE s.Date = ?', [today]).c;
    const pendingSamples = dbGet("SELECT COUNT(*) as c FROM Samples WHERE Status IN ('Collected','Processing')").c;
    const todayRevenue = dbGet("SELECT COALESCE(SUM(PaidAmount),0) as c FROM Bills WHERE date(CreatedAt) = ?", [today]).c;
    const totalTests = dbGet('SELECT COUNT(*) as c FROM Tests WHERE IsActive = 1').c;
    const pendingReports = dbGet("SELECT COUNT(*) as c FROM Samples WHERE Status = 'Analyzed'").c;
    const lowStockItems = dbGet('SELECT COUNT(*) as c FROM Inventory WHERE Quantity <= MinStockLevel').c;
    const totalBills = dbGet('SELECT COUNT(*) as c FROM Bills').c;

    const weeklyRevenue = dbAll("SELECT date(CreatedAt) as day, SUM(PaidAmount) as revenue FROM Bills WHERE CreatedAt >= date('now', '-7 days') GROUP BY date(CreatedAt) ORDER BY day");
    const testDistribution = dbAll('SELECT t.Category, COUNT(*) as count FROM Results r JOIN Tests t ON r.TestID = t.TestID GROUP BY t.Category ORDER BY count DESC');
    const recentAppointments = dbAll('SELECT a.QueueToken, a.Status, a.Priority, p.Name as PatientName, s.Date, s.StartTime FROM Appointments a JOIN Patients p ON a.PatientID = p.PatientID JOIN Slots s ON a.SlotID = s.SlotID ORDER BY a.CreatedAt DESC LIMIT 8');
    const statusBreakdown = dbAll('SELECT Status, COUNT(*) as count FROM Appointments GROUP BY Status');

    res.json({
      stats: { totalPatients, todayAppointments, pendingSamples, todayRevenue, totalTests, pendingReports, lowStockItems, totalBills },
      weeklyRevenue, testDistribution, recentAppointments, statusBreakdown
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
