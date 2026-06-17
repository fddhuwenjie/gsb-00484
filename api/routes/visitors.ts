import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const visitors = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM visitor_registrations vr
    LEFT JOIN monthly_rental mr ON vr.host_plate = mr.plate_number
    LEFT JOIN parking_spot ps ON mr.spot_id = ps.id
    ORDER BY vr.created_at DESC
  `).all()
  res.json({ success: true, data: visitors })
})

router.post('/', (req: Request, res: Response): void => {
  const { visitor_name, visitor_phone, purpose, host_plate, expected_arrival, expected_duration } = req.body
  if (!visitor_name || !visitor_phone || !purpose || !host_plate || !expected_arrival || !expected_duration) {
    res.status(400).json({ success: false, error: '缺少必要字段' })
    return
  }

  const rental = db.prepare('SELECT * FROM monthly_rental WHERE plate_number = ?').get(host_plate) as any
  if (!rental) {
    res.status(400).json({ success: false, error: '访客车牌不存在于月租记录中' })
    return
  }

  let pass_code: string
  do {
    pass_code = String(Math.floor(100000 + Math.random() * 900000))
  } while (db.prepare('SELECT id FROM visitor_registrations WHERE pass_code = ?').get(pass_code))

  const info = db.prepare(
    'INSERT INTO visitor_registrations (visitor_name, visitor_phone, purpose, host_plate, expected_arrival, expected_duration, pass_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(visitor_name, visitor_phone, purpose, host_plate, expected_arrival, expected_duration, pass_code, 'pending')

  const visitor = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM visitor_registrations vr
    LEFT JOIN monthly_rental mr ON vr.host_plate = mr.plate_number
    LEFT JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE vr.id = ?
  `).get(info.lastInsertRowid)

  res.json({ success: true, data: visitor })
})

router.put('/:id/approve', (req: Request, res: Response): void => {
  const visitor = db.prepare('SELECT * FROM visitor_registrations WHERE id = ?').get(req.params.id)
  if (!visitor) {
    res.status(404).json({ success: false, error: '访客登记未找到' })
    return
  }

  db.prepare('UPDATE visitor_registrations SET status = ?, updated_at = ? WHERE id = ?')
    .run('approved', new Date().toISOString(), req.params.id)

  const updated = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM visitor_registrations vr
    LEFT JOIN monthly_rental mr ON vr.host_plate = mr.plate_number
    LEFT JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE vr.id = ?
  `).get(req.params.id)

  res.json({ success: true, data: updated })
})

router.put('/:id/reject', (req: Request, res: Response): void => {
  const visitor = db.prepare('SELECT * FROM visitor_registrations WHERE id = ?').get(req.params.id)
  if (!visitor) {
    res.status(404).json({ success: false, error: '访客登记未找到' })
    return
  }

  db.prepare('UPDATE visitor_registrations SET status = ?, updated_at = ? WHERE id = ?')
    .run('expired', new Date().toISOString(), req.params.id)

  const updated = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM visitor_registrations vr
    LEFT JOIN monthly_rental mr ON vr.host_plate = mr.plate_number
    LEFT JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE vr.id = ?
  `).get(req.params.id)

  res.json({ success: true, data: updated })
})

router.post('/entry', (req: Request, res: Response): void => {
  const { pass_code } = req.body
  if (!pass_code) {
    res.status(400).json({ success: false, error: '通行码不能为空' })
    return
  }

  const visitor = db.prepare('SELECT * FROM visitor_registrations WHERE pass_code = ?').get(pass_code) as any
  if (!visitor) {
    res.status(404).json({ success: false, error: '通行码无效' })
    return
  }

  if (visitor.status !== 'approved') {
    res.status(400).json({ success: false, error: '访客未获批准' })
    return
  }

  const arrivalTime = new Date(visitor.expected_arrival).getTime()
  const now = Date.now()
  const oneHour = 3600000
  if (now < arrivalTime - oneHour || now > arrivalTime + oneHour) {
    res.status(400).json({ success: false, error: '通行码不在有效时间范围内' })
    return
  }

  const freeSpot = db.prepare("SELECT * FROM parking_spot WHERE status = 'free' LIMIT 1").get() as any
  if (!freeSpot) {
    res.status(400).json({ success: false, error: '当前无空闲车位' })
    return
  }

  const plateNumber = `VISITOR-${pass_code}`

  const transaction = db.transaction(() => {
    const nowIso = new Date().toISOString()
    db.prepare(
      'INSERT INTO vehicle_record (plate_number, spot_id, entry_time, is_monthly) VALUES (?, ?, ?, ?)'
    ).run(plateNumber, freeSpot.id, nowIso, 0)
    db.prepare('UPDATE parking_spot SET status = ?, updated_at = ? WHERE id = ?').run('occupied', nowIso, freeSpot.id)
  })

  transaction()

  const updatedSpot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(freeSpot.id)

  res.json({ success: true, data: { visitor, spot: updatedSpot } })
})

router.put('/:id', (req: Request, res: Response): void => {
  const visitor = db.prepare('SELECT * FROM visitor_registrations WHERE id = ?').get(req.params.id)
  if (!visitor) {
    res.status(404).json({ success: false, error: '访客登记未找到' })
    return
  }

  const { visitor_name, visitor_phone, purpose, host_plate, expected_arrival, expected_duration } = req.body
  db.prepare(`
    UPDATE visitor_registrations SET
      visitor_name = COALESCE(?, visitor_name),
      visitor_phone = COALESCE(?, visitor_phone),
      purpose = COALESCE(?, purpose),
      host_plate = COALESCE(?, host_plate),
      expected_arrival = COALESCE(?, expected_arrival),
      expected_duration = COALESCE(?, expected_duration),
      updated_at = ?
    WHERE id = ?
  `).run(
    visitor_name ?? null,
    visitor_phone ?? null,
    purpose ?? null,
    host_plate ?? null,
    expected_arrival ?? null,
    expected_duration ?? null,
    new Date().toISOString(),
    req.params.id
  )

  const updated = db.prepare(`
    SELECT vr.*, ps.spot_code, ps.floor, ps.zone, ps.number
    FROM visitor_registrations vr
    LEFT JOIN monthly_rental mr ON vr.host_plate = mr.plate_number
    LEFT JOIN parking_spot ps ON mr.spot_id = ps.id
    WHERE vr.id = ?
  `).get(req.params.id)

  res.json({ success: true, data: updated })
})

router.delete('/:id', (req: Request, res: Response): void => {
  const visitor = db.prepare('SELECT * FROM visitor_registrations WHERE id = ?').get(req.params.id)
  if (!visitor) {
    res.status(404).json({ success: false, error: '访客登记未找到' })
    return
  }
  db.prepare('DELETE FROM visitor_registrations WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
