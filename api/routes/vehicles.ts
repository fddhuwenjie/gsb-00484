import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

function isWhitelisted(plateNumber: string): boolean {
  const rental = db.prepare('SELECT id FROM monthly_rental WHERE plate_number = ? AND expire_date >= ?').get(plateNumber, new Date().toISOString()) as any
  return !!rental
}

function isTimeInRange(current: string, start: string, end: string): boolean {
  if (start <= end) {
    return current >= start && current < end
  } else {
    return current >= start || current < end
  }
}

function isHoliday(date: Date): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const holidays: string[] = [
    '1-1', '1-2', '1-3',
    '5-1', '5-2', '5-3',
    '10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7',
  ]
  return holidays.includes(`${m}-${d}`)
}

function getActivePricingRules(spotType: string, date: Date): any[] {
  const dayOfWeek = date.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const dateStr = date.toISOString().split('T')[0]
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  const allRules = db.prepare(`
    SELECT * FROM pricing_rules
    WHERE (spot_type = 'all' OR spot_type = ?)
    ORDER BY priority DESC
  `).all(spotType) as any[]

  const matchedRules = allRules.filter(rule => {
    const dateType = rule.date_start === 'weekend' || rule.date_end === 'weekend' ? 'weekend'
      : rule.date_start === 'holiday' || rule.date_end === 'holiday' ? 'holiday'
      : rule.date_start === 'weekday' || rule.date_end === 'weekday' ? 'weekday'
      : (rule.date_start !== null && rule.date_end !== null) ? 'custom' : 'weekday'

    if (dateType === 'weekend' && !isWeekend) return false
    if (dateType === 'holiday' && !isHoliday(date)) return false
    if (dateType === 'weekday' && isWeekend) return false
    if (dateType === 'custom') {
      if (dateStr < rule.date_start || dateStr > rule.date_end) return false
    }

    return isTimeInRange(timeStr, rule.time_start, rule.time_end)
  })

  return matchedRules
}

function getRateMultiplier(spotType: string, date: Date): number {
  const rules = getActivePricingRules(spotType, date)
  if (rules.length > 0) return rules[0].rate_multiplier
  return 1.0
}

function calculateFee(spotType: string, entryTime: string, couponId?: number, plateNumber?: string): { fee: number; details: any } {
  const rule = db.prepare('SELECT * FROM billing_rule WHERE spot_type = ?').get(spotType) as any
  if (!rule) return { fee: 0, details: {} }

  const entry = new Date(entryTime).getTime()
  const now = Date.now()
  const totalMinutes = Math.floor((now - entry) / 60000)

  const isVisitor = plateNumber ? plateNumber.startsWith('VISITOR-') : false
  const visitorFreeMinutes = isVisitor ? 120 : 0
  const effectiveFreeMinutes = Math.max(rule.free_minutes, visitorFreeMinutes)

  if (totalMinutes <= effectiveFreeMinutes) {
    let fee = rule.charging_fee || 0
    fee = applyCoupon(fee, couponId)
    const details: any = {
      totalMinutes,
      freeMinutes: effectiveFreeMinutes,
      billableHours: 0,
      hourlyRate: rule.hourly_rate,
      chargingFee: rule.charging_fee || 0,
      segmented: false,
      isVisitor,
      visitorFreeMinutes: isVisitor ? 120 : 0,
    }
    return { fee: Math.max(0, fee), details }
  }

  const segments = calculateSegmentedFee(rule, entryTime, now, effectiveFreeMinutes)
  let fee = segments.totalFee + (rule.charging_fee || 0)

  if (rule.daily_cap !== null && rule.daily_cap !== undefined && fee > rule.daily_cap) {
    fee = rule.daily_cap
  }

  fee = applyCoupon(fee, couponId)

  const details: any = {
    totalMinutes,
    freeMinutes: effectiveFreeMinutes,
    billableHours: Math.ceil((totalMinutes - effectiveFreeMinutes) / 60),
    hourlyRate: rule.hourly_rate,
    chargingFee: rule.charging_fee || 0,
    capped: rule.daily_cap !== null && rule.daily_cap !== undefined,
    segmented: true,
    segments: segments.segments,
    isVisitor,
    visitorFreeMinutes: isVisitor ? 120 : 0,
  }

  return { fee: Math.max(0, fee), details }
}

function calculateSegmentedFee(rule: any, entryTime: string, exitTime: number, freeMinutes: number): { totalFee: number; segments: any[] } {
  const segments: any[] = []
  let totalFee = 0

  const entryMs = new Date(entryTime).getTime()
  const freeMs = freeMinutes * 60000
  const billableStart = entryMs + freeMs

  if (billableStart >= exitTime) {
    return { totalFee: 0, segments: [] }
  }

  let current = new Date(billableStart)
  const end = new Date(exitTime)

  while (current < end) {
    const nextHour = new Date(current)
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
    const segmentEnd = nextHour < end ? nextHour : end
    const segmentMinutes = Math.ceil((segmentEnd.getTime() - current.getTime()) / 60000)

    const multiplier = getRateMultiplier(rule.spot_type, current)
    const segmentFee = rule.hourly_rate * multiplier

    segments.push({
      start: current.toISOString(),
      end: segmentEnd.toISOString(),
      minutes: segmentMinutes,
      multiplier,
      rate: segmentFee,
    })

    totalFee += segmentFee
    current = segmentEnd
  }

  return { totalFee: Math.round(totalFee * 100) / 100, segments }
}

