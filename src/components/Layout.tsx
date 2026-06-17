import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import {
  LayoutDashboard,
  ParkingCircle,
  Car,
  Receipt,
  Navigation,
  CalendarCheck,
  BarChart3,
  UserPlus,
  AlertTriangle,
  FileBarChart,
  CreditCard,
} from 'lucide-react'

const navItems = [
  { to: '/', label: '总览仪表盘', icon: LayoutDashboard },
  { to: '/parking-spots', label: '车位管理', icon: ParkingCircle },
  { to: '/vehicle-entry', label: '车辆进出', icon: Car },
  { to: '/billing-rules', label: '计费规则', icon: Receipt },
  { to: '/guidance', label: '车位引导', icon: Navigation },
  { to: '/monthly-rental', label: '月租管理', icon: CalendarCheck },
  { to: '/statistics', label: '数据统计', icon: BarChart3 },
  { to: '/visitor-management', label: '访客管理', icon: UserPlus },
  { to: '/alert-center', label: '告警中心', icon: AlertTriangle },
  { to: '/daily-report', label: '运营日报', icon: FileBarChart },
  { to: '/plate-management', label: '车牌管理', icon: CreditCard },
]

function AlertBadge({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg bg-[#2a2d3e]/50 hover:bg-[#2a2d3e] transition-colors"
      title="未处理告警"
    >
      <AlertTriangle size={18} className="text-amber-400" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const { pendingAlertsCount, fetchPendingAlertsCount } = useAppStore()

  useEffect(() => {
    fetchPendingAlertsCount()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#1a1d2e] border-r border-[#2a2d3e] flex flex-col z-50">
        <div className="px-5 py-6 border-b border-[#2a2d3e]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-emerald-400 font-['Outfit']">
                🅿️ 智慧停车场
              </h1>
              <p className="text-xs text-slate-500 mt-1">管理系统 v1.0</p>
            </div>
            <AlertBadge count={pendingAlertsCount} onClick={() => navigate('/alert-center')} />
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e]/50'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.to === '/alert-center' && pendingAlertsCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {pendingAlertsCount > 99 ? '99+' : pendingAlertsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
              管
            </div>
            <div>
              <p className="text-sm text-slate-200">管理员</p>
              <p className="text-xs text-slate-500">在线</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 p-6 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
