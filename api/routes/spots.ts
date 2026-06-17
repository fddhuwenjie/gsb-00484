import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { floor } = req.query
  let spots: any[]
  if (floor) {
    spots = db.prepare('SELECT * FROM parking_spot WHERE floor = ? ORDER BY floor, zone, number').all(Number(floor))
  } else {
    spots = db.prepare('SELECT * FROM parking_spot ORDER BY floor, zone, number').all()
  }
  res.json({ success: true, data: spots })
})

router.get('/:id', (req: Request, res: Response): void => {
  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(req.params.id)
  if (!spot) {
    res.status(404).json({ success: false, error: '车位未找到' })
    return
  }
  res.json({ success: true, data: spot })
})

router.put('/batch', (req: Request, res: Response): void => {
  const { updates } = req.body as { updates: Array<{ id: number; spot_type?: string; status?: string }> }
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ success: false, error: 'updates数组不能为空' })
    return
  }
  const now = new Date().toISOString()
  const updateStmt = db.prepare(
    'UPDATE parking_spot SET spot_type = COALESCE(?, spot_type), status = COALESCE(?, status), updated_at = ? WHERE id = ?'
  )
  const transaction = db.transaction(() => {
    const results: any[] = []
    for (const u of updates) {
      const info = updateStmt.run(u.spot_type ?? null, u.status ?? null, now, u.id)
      results.push({ id: u.id, changes: info.changes })
    }
    return results
  })
  const results = transaction()
  res.json({ success: true, data: results })
})

router.put('/:id', (req: Request, res: Response): void => {
  const { spot_type, status } = req.body
  if (!spot_type && !status) {
    res.status(400).json({ success: false, error: '至少需要提供spot_type或status' })
    return
  }
  const spot = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(req.params.id)
  if (!spot) {
    res.status(404).json({ success: false, error: '车位未找到' })
    return
  }
  db.prepare(
    'UPDATE parking_spot SET spot_type = COALESCE(?, spot_type), status = COALESCE(?, status), updated_at = ? WHERE id = ?'
  ).run(spot_type ?? null, status ?? null, new Date().toISOString(), req.params.id)
  const updated = db.prepare('SELECT * FROM parking_spot WHERE id = ?').get(req.params.id)
  res.json({ success: true, data: updated })
})

export default router
