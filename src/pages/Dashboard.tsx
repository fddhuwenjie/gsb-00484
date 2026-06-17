import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { Car, LogOut, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  free: '#10b981',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  fault: '#6b7280',
}

const STATUS_LABELS: Record<string, string> = {
  free: '空闲',
  occupied: '占用',
  reserved: '预留',
  fault: '故障',
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-100 font-['Outfit']">{value}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { statsOverview, statsOccupancy, vehicleRecords, expiringRentals, loading, pendingAlertsCount,
    fetchStatsOverview, fetchStatsOccupancy, fetchVehicleRecords, fetchExpiringRentals, fetchPendingAlertsCount } = useAppStore()

  useEffect(() => {
    fetchStatsOverview()
    fetchStatsOccupancy()
    fetchVehicleRecords({ limit: 10 })
    fetchExpiringRentals()
    fetchPendingAlertsCount()
  }, [])

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

  const records = vehicleRecords?.slice(0, 10) || []

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">总览仪表盘</h2>
        <button
          onClick={() => navigate('/alert-center')}
          className="relative p-2 rounded-lg bg-[#1a1d2e] border border-[#2a2d3e] hover:bg-[#2a2d3e]/50 transition-colors"
          title="未处理告警"
        >
          <AlertTriangle size={18} className="text-amber-400" />
          {pendingAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {pendingAlertsCount > 99 ? '99+' : pendingAlertsCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard icon={Car} label="今日进场" value={statsOverview?.todayEntries ?? '-'} color="bg-blue-500/20 text-blue-400" />
        <MetricCard icon={LogOut} label="今日出场" value={statsOverview?.todayExits ?? '-'} color="bg-emerald-500/20 text-emerald-400" />
        <MetricCard icon={TrendingUp} label="在场车辆" value={statsOverview?.presentVehicles ?? '-'} color="bg-amber-500/20 text-amber-400" />
        <MetricCard icon={DollarSign} label="今日收入" value={`¥${statsOverview?.todayRevenue ?? '0'}`} color="bg-purple-500/20 text-purple-400" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">车位占用率</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={occupancyData}
                cx="50%" cy="50%" innerRadius={60} outerRadius={90}
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
          <div className="flex justify-center gap-5 mt-2">
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
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Area type="monotone" dataKey="rate" stroke="#10b981" fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">最近进出记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-[#2a2d3e]">
                  <th className="text-left py-2 font-medium">车牌号</th>
                  <th className="text-left py-2 font-medium">类型</th>
                  <th className="text-left py-2 font-medium">时间</th>
                  <th className="text-left py-2 font-medium">费用</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">暂无记录</td></tr>
                )}
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30">
                    <td className="py-2.5 text-slate-200">{r.plate_number}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${r.exit_time ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {r.exit_time ? '出场' : '入场'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{(() => { const t = r.exit_time || r.entry_time; return t ? new Date(t).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '-' })()}</td>
                    <td className="py-2.5 text-slate-200">{r.fee ? `¥${r.fee}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4">即将到期月租</h3>
          {expiringRentals.length === 0 && (
            <p className="py-8 text-center text-slate-500 text-sm">暂无到期提醒</p>
          )}
          <div className="space-y-3">
            {expiringRentals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
                <div>
                  <p className="text-sm font-medium text-slate-200">{r.plate_number}</p>
                  <p className="text-xs text-slate-400">{r.owner_name} · {r.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-400">{r.expire_date}</p>
                  <p className="text-xs text-slate-500">即将到期</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
