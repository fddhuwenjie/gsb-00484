import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'parking.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS parking_lot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    total_spots INTEGER NOT NULL DEFAULT 120,
    floors INTEGER NOT NULL DEFAULT 3,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS parking_spot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor INTEGER NOT NULL,
    zone TEXT NOT NULL,
    number INTEGER NOT NULL,
    spot_code TEXT NOT NULL UNIQUE,
    spot_type TEXT NOT NULL DEFAULT 'small',
    status TEXT NOT NULL DEFAULT 'free',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS billing_rule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_type TEXT NOT NULL UNIQUE,
    free_minutes INTEGER NOT NULL DEFAULT 0,
    hourly_rate REAL NOT NULL DEFAULT 0,
    daily_cap REAL,
    charging_fee REAL NOT NULL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS monthly_rental (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    plate_number TEXT NOT NULL UNIQUE,
    spot_id INTEGER NOT NULL,
    expire_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (spot_id) REFERENCES parking_spot(id)
  );

  CREATE TABLE IF NOT EXISTS coupon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    min_amount REAL NOT NULL DEFAULT 0,
    valid_from TEXT NOT NULL,
    valid_to TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicle_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT NOT NULL,
    spot_id INTEGER NOT NULL,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    fee REAL DEFAULT 0,
    coupon_id INTEGER,
    is_monthly INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (spot_id) REFERENCES parking_spot(id),
    FOREIGN KEY (coupon_id) REFERENCES coupon(id)
  );

  CREATE TABLE IF NOT EXISTS spot_reservation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_id INTEGER NOT NULL,
    plate_number TEXT NOT NULL,
    expire_time TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (spot_id) REFERENCES parking_spot(id)
  );

  CREATE TABLE IF NOT EXISTS visitor_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT NOT NULL,
    purpose TEXT NOT NULL,
    host_plate TEXT NOT NULL,
    expected_arrival TEXT NOT NULL,
    expected_duration INTEGER NOT NULL,
    pass_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spot_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,
    triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending',
    handler TEXT,
    handled_at TEXT,
    remark TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (spot_id) REFERENCES parking_spot(id)
  );

  CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    date_start TEXT,
    date_end TEXT,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    rate_multiplier REAL NOT NULL DEFAULT 1.0,
    spot_type TEXT NOT NULL DEFAULT 'all',
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plate_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT NOT NULL,
    recognized_at TEXT NOT NULL DEFAULT (datetime('now')),
    confidence REAL NOT NULL DEFAULT 0.0,
    image_path TEXT,
    operation TEXT NOT NULL DEFAULT 'entry',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plate_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plate_number TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    operator TEXT NOT NULL DEFAULT 'system',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

function todayAt(h: number, m: number): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

function minutesFromNow(min: number): string {
  return new Date(Date.now() + min * 60000).toISOString()
}

