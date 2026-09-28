const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try {
    res.json(dbAll(`SELECT b.*, p.Name as PatientName, p.Phone as PatientPhone
      FROM Bills b JOIN Patients p ON b.PatientID = p.PatientID ORDER BY b.CreatedAt DESC LIMIT 200`));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', requireLogin, (req, res) => {
  try {
    const bill = dbGet(`SELECT b.*, p.Name as PatientName, p.Phone, p.CNIC
      FROM Bills b JOIN Patients p ON b.PatientID = p.PatientID WHERE b.BillID = ?`, [req.params.id]);
    const items = dbAll(`SELECT bi.*, t.TestName, t.Category
      FROM BillItems bi JOIN Tests t ON bi.TestID = t.TestID WHERE bi.BillID = ?`, [req.params.id]);
    res.json({ bill, items });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { PatientID, AppointmentID, TestIDs, Discount, PaymentMethod, PaidAmount } = req.body;
    let total = 0;
    const tests = [];
    if (TestIDs && TestIDs.length > 0) {
      TestIDs.forEach(tid => {
        const test = dbGet('SELECT * FROM Tests WHERE TestID = ?', [tid]);
        if (test) { total += test.Price; tests.push(test); }
      });
    }
    const disc = Discount || 0;
    const finalAmount = total - disc;
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cnt = dbGet("SELECT COUNT(*) as c FROM Bills WHERE InvoiceNo LIKE ?", [`INV-${today}%`]).c;
    const invoiceNo = `INV-${today}-${String(cnt + 1).padStart(4, '0')}`;

    const result = dbRun(
      'INSERT INTO Bills (PatientID, AppointmentID, TotalAmount, Discount, PaidAmount, PaymentStatus, PaymentMethod, InvoiceNo, CreatedBy) VALUES (?,?,?,?,?,?,?,?,?)',
      [PatientID, AppointmentID || null, finalAmount, disc, PaidAmount || 0,
       (PaidAmount || 0) >= finalAmount ? 'Paid' : (PaidAmount > 0 ? 'Partial' : 'Unpaid'),
       PaymentMethod || null, invoiceNo, req.session.user.UserID]
    );
    tests.forEach(t => dbRun('INSERT INTO BillItems (BillID, TestID, Quantity, UnitPrice, TotalPrice) VALUES (?,?,?,?,?)',
      [result.lastInsertRowid, t.TestID, 1, t.Price, t.Price]));
    res.json({ success: true, BillID: result.lastInsertRowid, InvoiceNo: invoiceNo });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { PaidAmount, PaymentMethod } = req.body;
    const bill = dbGet('SELECT TotalAmount FROM Bills WHERE BillID = ?', [req.params.id]);
    const status = PaidAmount >= bill.TotalAmount ? 'Paid' : (PaidAmount > 0 ? 'Partial' : 'Unpaid');
    dbRun('UPDATE Bills SET PaidAmount=?, PaymentMethod=?, PaymentStatus=? WHERE BillID=?', [PaidAmount, PaymentMethod, status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
