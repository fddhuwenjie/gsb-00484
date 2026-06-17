import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  const orderBy = `ORDER BY
    CASE sa.alert_type
      WHEN 'overtime' THEN 1
      WHEN 'vip_violation' THEN 2
      WHEN 'sensor_fault' THEN 3
      ELSE 4
    END,
    sa.triggered_at DESC`
  const alerts = status
    ? db.prepare(`
        SELECT sa.*, ps.spot_code
        FROM spot_alerts sa
        JOIN parking_spot ps ON sa.spot_id = ps.id
        WHERE sa.status = ?
        ${orderBy}
      `).all(status)
    : db.prepare(`
        SELECT sa.*, ps.spot_code
        FROM spot_alerts sa
        JOIN parking_spot ps ON sa.spot_id = ps.id
        ${orderBy}
      `).all()
  res.json({ success: true, data: alerts })
})

router.get('/pending-count', (_req: Request, res: Response): void => {
  const result = db.prepare("SELECT COUNT(*) as count FROM spot_alerts WHERE status = 'pending'").get() as { count: number }
  res.json({ success: true, data: { count: result.count } })
})

router.put('/:id/handle', (req: Request, res: Response): void => {
  const { handler, remark } = req.body
  const alert = db.prepare('SELECT * FROM spot_alerts WHERE id = ?').get(req.params.id)
  if (!alert) {
    res.status(404).json({ success: false, error: '告警未找到' })
    return
  }
  const now = new Date().toISOString()
  db.prepare(
    "UPDATE spot_alerts SET status = 'handled', handler = ?, handled_at = ?, remark = ? WHERE id = ?"
  ).run(handler ?? null, now, remark ?? null, req.params.id)
  const updated = db.prepare('SELECT * FROM spot_alerts WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const alert = db.prepare('SELECT * FROM spot_alerts WHERE id = ?').get(req.params.id)
  if (!alert) {
    res.status(404).json({ success: false, error: '告警未找到' })
    return
  }
  db.prepare('DELETE FROM spot_alerts WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

const COOLDOWN_MINUTES = 5

export function runAnomalyDetection(): void {
  const now = new Date().toISOString()

  const insertAlert = db.prepare(
    'INSERT INTO spot_alerts (spot_id, alert_type, triggered_at, status) VALUES (?, ?, ?, ?)'
  )
  const pendingCheck = db.prepare(
    "SELECT id FROM spot_alerts WHERE spot_id = ? AND alert_type = ? AND status = 'pending'"
  )
  const recentHandledCheck = db.prepare(
    "SELECT id FROM spot_alerts WHERE spot_id = ? AND alert_type = ? AND status = 'handled' AND datetime(handled_at) >= datetime('now', ?)"
  )
  const resolveAlert = db.prepare(
    "UPDATE spot_alerts SET status = 'handled', handler = 'system', handled_at = ?, remark = '异常条件自动恢复' WHERE spot_id = ? AND alert_type = ? AND status = 'pending'"
  )

  const overtimeVehicles = db.prepare(`
    SELECT vr.spot_id
    FROM vehicle_record vr
    WHERE vr.is_monthly = 0
      AND vr.exit_time IS NULL
      AND datetime(vr.entry_time) <= datetime('now', '-48 hours')
  `).all() as Array<{ spot_id: number }>

  const overtimeSpotIds = new Set(overtimeVehicles.map(v => v.spot_id))

  const pendingOvertime = db.prepare(
    "SELECT spot_id FROM spot_alerts WHERE alert_type = 'overtime' AND status = 'pending'"
  ).all() as Array<{ spot_id: number }>

  for (const a of pendingOvertime) {
    if (!overtimeSpotIds.has(a.spot_id)) {
      resolveAlert.run(now, a.spot_id, 'overtime')
    }
  }

  for (const v of overtimeVehicles) {
    const existing = pendingCheck.get(v.spot_id, 'overtime')
    if (existing) continue
    const recent = recentHandledCheck.get(v.spot_id, 'overtime', `-${COOLDOWN_MINUTES} minutes`)
    if (recent) continue
    insertAlert.run(v.spot_id, 'overtime', now, 'pending')
  }

  const sensorFaultSpots = db.prepare(`
    SELECT ps.id as spot_id
    FROM parking_spot ps
    WHERE ps.status = 'occupied'
      AND NOT EXISTS (
        SELECT 1 FROM vehicle_record vr
        WHERE vr.spot_id = ps.id AND vr.exit_time IS NULL
      )
  `).all() as Array<{ spot_id: number }>

  const sensorFaultSpotIds = new Set(sensorFaultSpots.map(s => s.spot_id))

  const pendingSensorFault = db.prepare(
    "SELECT spot_id FROM spot_alerts WHERE alert_type = 'sensor_fault' AND status = 'pending'"
  ).all() as Array<{ spot_id: number }>

  for (const a of pendingSensorFault) {
    if (!sensorFaultSpotIds.has(a.spot_id)) {
      resolveAlert.run(now, a.spot_id, 'sensor_fault')
    }
  }

  for (const s of sensorFaultSpots) {
    const existing = pendingCheck.get(s.spot_id, 'sensor_fault')
    if (existing) continue
    const recent = recentHandledCheck.get(s.spot_id, 'sensor_fault', `-${COOLDOWN_MINUTES} minutes`)
    if (recent) continue
    insertAlert.run(s.spot_id, 'sensor_fault', now, 'pending')
  }

  const vipViolations = db.prepare(`
    SELECT vr.spot_id
    FROM vehicle_record vr
    JOIN parking_spot ps ON vr.spot_id = ps.id
    WHERE ps.spot_type = 'vip'
      AND ps.status = 'occupied'
      AND vr.exit_time IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM monthly_rental mr
        WHERE mr.plate_number = vr.plate_number
          AND mr.expire_date >= ?
      )
      AND datetime(vr.entry_time) <= datetime('now', '-30 minutes')
  `).all(now) as Array<{ spot_id: number }>

  const vipViolationSpotIds = new Set(vipViolations.map(v => v.spot_id))

  const pendingVipViolation = db.prepare(
    "SELECT spot_id FROM spot_alerts WHERE alert_type = 'vip_violation' AND status = 'pending'"
  ).all() as Array<{ spot_id: number }>

  for (const a of pendingVipViolation) {
    if (!vipViolationSpotIds.has(a.spot_id)) {
      resolveAlert.run(now, a.spot_id, 'vip_violation')
    }
  }

  for (const v of vipViolations) {
    const existing = pendingCheck.get(v.spot_id, 'vip_violation')
    if (existing) continue
    const recent = recentHandledCheck.get(v.spot_id, 'vip_violation', `-${COOLDOWN_MINUTES} minutes`)
    if (recent) continue
    insertAlert.run(v.spot_id, 'vip_violation', now, 'pending')
  }
}

export default router
