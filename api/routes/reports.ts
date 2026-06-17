import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

function getDailyReportData(date: string) {
  const dayStart = `${date}T00:00:00.000Z`
  const dayEnd = `${date}T23:59:59.999Z`

  const totalEntries = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time <= ?'
  ).get(dayStart, dayEnd) as any).count

  const totalExits = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL'
  ).get(dayStart, dayEnd) as any).count

  const revenueRow = (db.prepare(
    'SELECT COALESCE(SUM(fee), 0) as total FROM vehicle_record WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL'
  ).get(dayStart, dayEnd) as any)
  const totalRevenue = Math.round(revenueRow.total * 100) / 100

  const avgDurationRow = (db.prepare(
    'SELECT AVG((julianday(exit_time) - julianday(entry_time)) * 24 * 60) as avg_minutes FROM vehicle_record WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL'
  ).get(dayStart, dayEnd) as any)
  const avgDurationMinutes = avgDurationRow.avg_minutes ? Math.round(avgDurationRow.avg_minutes * 100) / 100 : 0

  const hourlyFlow: Array<{ hour: number; entries: number; exits: number }> = []
  for (let h = 0; h < 24; h++) {
    const hourStart = `${date}T${String(h).padStart(2, '0')}:00:00.000Z`
    const hourEnd = h < 23
      ? `${date}T${String(h + 1).padStart(2, '0')}:00:00.000Z`
      : `${date}T23:59:59.999Z`

    const entries = (db.prepare(
      'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time < ?'
    ).get(hourStart, hourEnd) as any).count

    const exits = (db.prepare(
      'SELECT COUNT(*) as count FROM vehicle_record WHERE exit_time >= ? AND exit_time < ? AND exit_time IS NOT NULL'
    ).get(hourStart, hourEnd) as any).count

    hourlyFlow.push({ hour: h, entries, exits })
  }

  const topSpots = db.prepare(`
    SELECT ps.spot_code, COUNT(*) as count
    FROM vehicle_record vr
    JOIN parking_spot ps ON vr.spot_id = ps.id
    WHERE (vr.entry_time >= ? AND vr.entry_time <= ?)
       OR (vr.exit_time >= ? AND vr.exit_time <= ? AND vr.exit_time IS NOT NULL)
    GROUP BY vr.spot_id
    ORDER BY count DESC
    LIMIT 10
  `).all(dayStart, dayEnd, dayStart, dayEnd) as any[]

  const monthlyCount = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time <= ? AND is_monthly = 1'
  ).get(dayStart, dayEnd) as any).count

  const temporaryCount = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time <= ? AND is_monthly = 0'
  ).get(dayStart, dayEnd) as any).count

  const monthlyRatio = { monthly: monthlyCount, temporary: temporaryCount }

  const couponStats = db.prepare(`
    SELECT vr.coupon_id, c.name as coupon_name, COUNT(*) as usageCount
    FROM vehicle_record vr
    JOIN coupon c ON vr.coupon_id = c.id
    WHERE vr.coupon_id IS NOT NULL AND vr.exit_time >= ? AND vr.exit_time <= ?
    GROUP BY vr.coupon_id
  `).all(dayStart, dayEnd) as any[]

  const prevDate = new Date(date)
  prevDate.setDate(prevDate.getDate() - 1)
  const prevDateStr = prevDate.toISOString().split('T')[0]
  const prevDayStart = `${prevDateStr}T00:00:00.000Z`
  const prevDayEnd = `${prevDateStr}T23:59:59.999Z`

  const prevEntries = (db.prepare(
    'SELECT COUNT(*) as count FROM vehicle_record WHERE entry_time >= ? AND entry_time <= ?'
  ).get(prevDayStart, prevDayEnd) as any).count

  const prevRevenueRow = (db.prepare(
    'SELECT COALESCE(SUM(fee), 0) as total FROM vehicle_record WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL'
  ).get(prevDayStart, prevDayEnd) as any)
  const prevRevenue = prevRevenueRow.total

  const prevAvgDurationRow = (db.prepare(
    'SELECT AVG((julianday(exit_time) - julianday(entry_time)) * 24 * 60) as avg_minutes FROM vehicle_record WHERE exit_time >= ? AND exit_time <= ? AND exit_time IS NOT NULL'
  ).get(prevDayStart, prevDayEnd) as any)
  const prevAvgDuration = prevAvgDurationRow.avg_minutes || 0

  const calcChange = (today: number, yesterday: number): number | null => {
    if (yesterday === 0) return null
    return Math.round(((today - yesterday) / yesterday) * 10000) / 100
  }

  const vsYesterday = {
    totalEntries: calcChange(totalEntries, prevEntries),
    totalRevenue: calcChange(totalRevenue, prevRevenue),
    avgDurationMinutes: calcChange(avgDurationMinutes, prevAvgDuration)
  }

  return {
    date,
    totalEntries,
    totalExits,
    totalRevenue,
    avgDurationMinutes,
    hourlyFlow,
    topSpots,
    monthlyRatio,
    couponStats,
    vsYesterday
  }
}

