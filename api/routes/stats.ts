import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/overview', (req: Request, res: Response): void => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const entryCount = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ?'
  ).get(todayStr) as any).count

  const exitCount = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE exit_time >= ? AND exit_time IS NOT NULL'
  ).get(todayStr) as any).count

  const totalSpots = (db.prepare('SELECT total_spots FROM parking_lot LIMIT 1').get() as any).total_spots
  const occupiedSpots = (db.prepare("SELECT COUNT(*) as count FROM parking_spot WHERE status = 'occupied'").get() as any).count
  const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 10000) / 100 : 0

  const revenueRow = db.prepare('SELECT COALESCE(SUM(fee), 0) as total FROM vehicle_record WHERE exit_time >= ? AND exit_time IS NOT NULL').get(todayStr) as any
  const todayRevenue = Math.round(revenueRow.total * 100) / 100

  res.json({
    success: true,
    data: { entryCount, exitCount, occupancyRate, todayRevenue, occupiedSpots, totalSpots }
  })
})

router.get('/occupancy', (req: Request, res: Response): void => {
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM parking_spot GROUP BY status
  `).all() as any[]

  const statusMap: Record<string, number> = {}
  for (const s of statusCounts) {
    statusMap[s.status] = s.count
  }

  const hourlyData: Array<{ hour: number; entries: number; exits: number }> = []
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  for (let h = 0; h < 24; h++) {
    const hourStart = new Date(todayStart)
    hourStart.setHours(h, 0, 0, 0)
    const hourEnd = new Date(todayStart)
    hourEnd.setHours(h + 1, 0, 0, 0)

    const entries = (db.prepare(
      'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time < ?'
    ).get(hourStart.toISOString(), hourEnd.toISOString()) as any).count

    const exits = (db.prepare(
      'SELECT COUNT(*) as count FROM vehicle_record WHERE exit_time >= ? AND exit_time < ? AND exit_time IS NOT NULL'
    ).get(hourStart.toISOString(), hourEnd.toISOString()) as any).count

    hourlyData.push({ hour: h, entries, exits })
  }

  res.json({ success: true, data: { statusMap, hourlyTrend: hourlyData } })
})

router.get('/revenue', (req: Request, res: Response): void => {
  const period = req.query.period || 'day'
  const now = new Date()
  let startDate: Date

  if (period === 'week') {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 7)
  } else if (period === 'month') {
    startDate = new Date(now)
    startDate.setDate(startDate.getDate() - 30)
  } else {
    startDate = new Date(now)
    startDate.setHours(0, 0, 0, 0)
  }

  const totalRevenue = (db.prepare(
    'SELECT COALESCE(SUM(fee), 0) as total FROM vehicle_record WHERE exit_time >= ? AND exit_time IS NOT NULL'
  ).get(startDate.toISOString()) as any).total

  const dailyRevenue = db.prepare(`
    SELECT DATE(exit_time) as date, SUM(fee) as revenue, COUNT(*) as count
    FROM vehicle_record
    WHERE exit_time >= ? AND exit_time IS NOT NULL
    GROUP BY DATE(exit_time)
    ORDER BY date DESC
  `).all(startDate.toISOString()) as any[]

  res.json({
    success: true,
    data: {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      dailyRevenue: dailyRevenue.map(d => ({ ...d, revenue: Math.round(d.revenue * 100) / 100 }))
    }
  })
})

router.get('/turnover', (req: Request, res: Response): void => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const totalSpots = (db.prepare('SELECT total_spots FROM parking_lot LIMIT 1').get() as any).total_spots
  const exitCount = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE exit_time >= ? AND exit_time IS NOT NULL'
  ).get(todayStr) as any).count

  const turnoverRate = totalSpots > 0 ? Math.round((exitCount / totalSpots) * 10000) / 100 : 0

  const avgDuration = db.prepare(`
    SELECT AVG(
      (julianday(exit_time) - julianday(entry_time)) * 24 * 60
    ) as avg_minutes
    FROM vehicle_record
    WHERE exit_time >= ? AND exit_time IS NOT NULL
  `).get(todayStr) as any

  const avgMinutes = avgDuration.avg_minutes ? Math.round(avgDuration.avg_minutes) : 0

  res.json({
    success: true,
    data: { turnoverRate, exitCount, totalSpots, avgDurationMinutes: avgMinutes }
  })
})

router.get('/peak-prediction', (req: Request, res: Response): void => {
  const hourlyEntry = db.prepare(`
    SELECT
      CAST(strftime('%H', entry_time) AS INTEGER) as hour,
      COUNT(*) as count
    FROM vehicle_record
    GROUP BY hour
    ORDER BY count DESC
  `).all() as any[]

  const peakHours = hourlyEntry.slice(0, 3).map(h => h.hour)
  const allHours = hourlyEntry.map(h => ({ hour: h.hour, entryCount: h.count }))

  let prediction = '当前数据不足，暂无预测'
  if (hourlyEntry.length >= 3) {
    const topHour = hourlyEntry[0].hour
    prediction = `根据历史数据，高峰时段预计在 ${String(topHour).padStart(2, '0')}:00 前后，建议提前安排车位`
  }

  res.json({
    success: true,
    data: { peakHours, hourlyDistribution: allHours, prediction }
  })
})

export default router
