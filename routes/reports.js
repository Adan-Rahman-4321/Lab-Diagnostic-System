const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

router.get('/', requireLogin, (req, res) => {
  try {
    res.json(dbAll(`SELECT s.SampleID, s.Barcode, s.Status as SampleStatus, s.CollectedAt,
      p.Name as PatientName, p.Age, p.Gender, p.PatientID, u.Name as TechnicianName
      FROM Samples s JOIN Patients p ON s.PatientID = p.PatientID
      LEFT JOIN Users u ON s.TechnicianID = u.UserID
      WHERE s.Status IN ('Analyzed','Verified') ORDER BY s.CollectedAt DESC`));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:sampleId/verify', requireLogin, (req, res) => {
  try {
    dbRun("UPDATE Samples SET Status = 'Verified' WHERE SampleID = ?", [req.params.sampleId]);
    dbRun("UPDATE Results SET Status = 'Verified', VerifiedBy = ?, VerifiedAt = CURRENT_TIMESTAMP WHERE SampleID = ?",
      [req.session.user.UserID, req.params.sampleId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:sampleId/pdf', async (req, res) => {
  try {
    const sample = dbGet(`SELECT s.*, p.Name as PatientName, p.Age, p.Gender, p.CNIC, p.Phone
      FROM Samples s JOIN Patients p ON s.PatientID = p.PatientID WHERE s.SampleID = ?`, [req.params.sampleId]);
    if (!sample) return res.status(404).json({ error: 'Sample not found' });

    const results = dbAll(`SELECT r.*, t.TestName, t.ReferenceRange, t.Unit, t.Category
      FROM Results r JOIN Tests t ON r.TestID = t.TestID WHERE r.SampleID = ?`, [req.params.sampleId]);

    const qrData = `LAB-REPORT|${sample.Barcode}|${sample.PatientName}|${new Date().toISOString()}`;
    const qrImage = await QRCode.toDataURL(qrData);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Report_${sample.Barcode}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#1a5276').text('Smart Diagnostic Lab', { align: 'center' });
    doc.fontSize(10).fillColor('#555').text('Laboratory Test Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke('#1a5276');
    doc.moveDown();

    doc.fontSize(12).fillColor('#1a5276').text('Patient Information');
    doc.fontSize(10).fillColor('#333');
    doc.text(`Name: ${sample.PatientName}    Age: ${sample.Age}    Gender: ${sample.Gender}`);
    doc.text(`CNIC: ${sample.CNIC || 'N/A'}    Phone: ${sample.Phone || 'N/A'}`);
    doc.text(`Sample ID: ${sample.Barcode}    Date: ${sample.CollectedAt}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#1a5276').text('Test Results');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const col = [50, 200, 310, 400, 490];
    doc.fontSize(9).fillColor('#fff');
    doc.rect(50, tableTop, 510, 18).fill('#1a5276');
    doc.text('Test Name', col[0]+5, tableTop+4, {width:145});
    doc.text('Result', col[1]+5, tableTop+4, {width:105});
    doc.text('Unit', col[2]+5, tableTop+4, {width:85});
    doc.text('Reference', col[3]+5, tableTop+4, {width:85});
    doc.text('Status', col[4]+5, tableTop+4, {width:65});

    let y = tableTop + 20;
    results.forEach((r, i) => {
      const bg = i % 2 === 0 ? '#f8f9fa' : '#fff';
      doc.rect(50, y, 510, 16).fill(bg);
      doc.fillColor(r.IsAbnormal ? '#e74c3c' : '#333').fontSize(8);
      doc.text(r.TestName, col[0]+5, y+4, {width:145});
      doc.text(r.ResultValue || '-', col[1]+5, y+4, {width:105});
      doc.text(r.Unit || '-', col[2]+5, y+4, {width:85});
      doc.text(r.ReferenceRange || '-', col[3]+5, y+4, {width:85});
      doc.text(r.Status, col[4]+5, y+4, {width:65});
      y += 16;
    });

    doc.moveDown(2);
    const qrBuf = Buffer.from(qrImage.split(',')[1], 'base64');
    doc.image(qrBuf, 460, y + 10, { width: 80 });
    doc.fontSize(7).fillColor('#999').text('Scan QR to verify', 460, y + 95, { width: 80, align: 'center' });
    doc.fontSize(8).fillColor('#999').text('This is a computer-generated report.', 50, y + 50);
    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:sampleId/qr', async (req, res) => {
  try {
    const sample = dbGet('SELECT Barcode FROM Samples WHERE SampleID = ?', [req.params.sampleId]);
    const qr = await QRCode.toDataURL(`VERIFY|${sample.Barcode}|${Date.now()}`);
    res.json({ qr });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
