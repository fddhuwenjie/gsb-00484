import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const ALERT_COOLDOWN_MINUTES = 5

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  const orderBy = `ORDER BY
    CASE sa.alert_type
      WHEN 'overtime' THEN 1
      WHEN 'sensor_fault' THEN 2
      WHEN 'vip_violation' THEN 3
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

export function runAnomalyDetection(): void {
  const now = new Date().toISOString()

  const insertAlertStmt = db.prepare(`
    INSERT INTO spot_alerts (spot_id, alert_type, triggered_at, status)
    SELECT ?, ?, ?, 'pending'
    WHERE NOT EXISTS (
      SELECT 1 FROM spot_alerts
      WHERE spot_id = ?
        AND alert_type = ?
        AND (
          status = 'pending'
          OR (status = 'handled' AND datetime(handled_at) >= datetime('now', ?))
        )
    )
  `)

  function tryCreateAlert(spotId: number, alertType: string): void {
    const cooldown = `-${ALERT_COOLDOWN_MINUTES} minutes`
    const result = insertAlertStmt.run(spotId, alertType, now, spotId, alertType, cooldown)
    result.changes
  }

  const overtimeVehicles = db.prepare(`
    SELECT vr.spot_id
    FROM vehicle_record vr
    WHERE vr.is_monthly = 0
      AND vr.exit_time IS NULL
      AND datetime(vr.entry_time) <= datetime('now', '-48 hours')
  `).all() as Array<{ spot_id: number }>

  for (const v of overtimeVehicles) {
    tryCreateAlert(v.spot_id, 'overtime')
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

  for (const s of sensorFaultSpots) {
    tryCreateAlert(s.spot_id, 'sensor_fault')
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

  for (const v of vipViolations) {
    tryCreateAlert(v.spot_id, 'vip_violation')
  }
}

export default router
