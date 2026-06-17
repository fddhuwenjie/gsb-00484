import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const lot = db.prepare('SELECT * FROM parking_lot LIMIT 1').get()
  if (!lot) {
    res.status(404).json({ success: false, error: '停车场信息未找到' })
    return
  }
  res.json({ success: true, data: lot })
})

router.put('/', (req: Request, res: Response): void => {
  const { name, address } = req.body
  if (!name && !address) {
    res.status(400).json({ success: false, error: '至少需要提供name或address' })
    return
  }
  const lot = db.prepare('SELECT * FROM parking_lot LIMIT 1').get() as any
  if (!lot) {
    res.status(404).json({ success: false, error: '停车场信息未找到' })
    return
  }
  const newName = name || lot.name
  const newAddress = address || lot.address
  db.prepare('UPDATE parking_lot SET name = ?, address = ?, updated_at = ? WHERE id = ?')
    .run(newName, newAddress, new Date().toISOString(), lot.id)
  const updated = db.prepare('SELECT * FROM parking_lot WHERE id = ?').get(lot.id)
  res.json({ success: true, data: updated })
})

export default router
