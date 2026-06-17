import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/records', (req: Request, res: Response): void => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 20
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as count FROM plate_records').get() as any).count
  const records = db.prepare(
    'SELECT * FROM plate_records ORDER BY recognized_at DESC LIMIT ? OFFSET ?'
  ).all(pageSize, offset)

  res.json({
    success: true,
    data: { records, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }
  })
})

router.post('/records', (req: Request, res: Response): void => {
  const { plate_number, confidence, image_path, operation } = req.body
  if (!plate_number) {
    res.status(400).json({ success: false, error: '车牌号不能为空' })
    return
  }

  const blacklisted = db.prepare(
    "SELECT * FROM plate_blacklist WHERE plate_number = ? AND status = 'active'"
  ).get(plate_number) as any
  if (blacklisted) {
    res.status(403).json({ success: false, error: '该车牌在黑名单中，禁止入场', blacklist: true })
    return
  }

  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO plate_records (plate_number, recognized_at, confidence, image_path, operation) VALUES (?, ?, ?, ?, ?)'
  ).run(plate_number, now, confidence ?? 0, image_path ?? null, operation ?? 'entry')
  const record = db.prepare('SELECT * FROM plate_records WHERE id = ?').get(info.lastInsertRowid)

  res.json({ success: true, data: record })
})

router.get('/blacklist', (req: Request, res: Response): void => {
  const records = db.prepare(
    'SELECT * FROM plate_blacklist ORDER BY added_at DESC'
  ).all()
  res.json({ success: true, data: records })
})

router.post('/blacklist', (req: Request, res: Response): void => {
  const { plate_number, reason, operator } = req.body
  if (!plate_number || !reason) {
    res.status(400).json({ success: false, error: '车牌号和原因不能为空' })
    return
  }

  const existing = db.prepare(
    "SELECT * FROM plate_blacklist WHERE plate_number = ? AND status = 'active'"
  ).get(plate_number) as any
  if (existing) {
    res.status(400).json({ success: false, error: '该车牌已在黑名单中' })
    return
  }

  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO plate_blacklist (plate_number, reason, added_at, operator, status) VALUES (?, ?, ?, ?, ?)'
  ).run(plate_number, reason, now, operator || '管理员', 'active')
  const record = db.prepare('SELECT * FROM plate_blacklist WHERE id = ?').get(info.lastInsertRowid)

  res.json({ success: true, data: record })
})

router.put('/blacklist/:id/remove', (req: Request, res: Response): void => {
  const record = db.prepare('SELECT * FROM plate_blacklist WHERE id = ?').get(req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: '黑名单记录未找到' })
    return
  }

  const now = new Date().toISOString()
  db.prepare("UPDATE plate_blacklist SET status = 'removed' WHERE id = ?").run(req.params.id)
  const updated = db.prepare('SELECT * FROM plate_blacklist WHERE id = ?').get(req.params.id)

  res.json({ success: true, data: updated })
})

router.get('/whitelist', (req: Request, res: Response): void => {
  const now = new Date().toISOString()
  const records = db.prepare(
    'SELECT plate_number, name AS owner_name, phone, expire_date, spot_id FROM monthly_rental WHERE expire_date >= ?'
  ).all(now)
  res.json({ success: true, data: records })
})

router.get('/whitelist/status', (req: Request, res: Response): void => {
  const total = (db.prepare('SELECT COUNT(*) as count FROM monthly_rental').get() as any).count
  const now = new Date().toISOString()
  const active = (db.prepare('SELECT COUNT(*) as count FROM monthly_rental WHERE expire_date >= ?').get(now) as any).count
  const recentlyAdded = db.prepare(
    'SELECT * FROM monthly_rental ORDER BY created_at DESC LIMIT 1'
  ).get() as any

  res.json({
    success: true,
    data: {
      total,
      active,
      inactive: total - active,
      recentlySynced: recentlyAdded || null
    }
  })
})

export default router
