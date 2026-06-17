import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/expiring', (req: Request, res: Response): void => {
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString()
  const rentals = db.prepare(`
    SELECT mr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM monthly_rental mr
    JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE mr.expire_date <= ?
    ORDER BY mr.expire_date ASC
  `).all(sevenDaysLater)
  res.json({ success: true, data: rentals })
})

router.get('/', (req: Request, res: Response): void => {
  const rentals = db.prepare(`
    SELECT mr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM monthly_rental mr
    JOIN parking_spot ps ON mr.spot_id = ps.id
    ORDER BY mr.expire_date ASC
  `).all()
  res.json({ success: true, data: rentals })
})

router.post('/', (req: Request, res: Response): void => {
  const { name, phone, plate_number, spot_id, expire_date } = req.body
  if (!name || !phone || !plate_number || !spot_id || !expire_date) {
    res.status(400).json({ success: false, error: '缺少必要字段' })
    return
  }

  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(spot_id) as any
  if (!spot) {
    res.status(404).json({ success: false, error: '车位不存在' })
    return
  }
  if (spot.spot_type !== 'vip') {
    res.status(400).json({ success: false, error: '月租仅限VIP车位' })
    return
  }

  const existing = db.prepare('SELECT * FROM monthly_rental WHERE plate_number = ?').get(plate_number) as any
  if (existing) {
    res.status(400).json({ success: false, error: '该车牌已有月租记录' })
    return
  }

  const info = db.prepare(
    'INSERT INTO monthly_rental (name, phone, plate_number, spot_id, expire_date) VALUES (?, ?, ?, ?, ?)'
  ).run(name, phone, plate_number, spot_id, expire_date)
  const rental = db.prepare(`
    SELECT mr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM monthly_rental mr
    JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE mr.id = ?
  `).get(info.lastInsertRowid)
  res.json({ success: true, data: rental })
})

router.put('/:id', (req: Request, res: Response): void => {
  const rental = db.prepare('SELECT * FROM monthly_rental WHERE id = ?').get(req.params.id)
  if (!rental) {
    res.status(404).json({ success: false, error: '月租记录未找到' })
    return
  }
  const { name, phone, plate_number, spot_id, expire_date } = req.body
  db.prepare(`
    UPDATE monthly_rental SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      plate_number = COALESCE(?, plate_number),
      spot_id = COALESCE(?, spot_id),
      expire_date = COALESCE(?, expire_date),
      updated_at = ?
    WHERE id = ?
  `).run(name ?? null, phone ?? null, plate_number ?? null, spot_id ?? null, expire_date ?? null, new Date().toISOString(), req.params.id)
  const updated = db.prepare(`
    SELECT mr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM monthly_rental mr
    JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE mr.id = ?
  `).get(req.params.id)
  res.json({ success: true, data: updated })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const rental = db.prepare('SELECT * FROM monthly_rental WHERE id = ?').get(req.params.id)
  if (!rental) {
    res.status(404).json({ success: false, error: '月租记录未找到' })
    return
  }
  db.prepare('DELETE FROM monthly_rental WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

router.post('/:id/renew', (req: Request, res: Response): void => {
  const rental = db.prepare('SELECT * FROM monthly_rental WHERE id = ?').get(req.params.id) as any
  if (!rental) {
    res.status(404).json({ success: false, error: '月租记录未找到' })
    return
  }
  const currentExpire = new Date(rental.expire_date)
  const newExpire = new Date(currentExpire)
  newExpire.setMonth(newExpire.getMonth() + 1)
  db.prepare('UPDATE monthly_rental SET expire_date = ?, updated_at = ? WHERE id = ?')
    .run(newExpire.toISOString(), new Date().toISOString(), req.params.id)
  const updated = db.prepare(`
    SELECT mr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM monthly_rental mr
    JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE mr.id = ?
  `).get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
