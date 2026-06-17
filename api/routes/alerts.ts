import { Router, type Request, type Response } from 'express'
import db from '../database.js'

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
  const alert = db.prepare('SELECT * FROM spot_alerts WHERE id = ?').get(req.params.id) as any
  if (!alert) {
    res.status(404).json({ success: false, error: '告警未找到' })
    return
  }
  const now = new Date().toISOString()
  const handleTxn = db.transaction(() => {
    db.prepare(
      "UPDATE spot_alerts SET status = 'handled', handler = ?, handled_at = ?, remark = ? WHERE id = ?"
    ).run(handler ?? null, now, remark ?? null, req.params.id)
    db.prepare(
      `UPDATE spot_alerts SET status = 'handled', handler = ?, handled_at = ?, remark = '同车位同类型告警一并处理'
       WHERE spot_id = ? AND alert_type = ? AND status = 'pending' AND id != ?`
    ).run(handler ?? null, now, alert.spot_id, alert.alert_type, req.params.id)
  })
  handleTxn()
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

const ALERT_COOLDOWN_MS: Record<string, number> = {
  overtime: 2 * 60 * 60 * 1000,
  sensor_fault: 1 * 60 * 60 * 1000,
  vip_violation: 30 * 60 * 1000,
}
const DEFAULT_COOLDOWN_MS = 2 * 60 * 60 * 1000

export function runAnomalyDetection(): void {
  const now = new Date().toISOString()

  const overtimeVehicles = db.prepare(`
    SELECT vr.spot_id
    FROM vehicle_record vr
    WHERE vr.is_monthly = 0
      AND vr.exit_time IS NULL
      AND datetime(vr.entry_time) <= datetime('now', '-48 hours')
  `).all() as Array<{ spot_id: number }>

  const sensorFaultSpots = db.prepare(`
    SELECT ps.id as spot_id
    FROM parking_spot ps
    WHERE ps.status = 'occupied'
      AND NOT EXISTS (
        SELECT 1 FROM vehicle_record vr
        WHERE vr.spot_id = ps.id AND vr.exit_time IS NULL
      )
  `).all() as Array<{ spot_id: number }>

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

  const insertAlert = db.prepare(
    'INSERT INTO spot_alerts (spot_id, alert_type, triggered_at, status) VALUES (?, ?, ?, ?)'
  )
  const activeCheck = db.prepare(
    `SELECT id FROM spot_alerts
     WHERE spot_id = ? AND alert_type = ? AND (
       status = 'pending'
       OR (status = 'handled' AND handled_at >= ?)
     )`
  )

  const detectAndInsert = db.transaction((
    spots: Array<{ spot_id: number }>,
    alertType: string
  ) => {
    const cooldownMs = ALERT_COOLDOWN_MS[alertType] ?? DEFAULT_COOLDOWN_MS
    const cutoffTime = new Date(Date.now() - cooldownMs).toISOString()
    for (const s of spots) {
      const existing = activeCheck.get(s.spot_id, alertType, cutoffTime)
      if (!existing) {
        insertAlert.run(s.spot_id, alertType, now, 'pending')
      }
    }
  })

  detectAndInsert(overtimeVehicles, 'overtime')
  detectAndInsert(sensorFaultSpots, 'sensor_fault')
  detectAndInsert(vipViolations, 'vip_violation')
}

export default router
