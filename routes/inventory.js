const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { requireLogin } = require('../middleware/auth');

router.get('/', requireLogin, (req, res) => {
  try { res.json(dbAll('SELECT * FROM Inventory ORDER BY Category, ItemName')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/alerts', requireLogin, (req, res) => {
  try { res.json(dbAll('SELECT * FROM Inventory WHERE Quantity <= MinStockLevel ORDER BY Quantity ASC')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireLogin, (req, res) => {
  try {
    const { ItemName, Category, Quantity, Unit, MinStockLevel, UnitCost, Supplier, ExpiryDate } = req.body;
    const result = dbRun(
      'INSERT INTO Inventory (ItemName, Category, Quantity, Unit, MinStockLevel, UnitCost, Supplier, ExpiryDate) VALUES (?,?,?,?,?,?,?,?)',
      [ItemName, Category, Quantity || 0, Unit, MinStockLevel || 10, UnitCost || 0, Supplier, ExpiryDate || null]
    );
    res.json({ success: true, ItemID: result.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireLogin, (req, res) => {
  try {
    const { ItemName, Category, Quantity, Unit, MinStockLevel, UnitCost, Supplier, ExpiryDate } = req.body;
    dbRun('UPDATE Inventory SET ItemName=?, Category=?, Quantity=?, Unit=?, MinStockLevel=?, UnitCost=?, Supplier=?, ExpiryDate=?, LastUpdated=CURRENT_TIMESTAMP WHERE ItemID=?',
      [ItemName, Category, Quantity, Unit, MinStockLevel, UnitCost, Supplier, ExpiryDate || null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/adjust', requireLogin, (req, res) => {
  try {
    const { ChangeType, Quantity, Note } = req.body;
    const item = dbGet('SELECT * FROM Inventory WHERE ItemID = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    let newQty = item.Quantity;
    if (ChangeType === 'In') newQty += Quantity;
    else if (ChangeType === 'Out') newQty = Math.max(0, newQty - Quantity);
    else newQty = Quantity;
    dbRun('UPDATE Inventory SET Quantity = ?, LastUpdated = CURRENT_TIMESTAMP WHERE ItemID = ?', [newQty, req.params.id]);
    dbRun('INSERT INTO InventoryLog (ItemID, ChangeType, Quantity, Note, UpdatedBy) VALUES (?,?,?,?,?)',
      [req.params.id, ChangeType, Quantity, Note || null, req.session.user.UserID]);
    res.json({ success: true, newQuantity: newQty });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireLogin, (req, res) => {
  try { dbRun('DELETE FROM Inventory WHERE ItemID = ?', [req.params.id]); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
