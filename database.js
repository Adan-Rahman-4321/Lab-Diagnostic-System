const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(process.env.VERCEL ? '/tmp' : __dirname, 'lab_system.db');
let db = null;

function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Auto-save every 30 seconds
setInterval(saveDB, 30000);

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Database loaded from disk');
  } else {
    db = new SQL.Database();
    console.log('✅ New database created');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      PasswordHash TEXT NOT NULL,
      Role TEXT NOT NULL CHECK(Role IN ('Admin','Receptionist','Technician','Doctor','Patient')),
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      IsActive INTEGER DEFAULT 1
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Patients (
      PatientID INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Age INTEGER,
      Gender TEXT CHECK(Gender IN ('Male','Female','Other')),
      CNIC TEXT UNIQUE,
      Phone TEXT,
      Email TEXT,
      Address TEXT,
      BloodGroup TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      CreatedBy INTEGER REFERENCES Users(UserID)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Slots (
      SlotID INTEGER PRIMARY KEY AUTOINCREMENT,
      Date TEXT NOT NULL,
      StartTime TEXT NOT NULL,
      EndTime TEXT NOT NULL,
      Capacity INTEGER NOT NULL DEFAULT 10,
      Booked INTEGER DEFAULT 0,
      Status TEXT DEFAULT 'Active' CHECK(Status IN ('Active','Full','Cancelled','Completed')),
      SlotType TEXT DEFAULT 'Regular' CHECK(SlotType IN ('Regular','Emergency','VIP')),
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Appointments (
      AppointmentID INTEGER PRIMARY KEY AUTOINCREMENT,
      PatientID INTEGER REFERENCES Patients(PatientID),
      SlotID INTEGER REFERENCES Slots(SlotID),
      Priority TEXT DEFAULT 'Normal' CHECK(Priority IN ('Normal','High','Emergency')),
      QueueToken TEXT UNIQUE,
      Status TEXT DEFAULT 'Scheduled' CHECK(Status IN ('Scheduled','In-Progress','Completed','Cancelled','No-Show')),
      Notes TEXT,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      CreatedBy INTEGER REFERENCES Users(UserID)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Samples (
      SampleID INTEGER PRIMARY KEY AUTOINCREMENT,
      AppointmentID INTEGER REFERENCES Appointments(AppointmentID),
      PatientID INTEGER REFERENCES Patients(PatientID),
      TechnicianID INTEGER REFERENCES Users(UserID),
      SampleType TEXT NOT NULL,
      Barcode TEXT UNIQUE,
      Status TEXT DEFAULT 'Collected' CHECK(Status IN ('Collected','Processing','Analyzed','Verified','Rejected')),
      CollectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      ProcessedAt DATETIME,
      Notes TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Tests (
      TestID INTEGER PRIMARY KEY AUTOINCREMENT,
      TestName TEXT NOT NULL,
      Category TEXT,
      Price REAL NOT NULL,
      TurnaroundHours INTEGER DEFAULT 24,
      ReferenceRange TEXT,
      Unit TEXT,
      IsActive INTEGER DEFAULT 1
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS SampleTests (
      ID INTEGER PRIMARY KEY AUTOINCREMENT,
      SampleID INTEGER REFERENCES Samples(SampleID),
      TestID INTEGER REFERENCES Tests(TestID),
      Status TEXT DEFAULT 'Pending'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Results (
      ResultID INTEGER PRIMARY KEY AUTOINCREMENT,
      SampleID INTEGER REFERENCES Samples(SampleID),
      TestID INTEGER REFERENCES Tests(TestID),
      ResultValue TEXT,
      Remarks TEXT,
      IsAbnormal INTEGER DEFAULT 0,
      EnteredBy INTEGER REFERENCES Users(UserID),
      VerifiedBy INTEGER REFERENCES Users(UserID),
      EnteredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      VerifiedAt DATETIME,
      Status TEXT DEFAULT 'Pending' CHECK(Status IN ('Pending','Entered','Verified','Rejected'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Bills (
      BillID INTEGER PRIMARY KEY AUTOINCREMENT,
      PatientID INTEGER REFERENCES Patients(PatientID),
      AppointmentID INTEGER REFERENCES Appointments(AppointmentID),
      TotalAmount REAL NOT NULL,
      Discount REAL DEFAULT 0,
      PaidAmount REAL DEFAULT 0,
      PaymentStatus TEXT DEFAULT 'Unpaid' CHECK(PaymentStatus IN ('Unpaid','Partial','Paid','Refunded')),
      PaymentMethod TEXT,
      InvoiceNo TEXT UNIQUE,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      CreatedBy INTEGER REFERENCES Users(UserID)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS BillItems (
      ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
      BillID INTEGER REFERENCES Bills(BillID),
      TestID INTEGER REFERENCES Tests(TestID),
      Quantity INTEGER DEFAULT 1,
      UnitPrice REAL,
      TotalPrice REAL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS Inventory (
      ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
      ItemName TEXT NOT NULL,
      Category TEXT,
      Quantity INTEGER DEFAULT 0,
      Unit TEXT,
      MinStockLevel INTEGER DEFAULT 10,
      UnitCost REAL,
      Supplier TEXT,
      ExpiryDate TEXT,
      LastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS InventoryLog (
      LogID INTEGER PRIMARY KEY AUTOINCREMENT,
      ItemID INTEGER REFERENCES Inventory(ItemID),
      ChangeType TEXT CHECK(ChangeType IN ('In','Out','Adjustment')),
      Quantity INTEGER,
      Note TEXT,
      UpdatedBy INTEGER REFERENCES Users(UserID),
      UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed defaults
  const existingAdmin = db.exec("SELECT UserID FROM Users WHERE Email = 'admin@lab.com'");
  if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
    const ins = db.prepare('INSERT INTO Users (Name, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)');
    const users = [
      ['System Admin', 'admin@lab.com', bcrypt.hashSync('admin123', 10), 'Admin'],
      ['Sarah Johnson', 'receptionist@lab.com', bcrypt.hashSync('rec123', 10), 'Receptionist'],
      ['Mike Chen', 'tech@lab.com', bcrypt.hashSync('tech123', 10), 'Technician'],
      ['Dr. Amina Khan', 'doctor@lab.com', bcrypt.hashSync('doc123', 10), 'Doctor'],
      ['Ali Patient', 'patient@lab.com', bcrypt.hashSync('pat123', 10), 'Patient'],
    ];
    users.forEach(u => { ins.run(u); });
    ins.free();
    console.log('  ✅ Default users seeded');

    // Seed tests
    const insTest = db.prepare('INSERT INTO Tests (TestName, Category, Price, TurnaroundHours, ReferenceRange, Unit) VALUES (?, ?, ?, ?, ?, ?)');
    [
      ['Complete Blood Count (CBC)', 'Hematology', 800, 4, '4.5-11.0 x10³/uL', 'x10³/uL'],
      ['Blood Glucose (Fasting)', 'Biochemistry', 300, 2, '70-100 mg/dL', 'mg/dL'],
      ['Liver Function Test (LFT)', 'Biochemistry', 1500, 6, 'ALT: 7-56 U/L', 'U/L'],
      ['Kidney Function Test (KFT)', 'Biochemistry', 1200, 6, 'Creatinine: 0.7-1.3 mg/dL', 'mg/dL'],
      ['Thyroid Profile (T3,T4,TSH)', 'Endocrinology', 2000, 24, 'TSH: 0.4-4.0 mIU/L', 'mIU/L'],
      ['Urine Complete Examination', 'Microbiology', 400, 2, 'Normal', '-'],
      ['Chest X-Ray', 'Radiology', 600, 1, 'Normal', '-'],
      ['HbA1c', 'Biochemistry', 1000, 4, '< 5.7%', '%'],
      ['Lipid Profile', 'Biochemistry', 1200, 4, 'Total Chol: <200 mg/dL', 'mg/dL'],
      ['Dengue NS1 Antigen', 'Serology', 1800, 3, 'Negative', '-'],
    ].forEach(t => { insTest.run(t); });
    insTest.free();

    // Seed inventory
    const insInv = db.prepare('INSERT INTO Inventory (ItemName, Category, Quantity, Unit, MinStockLevel, UnitCost, Supplier) VALUES (?, ?, ?, ?, ?, ?, ?)');
    [
      ['Blood Collection Tubes (EDTA)', 'Consumables', 500, 'Pcs', 100, 5, 'MedSupply Co.'],
      ['Disposable Gloves (Medium)', 'PPE', 200, 'Pairs', 50, 8, 'SafeGuard Ltd.'],
      ['Syringes 5ml', 'Consumables', 300, 'Pcs', 80, 12, 'MedSupply Co.'],
      ['Alcohol Swabs', 'Consumables', 1000, 'Pcs', 200, 2, 'CleanMed'],
      ['Test Reagents - Glucose', 'Reagents', 50, 'Bottles', 10, 450, 'BioReagents Inc.'],
      ['Urine Collection Cups', 'Consumables', 200, 'Pcs', 50, 15, 'MedSupply Co.'],
      ['Printer Paper A4', 'Stationery', 10, 'Reams', 3, 500, 'Office Store'],
      ['QR Code Labels', 'Stationery', 2000, 'Pcs', 500, 1, 'LabelPro'],
    ].forEach(i => { insInv.run(i); });
    insInv.free();

    // Seed slots for next 7 days
    const insSlot = db.prepare('INSERT INTO Slots (Date, StartTime, EndTime, Capacity, SlotType) VALUES (?, ?, ?, ?, ?)');
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      [
        [dateStr, '08:00', '09:00', 10, 'Regular'],
        [dateStr, '09:00', '10:00', 10, 'Regular'],
        [dateStr, '10:00', '11:00', 8, 'Regular'],
        [dateStr, '11:00', '12:00', 8, 'Regular'],
        [dateStr, '14:00', '15:00', 10, 'Regular'],
        [dateStr, '15:00', '16:00', 10, 'Regular'],
        [dateStr, '07:00', '08:00', 5, 'Emergency'],
      ].forEach(s => { insSlot.run(s); });
    }
    insSlot.free();
    console.log('  ✅ Tests, inventory, and slots seeded');
  }

  saveDB();
  return db;
}

// Helper: wraps sql.js to match better-sqlite3-like API
function getDB() { return db; }

// Prepare-like helpers for sql.js
function dbAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return { lastInsertRowid: dbGet("SELECT last_insert_rowid() as id").id, changes: db.getRowsModified() };
}

module.exports = { initDatabase, getDB, dbAll, dbGet, dbRun };