router.get('/daily', (req: Request, res: Response): void => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
    const data = getDailyReportData(date)
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.get('/daily/export', (req: Request, res: Response): void => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0]
    const data = getDailyReportData(date)

    const formatChange = (val: number | null) => {
      if (val === null) return '<span style="color:#6b7280">N/A</span>'
      if (val > 0) return `<span style="color:#ef4444">▲ ${val}%</span>`
      if (val < 0) return `<span style="color:#10b981">▼ ${Math.abs(val)}%</span>`
      return '<span style="color:#6b7280">— 0%</span>'
    }

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>日报 - ${data.date}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f1117; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; }
h1 { font-size: 24px; margin-bottom: 8px; color: #f1f5f9; }
.subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.card { background: #1a1d2e; border-radius: 12px; padding: 20px; }
.card .label { font-size: 12px; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.card .value { font-size: 28px; font-weight: 700; color: #f1f5f9; }
.card .value .accent { color: #10b981; }
.card .change { font-size: 12px; margin-top: 8px; }
.section { background: #1a1d2e; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.section h2 { font-size: 16px; color: #f1f5f9; margin-bottom: 16px; border-left: 3px solid #10b981; padding-left: 12px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 12px; color: #94a3b8; padding: 10px 12px; border-bottom: 1px solid #2d3148; text-transform: uppercase; letter-spacing: 0.5px; }
td { font-size: 14px; padding: 10px 12px; border-bottom: 1px solid #2d3148; color: #cbd5e1; }
tr:last-child td { border-bottom: none; }
.flow-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.flow-item { background: #0f1117; border-radius: 8px; padding: 12px; text-align: center; }
.flow-item .hour { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.flow-item .count { font-size: 16px; font-weight: 600; color: #f1f5f9; }
.flow-item .in { color: #10b981; }
.flow-item .out { color: #f59e0b; }
.ratio-bar { display: flex; height: 24px; border-radius: 12px; overflow: hidden; margin-top: 12px; }
.ratio-monthly { background: #10b981; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; min-width: 40px; }
.ratio-temporary { background: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; min-width: 40px; }
.legend { display: flex; gap: 20px; margin-top: 12px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #94a3b8; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
</style>
</head>
<body>
<h1>停车场运营日报</h1>
<p class="subtitle">报告日期：${data.date}</p>

<div class="cards">
  <div class="card">
    <div class="label">入场车辆</div>
    <div class="value">${data.totalEntries}</div>
    <div class="change">较昨日 ${formatChange(data.vsYesterday.totalEntries)}</div>
  </div>
  <div class="card">
    <div class="label">出场车辆</div>
    <div class="value">${data.totalExits}</div>
  </div>
  <div class="card">
    <div class="label">总收入 (元)</div>
    <div class="value"><span class="accent">¥${data.totalRevenue.toFixed(2)}</span></div>
    <div class="change">较昨日 ${formatChange(data.vsYesterday.totalRevenue)}</div>
  </div>
  <div class="card">
    <div class="label">平均停车时长 (分钟)</div>
    <div class="value">${data.avgDurationMinutes}</div>
    <div class="change">较昨日 ${formatChange(data.vsYesterday.avgDurationMinutes)}</div>
  </div>
</div>

<div class="section">
  <h2>每小时流量</h2>
  <div class="flow-grid">
    ${data.hourlyFlow.map(h => `<div class="flow-item"><div class="hour">${String(h.hour).padStart(2, '0')}:00</div><div class="count in">↑${h.entries}</div><div class="count out">↓${h.exits}</div></div>`).join('')}
  </div>
</div>

<div class="section">
  <h2>热门车位 TOP 10</h2>
  <table>
    <thead><tr><th>排名</th><th>车位编号</th><th>使用次数</th></tr></thead>
    <tbody>
      ${data.topSpots.map((s, i) => `<tr><td>${i + 1}</td><td>${s.spot_code}</td><td>${s.count}</td></tr>`).join('')}
      ${data.topSpots.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#6b7280;">暂无数据</td></tr>' : ''}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>月租 / 临时比例</h2>
  <div style="display:flex;gap:32px;align-items:center;">
    <div style="font-size:14px;color:#cbd5e1;">月租车辆：<strong style="color:#10b981">${data.monthlyRatio.monthly}</strong> 辆</div>
    <div style="font-size:14px;color:#cbd5e1;">临时车辆：<strong style="color:#3b82f6">${data.monthlyRatio.temporary}</strong> 辆</div>
  </div>
  <div class="ratio-bar">
    ${data.monthlyRatio.monthly + data.monthlyRatio.temporary > 0 ? `<div class="ratio-monthly" style="width:${(data.monthlyRatio.monthly / (data.monthlyRatio.monthly + data.monthlyRatio.temporary) * 100).toFixed(1)}%">月租</div><div class="ratio-temporary" style="width:${(data.monthlyRatio.temporary / (data.monthlyRatio.monthly + data.monthlyRatio.temporary) * 100).toFixed(1)}%">临时</div>` : '<div style="width:100%;text-align:center;color:#6b7280;font-size:13px;">暂无数据</div>'}
  </div>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>月租</div>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>临时</div>
  </div>
</div>

<div class="section">
  <h2>优惠券使用统计</h2>
  <table>
    <thead><tr><th>优惠券ID</th><th>优惠券名称</th><th>使用次数</th></tr></thead>
    <tbody>
      ${data.couponStats.map(c => `<tr><td>${c.coupon_id}</td><td>${c.coupon_name}</td><td>${c.usageCount}</td></tr>`).join('')}
      ${data.couponStats.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#6b7280;">暂无数据</td></tr>' : ''}
    </tbody>
  </table>
</div>

</body>
</html>`

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="daily-report-${data.date}.html"`)
    res.send(html)
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
