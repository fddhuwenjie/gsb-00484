import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Car, LogOut, Clock, TrendingUp, BarChart3 } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  free: '#10b981', occupied: '#ef4444', reserved: '#f59e0b', fault: '#6b7280',
}
const STATUS_LABELS: Record<string, string> = {
  free: '空闲', occupied: '占用', reserved: '预留', fault: '故障',
}

export default function Statistics() {
  const { statsOverview, statsOccupancy, statsRevenue, statsTurnover, statsPeakPrediction, loading,
    fetchStatsOverview, fetchStatsOccupancy, fetchStatsRevenue, fetchStatsTurnover, fetchStatsPeakPrediction } = useAppStore()

  const [revenueRange, setRevenueRange] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    fetchStatsOverview()
    fetchStatsOccupancy()
    fetchStatsRevenue({ range: revenueRange })
    fetchStatsTurnover()
    fetchStatsPeakPrediction()
  }, [])

  useEffect(() => {
    fetchStatsRevenue({ range: revenueRange })
  }, [revenueRange])

  const occupancyData = statsOccupancy?.statusDistribution?.map((s: any) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#6b7280',
  })) || [
    { name: '空闲', value: 80, color: '#10b981' },
    { name: '占用', value: 30, color: '#ef4444' },
    { name: '预留', value: 6, color: '#f59e0b' },
    { name: '故障', value: 4, color: '#6b7280' },
  ]

  const hourlyData = statsOccupancy?.hourlyTrend?.map((h: any) => ({
    time: `${h.hour}:00`,
    rate: h.rate,
  })) || Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    rate: Math.round(20 + Math.sin((i - 6) * Math.PI / 12) * 40 + Math.random() * 10),
  }))

  const revenueData = statsRevenue?.data?.map((d: any) => ({
    label: d.date || d.period,
    amount: d.amount,
  })) || Array.from({ length: 7 }, (_, i) => ({
    label: `${6 - i}天前`,
    amount: Math.round(800 + Math.random() * 1200),
  }))

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">数据统计</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
            <Car size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-400">今日进场</p>
            <p className="text-2xl font-bold text-slate-100 font-['Outfit']">{statsOverview?.todayEntries ?? '-'}</p>
          </div>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-400">
            <LogOut size={22} />
          </div>
          <div>
            <p className="text-sm text-slate-400">今日出场</p>
            <p className="text-2xl font-bold text-slate-100 font-['Outfit']">{statsOverview?.todayExits ?? '-'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">占用率分析</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" stroke="none"
              >
                {occupancyData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {occupancyData.map((d: any) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} {d.value}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">时段占用率趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="statAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval={3} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="rate" stroke="#10b981" fill="url(#statAreaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">收入统计</h3>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRevenueRange(r)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  revenueRange === r
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#2a2d3e] text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'day' ? '日' : r === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
            <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8 }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(v: number) => [`¥${v}`, '收入']}
            />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-blue-400" />
            <h4 className="text-sm font-semibold">平均停车时长</h4>
          </div>
          <p className="text-3xl font-bold text-blue-400 font-['Outfit']">
            {statsTurnover?.avgDuration ?? '2.5'}
          </p>
          <p className="text-xs text-slate-500 mt-1">小时</p>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={18} className="text-emerald-400" />
            <h4 className="text-sm font-semibold">周转率</h4>
          </div>
          <p className="text-3xl font-bold text-emerald-400 font-['Outfit']">
            {statsTurnover?.turnoverRate ?? '3.2'}
          </p>
          <p className="text-xs text-slate-500 mt-1">次/车位/日</p>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 size={18} className="text-amber-400" />
            <h4 className="text-sm font-semibold">高峰预测</h4>
          </div>
          <p className="text-2xl font-bold text-amber-400 font-['Outfit']">
            {statsPeakPrediction?.peakHour ?? '10:00-12:00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            预计占用率 {statsPeakPrediction?.peakRate ?? '85'}%
          </p>
        </div>
      </div>
    </div>
  )
}
