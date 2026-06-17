import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

const ALERT_TYPE_ORDER = `
  CASE sa.alert_type
    WHEN 'overtime' THEN 1
    WHEN 'vip_violation' THEN 2
    WHEN 'sensor_fault' THEN 3
    ELSE 4
  END
`

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  const orderBy = `ORDER BY ${ALERT_TYPE_ORDER}, sa.triggered_at DESC`
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

function getLatestAlert(spotId: number, alertType: string): any {
  return db.prepare(`
    SELECT * FROM spot_alerts
    WHERE spot_id = ? AND alert_type = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(spotId, alertType)
}

function hasResolvedAfterHandled(spotId: number, alertType: string, handledId: number): boolean {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM spot_alerts
    WHERE spot_id = ? AND alert_type = ? AND status = 'resolved' AND id > ?
  `).get(spotId, alertType, handledId) as { count: number }
  return result.count > 0
}

export function runAnomalyDetection(): void {
  const now = new Date().toISOString()

  const overtimeSpotIds = (db.prepare(`
    SELECT vr.spot_id
    FROM vehicle_record vr
    WHERE vr.is_monthly = 0
      AND vr.exit_time IS NULL
      AND datetime(vr.entry_time) <= datetime('now', '-48 hours')
  `).all() as Array<{ spot_id: number }>).map(v => v.spot_id)

  const sensorFaultSpotIds = (db.prepare(`
    SELECT ps.id as spot_id
    FROM parking_spot ps
    WHERE ps.status = 'occupied'
      AND NOT EXISTS (
        SELECT 1 FROM vehicle_record vr
        WHERE vr.spot_id = ps.id AND vr.exit_time IS NULL
      )
  `).all() as Array<{ spot_id: number }>).map(s => s.spot_id)

  const vipViolationSpotIds = (db.prepare(`
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
  `).all(now) as Array<{ spot_id: number }>).map(v => v.spot_id)

  const alertConfigs: Array<{ type: string; abnormalSpotIds: number[] }> = [
    { type: 'overtime', abnormalSpotIds: overtimeSpotIds },
    { type: 'sensor_fault', abnormalSpotIds: sensorFaultSpotIds },
    { type: 'vip_violation', abnormalSpotIds: vipViolationSpotIds },
  ]

  const insertAlert = db.prepare(
    'INSERT INTO spot_alerts (spot_id, alert_type, triggered_at, status, remark) VALUES (?, ?, ?, ?, ?)'
  )

  const resolveAlert = db.prepare(
    "UPDATE spot_alerts SET status = 'resolved', handled_at = ? WHERE id = ?"
  )

  const pendingAlertsByType = db.prepare(`
    SELECT id, spot_id FROM spot_alerts WHERE alert_type = ? AND status = 'pending'
  `)

  for (const config of alertConfigs) {
    const { type, abnormalSpotIds } = config
    const abnormalSet = new Set(abnormalSpotIds)

    const pendingAlerts = pendingAlertsByType.all(type) as Array<{ id: number; spot_id: number }>

    for (const alert of pendingAlerts) {
      if (!abnormalSet.has(alert.spot_id)) {
        resolveAlert.run(now, alert.id)
      }
    }

    const handledAlerts = db.prepare(`
      SELECT id, spot_id FROM spot_alerts
      WHERE alert_type = ? AND status = 'handled'
    `).all(type) as Array<{ id: number; spot_id: number }>

    for (const alert of handledAlerts) {
      if (!abnormalSet.has(alert.spot_id)) {
        const latest = getLatestAlert(alert.spot_id, type)
        if (latest && latest.id === alert.id) {
          if (!hasResolvedAfterHandled(alert.spot_id, type, alert.id)) {
            insertAlert.run(alert.spot_id, type, now, 'resolved', '异常自动恢复')
          }
        }
      }
    }

    for (const spotId of abnormalSpotIds) {
      const latest = getLatestAlert(spotId, type)

      if (!latest) {
        insertAlert.run(spotId, type, now, 'pending', null)
        continue
      }

      if (latest.status === 'pending') {
        continue
      }

      if (latest.status === 'resolved') {
        insertAlert.run(spotId, type, now, 'pending', null)
        continue
      }

      if (latest.status === 'handled') {
        if (hasResolvedAfterHandled(spotId, type, latest.id)) {
          insertAlert.run(spotId, type, now, 'pending', null)
        }
      }
    }
  }
}

export default router
