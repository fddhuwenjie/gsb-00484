import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/recommend', (req: Request, res: Response): void => {
  const spot = db.prepare(`
    SELECT * FROM parking_spot
    WHERE status = 'free'
    ORDER BY floor ASC, zone ASC, number ASC
    LIMIT 1
  `).get()
  if (!spot) {
    res.status(404).json({ success: false, error: '当前没有空闲车位' })
    return
  }
  res.json({ success: true, data: spot })
})

router.get('/floor-status', (req: Request, res: Response): void => {
  const stats = db.prepare(`
    SELECT floor,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'free' THEN 1 ELSE 0 END) as free,
      SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
      SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault,
      SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
    FROM parking_spot
    GROUP BY floor
    ORDER BY floor
  `).all()
  res.json({ success: true, data: stats })
})

router.post('/reserve', (req: Request, res: Response): void => {
  const { spot_id, plate_number } = req.body
  if (!spot_id || !plate_number) {
    res.status(400).json({ success: false, error: 'spot_id和plate_number不能为空' })
    return
  }

  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(spot_id) as any
  if (!spot) {
    res.status(404).json({ success: false, error: '车位不存在' })
    return
  }
  if (spot.status !== 'free') {
    res.status(400).json({ success: false, error: '该车位不可预约' })
    return
  }

  const existingReservation = db.prepare('SELECT * FROM spot_reservation WHERE spot_id = ? AND expire_time > ?').get(spot_id, new Date().toISOString()) as any
  if (existingReservation) {
    res.status(400).json({ success: false, error: '该车位已有有效预约' })
    return
  }

  const expireTime = new Date(Date.now() + 30 * 60000).toISOString()

  const transaction = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO spot_reservation (spot_id, plate_number, expire_time) VALUES (?, ?, ?)'
    ).run(spot_id, plate_number, expireTime)
    db.prepare('UPDATE parking_spot SET status = ?, updated_at = ? WHERE id = ?').run('reserved', new Date().toISOString(), spot_id)
    return info.lastInsertRowid
  })

  const reservationId = transaction()
  const reservation = db.prepare('SELECT * FROM spot_reservation WHERE id = ?').get(reservationId)
  const updatedSpot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(spot_id)

  res.json({ success: true, data: { reservation, spot: updatedSpot } })
})

router.delete('/reserve/:id', (req: Request, res: Response): void => {
  const reservation = db.prepare('SELECT * FROM spot_reservation WHERE id = ?').get(req.params.id) as any
  if (!reservation) {
    res.status(404).json({ success: false, error: '预约记录未找到' })
    return
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM spot_reservation WHERE id = ?').run(req.params.id)
    const activeReservation = db.prepare('SELECT * FROM spot_reservation WHERE spot_id = ? AND expire_time > ?').get(reservation.spot_id, new Date().toISOString())
    if (!activeReservation) {
      db.prepare('UPDATE parking_spot SET status = ?, updated_at = ? WHERE id = ?').run('free', new Date().toISOString(), reservation.spot_id)
    }
  })

  transaction()
  res.json({ success: true, data: null })
})

router.get('/reservations', (req: Request, res: Response): void => {
  const now = new Date().toISOString()
  const reservations = db.prepare(`
    SELECT sr.*, ps.floor, ps.zone, ps.number, ps.spot_code
    FROM spot_reservation sr
    JOIN parking_spot ps ON sr.spot_id = ps.id
    WHERE sr.expire_time > ?
    ORDER BY sr.expire_time ASC
  `).all(now)
  res.json({ success: true, data: reservations })
})

export default router