function seedDatabase() {
  const insertLot = db.prepare(
    'INSERT INTO parking_lot (name, address, total_spots, floors) VALUES (?, ?, ?, ?)'
  )
  insertLot.run('智慧停车场', '科技园区A栋地下', 120, 3)

  const insertSpot = db.prepare(
    'INSERT INTO parking_spot (floor, zone, number, spot_code, spot_type, status) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const zones = ['A', 'B', 'C', 'D', 'E']

  const occupiedCodes = new Set([
    'B1-A-1', 'B1-A-2', 'B1-A-3', 'B1-B-2', 'B1-B-3',
    'B2-A-2', 'B2-A-3', 'B2-A-4', 'B2-A-5', 'B2-B-2',
    'B3-A-1', 'B3-A-3', 'B3-B-2', 'B3-B-3', 'B3-B-4',
  ])
  const faultCodes = new Set(['B1-A-5', 'B3-C-7'])
  const reservedCodes = new Set(['B2-D-7', 'B2-D-8', 'B3-A-2'])

  for (let floor = 1; floor <= 3; floor++) {
    for (const zone of zones) {
      for (let num = 1; num <= 8; num++) {
        const code = `B${floor}-${zone}-${num}`
        let spotType = 'small'
        if (zone === 'D') {
          spotType = num <= 6 ? 'large' : 'accessible'
        } else if (zone === 'E') {
          spotType = num <= 4 ? 'ev' : 'vip'
        }
        let status = 'free'
        if (occupiedCodes.has(code)) status = 'occupied'
        else if (faultCodes.has(code)) status = 'fault'
        else if (reservedCodes.has(code)) status = 'reserved'

        insertSpot.run(floor, zone, num, code, spotType, status)
      }
    }
  }

  const insertRule = db.prepare(
    'INSERT INTO billing_rule (spot_type, free_minutes, hourly_rate, daily_cap, charging_fee, description) VALUES (?, ?, ?, ?, ?, ?)'
  )
  insertRule.run('small', 30, 5, 50, 0, '小型车位：前30分钟免费，5元/小时，每日封顶50元')
  insertRule.run('large', 30, 8, 80, 0, '大型车位：前30分钟免费，8元/小时，每日封顶80元')
  insertRule.run('ev', 30, 5, 50, 10, '新能源车位：前30分钟免费，5元/小时+10元充电费，每日封顶50元')
  insertRule.run('accessible', 30, 5, 50, 0, '无障碍车位：前30分钟免费，5元/小时，每日封顶50元')
  insertRule.run('vip', 0, 0, null, 0, 'VIP车位：月租免费停放')

  const insertRental = db.prepare(
    'INSERT INTO monthly_rental (name, phone, plate_number, spot_id, expire_date) VALUES (?, ?, ?, ?, ?)'
  )
  const vipSpotIds: Record<string, number> = {
    'B1-E-5': 37, 'B1-E-6': 38, 'B1-E-7': 39, 'B1-E-8': 40,
    'B2-E-5': 77, 'B2-E-6': 78, 'B2-E-7': 79, 'B2-E-8': 80,
    'B3-E-5': 117, 'B3-E-6': 118,
  }
  const rentals = [
    { name: '张伟', phone: '13800138001', plate: '京A88888', spot: 'B1-E-5', expireDays: 29 },
    { name: '李娜', phone: '13800138002', plate: '京A66666', spot: 'B1-E-6', expireDays: 2 },
    { name: '王强', phone: '13800138003', plate: '京A99999', spot: 'B1-E-7', expireDays: 34 },
    { name: '刘洋', phone: '13800138004', plate: '京A77777', spot: 'B1-E-8', expireDays: 4 },
    { name: '陈静', phone: '13800138005', plate: '京A55555', spot: 'B2-E-5', expireDays: 46 },
    { name: '赵磊', phone: '13800138006', plate: '京A33333', spot: 'B2-E-6', expireDays: 3 },
    { name: '孙芳', phone: '13800138007', plate: '京A11111', spot: 'B2-E-7', expireDays: 39 },
    { name: '周杰', phone: '13800138008', plate: '京A22222', spot: 'B2-E-8', expireDays: 55 },
    { name: '吴敏', phone: '13800138009', plate: '京A44444', spot: 'B3-E-5', expireDays: 1 },
    { name: '郑华', phone: '13800138010', plate: '京A00001', spot: 'B3-E-6', expireDays: 77 },
  ]
  for (const r of rentals) {
    insertRental.run(r.name, r.phone, r.plate, vipSpotIds[r.spot], daysFromNow(r.expireDays))
  }

  const insertCoupon = db.prepare(
    'INSERT INTO coupon (name, type, value, min_amount, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const yearEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59).toISOString()
  insertCoupon.run('新用户立减10元', '满减', 10, 30, yearStart, yearEnd)
  insertCoupon.run('停车8折优惠', '折扣', 0.8, 0, yearStart, yearEnd)
  insertCoupon.run('满50减15', '满减', 15, 50, yearStart, yearEnd)
  insertCoupon.run('新能源专属9折', '折扣', 0.9, 20, yearStart, yearEnd)

  const insertRecord = db.prepare(
    'INSERT INTO vehicle_record (plate_number, spot_id, entry_time, exit_time, fee, is_monthly) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const exitedVehicles = [
    { plate: '京F10001', spotId: 2, entry: todayAt(6, 0), exit: todayAt(7, 30), fee: 5 },
    { plate: '京F10002', spotId: 3, entry: todayAt(6, 30), exit: todayAt(8, 45), fee: 10 },
    { plate: '京F10003', spotId: 4, entry: todayAt(7, 0), exit: todayAt(9, 0), fee: 10 },
    { plate: '京F10004', spotId: 6, entry: todayAt(7, 15), exit: todayAt(8, 0), fee: 5 },
    { plate: '京F10005', spotId: 7, entry: todayAt(8, 0), exit: todayAt(12, 30), fee: 20 },
    { plate: '京F10006', spotId: 8, entry: todayAt(9, 0), exit: todayAt(11, 0), fee: 10 },
    { plate: '京F10007', spotId: 11, entry: todayAt(6, 0), exit: todayAt(14, 0), fee: 40 },
    { plate: '京F10008', spotId: 12, entry: todayAt(7, 30), exit: todayAt(10, 30), fee: 15 },
    { plate: '京F10009', spotId: 13, entry: todayAt(8, 15), exit: todayAt(13, 0), fee: 25 },
    { plate: '京F10010', spotId: 14, entry: todayAt(9, 0), exit: todayAt(10, 0), fee: 5 },
    { plate: '京F10011', spotId: 26, entry: todayAt(6, 30), exit: todayAt(9, 30), fee: 24 },
    { plate: '京F10012', spotId: 27, entry: todayAt(7, 0), exit: todayAt(11, 0), fee: 32 },
    { plate: '京F10013', spotId: 34, entry: todayAt(8, 0), exit: todayAt(10, 0), fee: 20 },
    { plate: '京F10014', spotId: 35, entry: todayAt(9, 0), exit: todayAt(12, 0), fee: 25 },
    { plate: '京F10015', spotId: 36, entry: todayAt(7, 30), exit: todayAt(11, 30), fee: 30 },
  ]
  for (const v of exitedVehicles) {
    insertRecord.run(v.plate, v.spotId, v.entry, v.exit, v.fee, 0)
  }

  const presentVehicles = [
    { plate: '京A12345', spotId: 2, entry: todayAt(8, 0) },
    { plate: '京B23456', spotId: 11, entry: todayAt(9, 30) },
    { plate: '京C34567', spotId: 43, entry: todayAt(10, 15) },
    { plate: '京D45678', spotId: 44, entry: todayAt(7, 45) },
    { plate: '京E56789', spotId: 81, entry: todayAt(11, 0) },
  ]
  for (const v of presentVehicles) {
    insertRecord.run(v.plate, v.spotId, v.entry, null, 0, 0)
  }

  const insertReservation = db.prepare(
    'INSERT INTO spot_reservation (spot_id, plate_number, expire_time) VALUES (?, ?, ?)'
  )
  insertReservation.run(71, '京G10001', minutesFromNow(30))
  insertReservation.run(72, '京G10002', minutesFromNow(25))
  insertReservation.run(82, '京G10003', minutesFromNow(20))

  const insertVisitor = db.prepare(
    'INSERT INTO visitor_registrations (visitor_name, visitor_phone, purpose, host_plate, expected_arrival, expected_duration, pass_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  insertVisitor.run('李明', '13900139001', '商务拜访', '京A88888', new Date(Date.now() + 3600000).toISOString(), 120, '123456', 'approved')
  insertVisitor.run('王芳', '13900139002', '探亲访友', '京A66666', new Date(Date.now() + 7200000).toISOString(), 60, '654321', 'pending')
  insertVisitor.run('张磊', '13900139003', '维修服务', '京A99999', new Date(Date.now() - 7200000).toISOString(), 180, '111222', 'expired')

  const insertAlert = db.prepare(
    'INSERT INTO spot_alerts (spot_id, alert_type, triggered_at, status, handler, handled_at, remark) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  insertAlert.run(2, 'overtime', new Date(Date.now() - 172800000).toISOString(), 'pending', null, null, null)
  insertAlert.run(11, 'sensor_fault', new Date(Date.now() - 3600000).toISOString(), 'pending', null, null, null)
  insertAlert.run(37, 'vip_violation', new Date(Date.now() - 1800000).toISOString(), 'pending', null, null, null)

  const insertPricing = db.prepare(
    'INSERT INTO pricing_rules (rule_name, date_start, date_end, time_start, time_end, rate_multiplier, spot_type, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  insertPricing.run('工作日白天', 'weekday', 'weekday', '08:00', '18:00', 1.5, 'all', 1)
  insertPricing.run('工作日夜间', 'weekday', 'weekday', '18:00', '08:00', 0.8, 'all', 1)
  insertPricing.run('周末全天', 'weekend', 'weekend', '00:00', '24:00', 1.2, 'all', 2)
  insertPricing.run('节假日全天', 'holiday', 'holiday', '00:00', '24:00', 2.0, 'all', 5)
  insertPricing.run('国庆特殊费率', '2026-10-01', '2026-10-07', '00:00', '24:00', 2.0, 'all', 10)
  insertPricing.run('春节特殊费率', '2026-02-17', '2026-02-23', '00:00', '24:00', 2.0, 'all', 10)

  const insertPlateRecord = db.prepare(
    'INSERT INTO plate_records (plate_number, recognized_at, confidence, image_path, operation) VALUES (?, ?, ?, ?, ?)'
  )
  insertPlateRecord.run('京A12345', new Date(Date.now() - 3600000).toISOString(), 0.95, '/images/plate_a12345.jpg', 'entry')
  insertPlateRecord.run('京B23456', new Date(Date.now() - 7200000).toISOString(), 0.88, '/images/plate_b23456.jpg', 'entry')
  insertPlateRecord.run('京C34567', new Date(Date.now() - 1800000).toISOString(), 0.92, '/images/plate_c34567.jpg', 'entry')
  insertPlateRecord.run('京F10001', new Date(Date.now() - 5400000).toISOString(), 0.91, '/images/plate_f10001.jpg', 'exit')

  const insertBlacklist = db.prepare(
    'INSERT INTO plate_blacklist (plate_number, reason, added_at, operator, status) VALUES (?, ?, ?, ?, ?)'
  )
  insertBlacklist.run('京Z99999', '多次欠费', new Date(Date.now() - 86400000 * 30).toISOString(), '管理员', 'active')
  insertBlacklist.run('京Z88888', '违规操作', new Date(Date.now() - 86400000 * 15).toISOString(), '管理员', 'active')
}

const lotCount = (db.prepare('SELECT COUNT(*) as count FROM parking_lot').get() as { count: number }).count
if (lotCount === 0) {
  seedDatabase()
}

const pricingCount = (db.prepare('SELECT COUNT(*) as count FROM pricing_rules').get() as { count: number }).count
if (pricingCount === 0) {
  const insertPricing = db.prepare(
    'INSERT INTO pricing_rules (rule_name, date_start, date_end, time_start, time_end, rate_multiplier, spot_type, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  insertPricing.run('工作日白天', 'weekday', 'weekday', '08:00', '18:00', 1.5, 'all', 1)
  insertPricing.run('工作日夜间', 'weekday', 'weekday', '18:00', '08:00', 0.8, 'all', 1)
  insertPricing.run('周末全天', 'weekend', 'weekend', '00:00', '24:00', 1.2, 'all', 2)
  insertPricing.run('节假日全天', 'holiday', 'holiday', '00:00', '24:00', 2.0, 'all', 5)
  insertPricing.run('国庆特殊费率', '2026-10-01', '2026-10-07', '00:00', '24:00', 2.0, 'all', 10)
  insertPricing.run('春节特殊费率', '2026-02-17', '2026-02-23', '00:00', '24:00', 2.0, 'all', 10)
}

export default db
