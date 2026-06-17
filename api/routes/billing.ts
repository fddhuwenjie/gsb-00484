import { Router, type Request, type Response } from 'express'
import db from '../database.js'
import { calculateFee } from './vehicles.js'

const router = Router()

router.get('/billing/rules', (req: Request, res: Response): void => {
  const rules = db.prepare('SELECT * FROM billing_rule ORDER BY id').all()
  res.json({ success: true, data: rules })
})

router.put('/billing/rules/:id', (req: Request, res: Response): void => {
  const { free_minutes, hourly_rate, daily_cap, charging_fee, description } = req.body
  const rule = db.prepare('SELECT * FROM billing_rule WHERE id = ?').get(req.params.id)
  if (!rule) {
    res.status(404).json({ success: false, error: '计费规则未找到' })
    return
  }
  db.prepare(`
    UPDATE billing_rule SET
      free_minutes = COALESCE(?, free_minutes),
      hourly_rate = COALESCE(?, hourly_rate),
      daily_cap = COALESCE(?, daily_cap),
      charging_fee = COALESCE(?, charging_fee),
      description = COALESCE(?, description),
      updated_at = ?
    WHERE id = ?
  `).run(
    free_minutes ?? null, hourly_rate ?? null, daily_cap ?? null,
    charging_fee ?? null, description ?? null, new Date().toISOString(), req.params.id
  )
  const updated = db.prepare('SELECT * FROM billing_rule WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.post('/billing/calculate', (req: Request, res: Response): void => {
  const { plate_number, entry_time, spot_type, coupon_id } = req.body
  if (!entry_time || !spot_type) {
    res.status(400).json({ success: false, error: 'entry_time和spot_type不能为空' })
    return
  }
  const { fee, details } = calculateFee(spot_type, entry_time, coupon_id)
  res.json({ success: true, data: { fee, details, plate_number, entry_time, spot_type } })
})

router.get('/coupons', (req: Request, res: Response): void => {
  const coupons = db.prepare('SELECT * FROM coupon ORDER BY id').all()
  res.json({ success: true, data: coupons })
})

router.post('/coupons', (req: Request, res: Response): void => {
  const { name, type, value, min_amount, valid_from, valid_to } = req.body
  if (!name || !type || value === undefined || !valid_from || !valid_to) {
    res.status(400).json({ success: false, error: '缺少必要字段' })
    return
  }
  const info = db.prepare(
    'INSERT INTO coupon (name, type, value, min_amount, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, type, value, min_amount || 0, valid_from, valid_to)
  const coupon = db.prepare('SELECT * FROM coupon WHERE id = ?').get(info.lastInsertRowid)
  res.json({ success: true, data: coupon })
})

router.put('/coupons/:id', (req: Request, res: Response): void => {
  const coupon = db.prepare('SELECT * FROM coupon WHERE id = ?').get(req.params.id)
  if (!coupon) {
    res.status(404).json({ success: false, error: '优惠券未找到' })
    return
  }
  const { name, type, value, min_amount, valid_from, valid_to } = req.body
  db.prepare(`
    UPDATE coupon SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      value = COALESCE(?, value),
      min_amount = COALESCE(?, min_amount),
      valid_from = COALESCE(?, valid_from),
      valid_to = COALESCE(?, valid_to)
    WHERE id = ?
  `).run(name ?? null, type ?? null, value ?? null, min_amount ?? null, valid_from ?? null, valid_to ?? null, req.params.id)
  const updated = db.prepare('SELECT * FROM coupon WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.delete('/coupons/:id', (req: Request, res: Response): void => {
  const coupon = db.prepare('SELECT * FROM coupon WHERE id = ?').get(req.params.id)
  if (!coupon) {
    res.status(404).json({ success: false, error: '优惠券未找到' })
    return
  }
  db.prepare('DELETE FROM coupon WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

router.get('/pricing-rules', (req: Request, res: Response): void => {
  const rules = db.prepare('SELECT * FROM pricing_rules ORDER BY priority DESC').all()
  res.json({ success: true, data: rules })
})

router.post('/pricing-rules', (req: Request, res: Response): void => {
  const { rule_name, date_start, date_end, time_start, time_end, rate_multiplier, spot_type, priority } = req.body
  if (!rule_name || !time_start || !time_end || rate_multiplier === undefined) {
    res.status(400).json({ success: false, error: '缺少必要字段：rule_name, time_start, time_end, rate_multiplier' })
    return
  }
  const info = db.prepare(
    `INSERT INTO pricing_rules (rule_name, date_start, date_end, time_start, time_end, rate_multiplier, spot_type, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    rule_name,
    date_start ?? null,
    date_end ?? null,
    time_start,
    time_end,
    rate_multiplier,
    spot_type ?? 'all',
    priority ?? 0
  )
  const rule = db.prepare('SELECT * FROM pricing_rules WHERE id = ?').get(info.lastInsertRowid)
  res.json({ success: true, data: rule })
})

router.put('/pricing-rules/:id', (req: Request, res: Response): void => {
  const rule = db.prepare('SELECT * FROM pricing_rules WHERE id = ?').get(req.params.id)
  if (!rule) {
    res.status(404).json({ success: false, error: '定价规则未找到' })
    return
  }
  const { rule_name, date_start, date_end, time_start, time_end, rate_multiplier, spot_type, priority } = req.body
  
  const existing = rule as any
  const newDateStart = 'date_start' in req.body ? date_start : existing.date_start
  const newDateEnd = 'date_end' in req.body ? date_end : existing.date_end
  
  db.prepare(`
    UPDATE pricing_rules SET
      rule_name = COALESCE(?, rule_name),
      date_start = ?,
      date_end = ?,
      time_start = COALESCE(?, time_start),
      time_end = COALESCE(?, time_end),
      rate_multiplier = COALESCE(?, rate_multiplier),
      spot_type = COALESCE(?, spot_type),
      priority = COALESCE(?, priority),
      updated_at = ?
    WHERE id = ?
  `).run(
    rule_name ?? null,
    newDateStart,
    newDateEnd,
    time_start ?? null,
    time_end ?? null,
    rate_multiplier ?? null,
    spot_type ?? null,
    priority ?? null,
    new Date().toISOString(),
    req.params.id
  )
  const updated = db.prepare('SELECT * FROM pricing_rules WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

router.delete('/pricing-rules/:id', (req: Request, res: Response): void => {
  const rule = db.prepare('SELECT * FROM pricing_rules WHERE id = ?').get(req.params.id)
  if (!rule) {
    res.status(404).json({ success: false, error: '定价规则未找到' })
    return
  }
  db.prepare('DELETE FROM pricing_rules WHERE id = ?').run(req.params.id)
  res.json({ success: true, data: null })
})

export default router
