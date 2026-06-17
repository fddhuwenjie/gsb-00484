import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Car, DollarSign, Clock, Users, Download, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function VsIndicator({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-xs text-slate-500">N/A</span>
  if (value === 0) return <span className="text-xs text-slate-400">持平</span>
  const isUp = value > 0
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  )
}

function MetricCard({
  icon: Icon,
  label,
  mainValue,
  subValue,
  vsValue,
  color,
  ratioBar,
}: {
  icon: any
  label: string
  mainValue: string | number
  subValue?: string
  vsValue?: number | null
  color: string
  ratioBar?: { monthly: number; temporary: number }
}) {
  return (
    <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
        {vsValue !== undefined && <VsIndicator value={vsValue} />}
      </div>
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-100 font-['Outfit']">{mainValue}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
      {ratioBar && (() => {
        const total = ratioBar.monthly + ratioBar.temporary
        const monthlyPct = total > 0 ? (ratioBar.monthly / total) * 100 : 50
        return (
          <div className="mt-3">
            <div className="h-2 w-full bg-[#2a2d3e] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${monthlyPct}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${100 - monthlyPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] text-slate-500">
              <span>月租车 {monthlyPct.toFixed(0)}%</span>
              <span>临时车 {(100 - monthlyPct).toFixed(0)}%</span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default function DailyReport() {
  const { dailyReport, loading, fetchDailyReport, exportDailyReport } = useAppStore()
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchDailyReport({ date: reportDate })
  }, [reportDate])

  const handleExport = async () => {
    try {
      const blob = await exportDailyReport({ date: reportDate })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-report-${reportDate}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  const hourlyFlow = dailyReport?.hourlyFlow?.map((h: any) => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    entries: h.entries || 0,
    exits: h.exits || 0,
  })) || []

  const topSpots = dailyReport?.topSpots || []
  const couponStats = dailyReport?.couponStats || []
  const monthly = dailyReport?.monthlyRatio?.monthly ?? 0
  const temporary = dailyReport?.monthlyRatio?.temporary ?? 0
  const vsYesterday = dailyReport?.vsYesterday || {}

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold">运营日报</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg px-3 py-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none"
            />
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            <Download size={16} />
            导出HTML
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Car}
          label="总进出车次"
          mainValue={dailyReport?.totalEntries ?? '-'}
          subValue={`出场 ${dailyReport?.totalExits ?? '-'}`}
          vsValue={vsYesterday.totalEntries}
          color="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          icon={DollarSign}
          label="总收入"
          mainValue={`¥${dailyReport?.totalRevenue ?? '0'}`}
          vsValue={vsYesterday.totalRevenue}
          color="bg-emerald-500/20 text-emerald-400"
        />
        <MetricCard
          icon={Clock}
          label="平均停车时长"
          mainValue={`${dailyReport?.avgDurationMinutes ?? '-'} 分钟`}
          vsValue={vsYesterday.avgDurationMinutes}
          color="bg-amber-500/20 text-amber-400"
        />
        <MetricCard
          icon={Users}
          label="月租车/临时车占比"
          mainValue={`${monthly}:${temporary}`}
          color="bg-purple-500/20 text-purple-400"
          ratioBar={{ monthly, temporary }}
        />
      </div>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <h3 className="text-base font-semibold mb-4">各时段车流量分布</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyFlow} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis
              dataKey="hour"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              interval={2}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="entries" name="进场" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="exits" name="出场" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">车位周转率 Top10</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-[#2a2d3e]">
                  <th className="text-left py-2 font-medium w-16">排名</th>
                  <th className="text-left py-2 font-medium">车位编号</th>
                  <th className="text-right py-2 font-medium">周转次数</th>
                </tr>
              </thead>
              <tbody>
                {topSpots.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                )}
                {topSpots.slice(0, 10).map((s: any, i: number) => (
                  <tr
                    key={s.spot_code || i}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30"
                  >
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                          i === 0
                            ? 'bg-amber-500/20 text-amber-400'
                            : i === 1
                            ? 'bg-slate-400/20 text-slate-300'
                            : i === 2
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-[#2a2d3e] text-slate-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-200">{s.spot_code}</td>
                    <td className="py-2.5 text-right text-emerald-400 font-medium">
                      {s.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">优惠券使用统计</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-[#2a2d3e]">
                  <th className="text-left py-2 font-medium">ID</th>
                  <th className="text-left py-2 font-medium">优惠券名称</th>
                  <th className="text-right py-2 font-medium">使用次数</th>
                </tr>
              </thead>
              <tbody>
                {couponStats.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                )}
                {couponStats.map((c: any) => (
                  <tr
                    key={c.coupon_id}
                    className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30"
                  >
                    <td className="py-2.5 text-slate-400 font-mono text-xs">
                      #{c.coupon_id}
                    </td>
                    <td className="py-2.5 text-slate-200">{c.coupon_name}</td>
                    <td className="py-2.5 text-right text-purple-400 font-medium">
                      {c.usageCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