function applyCoupon(fee: number, couponId?: number): number {
  if (!couponId) return fee
  const coupon = db.prepare('SELECT * FROM coupon WHERE id = ?').get(couponId) as any
  if (!coupon) return fee
  const now = new Date().toISOString()
  if (now < coupon.valid_from || now > coupon.valid_to) return fee
  if (fee < coupon.min_amount) return fee

  if (coupon.type === '满减') {
    fee -= coupon.value
  } else if (coupon.type === '折扣') {
    fee *= coupon.value
  }
  return Math.max(0, Math.round(fee * 100) / 100)
}

router.post('/entry', (req: Request, res: Response): void => {
  const { plate_number, spot_id } = req.body
  if (!plate_number) {
    res.status(400).json({ success: false, error: '车牌号不能为空' })
    return
  }

  const blacklisted = db.prepare("SELECT * FROM plate_blacklist WHERE plate_number = ? AND status = 'active'").get(plate_number) as any
  if (blacklisted) {
    res.status(403).json({ success: false, error: '该车牌在黑名单中，禁止入场', blacklist: true })
    return
  }

  const whitelisted = isWhitelisted(plate_number)

  const rental = db.prepare('SELECT * FROM monthly_rental WHERE plate_number = ? AND expire_date >= ?').get(plate_number, new Date().toISOString()) as any

  let targetSpotId = spot_id
  let isMonthly = 0

  if (rental) {
    isMonthly = 1
    targetSpotId = rental.spot_id
  }

  if (!targetSpotId) {
    if (whitelisted) {
      const freeSpot = db.prepare("SELECT * FROM parking_spot WHERE status = 'free' LIMIT 1").get() as any
      if (freeSpot) {
        targetSpotId = freeSpot.id
      } else {
        res.status(400).json({ success: false, error: '当前无空闲车位' })
        return
      }
    } else {
      res.status(400).json({ success: false, error: '未指定车位且非月租车辆' })
      return
    }
  }

  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(targetSpotId) as any
  if (!spot) {
    res.status(404).json({ success: false, error: '车位不存在' })
    return
  }
  if (spot.status !== 'free') {
    res.status(400).json({ success: false, error: `车位状态为${spot.status}，无法停放` })
    return
  }

  const activeRecord = db.prepare('SELECT * FROM vehicle_record WHERE plate_number = ? AND exit_time IS NULL').get(plate_number) as any
  if (activeRecord) {
    res.status(400).json({ success: false, error: '该车辆已在场内' })
    return
  }

  const transaction = db.transaction(() => {
    const now = new Date().toISOString()
    const info = db.prepare(
      'INSERT INTO vehicle_record (plate_number, spot_id, entry_time, is_monthly) VALUES (?, ?, ?, ?)'
    ).run(plate_number, targetSpotId, now, isMonthly)
    db.prepare('UPDATE parking_spot SET status = ?, updated_at = ? WHERE id = ?').run('occupied', now, targetSpotId)
    db.prepare(
      'INSERT INTO plate_records (plate_number, recognized_at, confidence, image_path, operation) VALUES (?, ?, ?, ?, ?)'
    ).run(plate_number, now, 0.92, null, 'entry')
    return info.lastInsertRowid
  })

  const recordId = transaction()
  const record = db.prepare('SELECT * FROM vehicle_record WHERE id = ?').get(recordId)
  const updatedSpot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(targetSpotId)

  res.json({ success: true, data: { record, spot: updatedSpot, isMonthly: !!rental } })
})

router.post('/exit', (req: Request, res: Response): void => {
  const { plate_number, coupon_id } = req.body
  if (!plate_number) {
    res.status(400).json({ success: false, error: '车牌号不能为空' })
    return
  }

  const record = db.prepare('SELECT * FROM vehicle_record WHERE plate_number = ? AND exit_time IS NULL').get(plate_number) as any
  if (!record) {
    res.status(404).json({ success: false, error: '未找到该车辆的在场记录' })
    return
  }

  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(record.spot_id) as any
  const { fee, details } = calculateFee(spot.spot_type, record.entry_time, coupon_id, record.plate_number)

  const transaction = db.transaction(() => {
    const now = new Date().toISOString()
    db.prepare('UPDATE vehicle_record SET exit_time = ?, fee = ?, coupon_id = ? WHERE id = ?')
      .run(now, fee, coupon_id ?? null, record.id)
    db.prepare('UPDATE parking_spot SET status = ?, updated_at = ? WHERE id = ?')
      .run('free', now, record.spot_id)
    db.prepare(
      'INSERT INTO plate_records (plate_number, recognized_at, confidence, image_path, operation) VALUES (?, ?, ?, ?, ?)'
    ).run(record.plate_number, now, 0.90, null, 'exit')
  })

  transaction()
  const updatedRecord = db.prepare('SELECT * FROM vehicle_record WHERE id = ?').get(record.id)
  const updatedSpot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(record.spot_id)

  res.json({ success: true, data: { record: updatedRecord, spot: updatedSpot, feeDetails: details } })
})

router.get('/present', (req: Request, res: Response): void => {
  const records = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number, ps.spot_type
    FROM vehicle_record vr
    JOIN parking_spot ps ON vr.spot_id = ps.id
    WHERE vr.exit_time IS NULL
    ORDER BY vr.entry_time DESC
  `).all() as any[]

  const now = Date.now()
  const data = records.map(r => ({
    ...r,
    duration_minutes: Math.floor((now - new Date(r.entry_time).getTime()) / 60000)
  }))

  res.json({ success: true, data })
})

router.get('/records', (req: Request, res: Response): void => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM vehicle_record').get() as any).count
  const records = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.spot_type
    FROM vehicle_record vr
    JOIN parking_spot ps ON vr.spot_id = ps.id
    ORDER BY vr.entry_time DESC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset)

  res.json({
    success: true,
    data: { records, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })
})

export { calculateFee }
export default router
