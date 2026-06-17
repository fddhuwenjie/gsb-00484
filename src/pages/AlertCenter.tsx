import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { AlertTriangle, Clock, UserX, Cpu, Check, Eye, X, Info } from 'lucide-react'

type TabType = 'all' | 'pending' | 'handled'
type AlertType = 'overtime' | 'sensor_fault' | 'vip_violation'

const ALERT_TYPE_CONFIG: Record<AlertType, {
  label: string
  level: string
  levelLabel: string
  priority: number
  borderColor: string
  iconBg: string
  iconColor: string
  badgeBg: string
  badgeColor: string
  badgeBorder: string
  description: string
  icon: typeof AlertTriangle
}> = {
  overtime: {
    label: '超时停车',
    level: '高危',
    levelLabel: '高危',
    priority: 1,
    borderColor: 'border-red-500/60',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    badgeBg: 'bg-red-500/10',
    badgeColor: 'text-red-400',
    badgeBorder: 'border-red-500/30',
    description: '该车位非月租车已连续停放超48小时',
    icon: Clock,
  },
  vip_violation: {
    label: '违规占用',
    level: '中危',
    levelLabel: '中危',
    priority: 2,
    borderColor: 'border-orange-500/60',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    badgeBg: 'bg-orange-500/10',
    badgeColor: 'text-orange-400',
    badgeBorder: 'border-orange-500/30',
    description: '非VIP车辆占用VIP车位已超30分钟',
    icon: UserX,
  },
  sensor_fault: {
    label: '传感器故障',
    level: '低危',
    levelLabel: '低危',
    priority: 3,
    borderColor: 'border-blue-500/60',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeColor: 'text-blue-400',
    badgeBorder: 'border-blue-500/30',
    description: '车位显示占用但无对应入场记录，传感器可能故障',
    icon: Cpu,
  },
}

const TAB_LABELS: Record<TabType, string> = {
  all: '全部',
  pending: '待处理',
  handled: '已处理',
}

function formatTime(time: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AlertModal({
  alert,
  onClose,
  onConfirm,
}: {
  alert: any
  onClose: () => void
  onConfirm: (remark: string) => void
}) {
  const [remark, setRemark] = useState('')
  const config = ALERT_TYPE_CONFIG[alert.alert_type as AlertType] || ALERT_TYPE_CONFIG.sensor_fault
  const IconComponent = config.icon

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl w-full max-w-md animate-fade-in-up shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.iconBg}`}>
              <IconComponent size={20} className={config.iconColor} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">处理告警</h3>
              <p className="text-xs text-slate-400">{config.label} - {alert.spot_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-[#0f1117] rounded-lg p-4 border border-[#2a2d3e]">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="text-slate-300">{config.description}</p>
                <p className="text-slate-500 text-xs">触发时间：{formatTime(alert.triggered_at)}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              处理备注
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="请输入处理备注..."
              rows={4}
              className="w-full px-4 py-3 bg-[#0f1117] border border-[#2a2d3e] rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#2a2d3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3e] transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(remark)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            确认处理
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ alert, onClose }: { alert: any; onClose: () => void }) {
  const config = ALERT_TYPE_CONFIG[alert.alert_type as AlertType] || ALERT_TYPE_CONFIG.sensor_fault
  const IconComponent = config.icon

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl w-full max-w-md animate-fade-in-up shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.iconBg}`}>
              <IconComponent size={20} className={config.iconColor} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">告警详情</h3>
              <p className="text-xs text-slate-400">{config.label} - {alert.spot_code}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#2a2d3e] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d3e]">
              <p className="text-xs text-slate-500 mb-1">告警ID</p>
              <p className="text-slate-200 font-mono text-xs">#{alert.id}</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d3e]">
              <p className="text-xs text-slate-500 mb-1">车位ID</p>
              <p className="text-slate-200 font-mono text-xs">#{alert.spot_id}</p>
            </div>
          </div>

          <div className="bg-[#0f1117] rounded-lg p-4 border border-[#2a2d3e] space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">告警类型</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs border ${config.badgeBg} ${config.badgeColor} ${config.badgeBorder}`}>
                  {config.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs border ${config.badgeBg} ${config.badgeColor} ${config.badgeBorder}`}>
                  {config.levelLabel}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">告警描述</p>
              <p className="text-sm text-slate-300">{config.description}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">触发时间</p>
              <p className="text-sm text-slate-200">{formatTime(alert.triggered_at)}</p>
            </div>
          </div>

          <div className="bg-[#0f1117] rounded-lg p-4 border border-[#2a2d3e] space-y-2">
            <p className="text-xs text-slate-500 mb-2">处理状态</p>
            {alert.status === 'pending' ? (
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-amber-400 text-sm">待处理</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-400" />
                  <span className="text-emerald-400 text-sm">已处理</span>
                </div>
                <div className="pt-2 border-t border-[#2a2d3e] space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">处理人</span>
                    <span className="text-slate-200">{alert.handler || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">处理时间</span>
                    <span className="text-slate-200">{formatTime(alert.handled_at)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">处理备注</span>
                    <p className="text-slate-200 bg-[#1a1d2e] p-2.5 rounded border border-[#2a2d3e] text-xs">
                      {alert.remark || '无备注'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end p-5 border-t border-[#2a2d3e]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AlertCenter() {
  const { alerts, pendingAlertsCount, loading, fetchAlerts, fetchPendingAlertsCount, handleAlert, deleteAlert } = useAppStore()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [handleAlertId, setHandleAlertId] = useState<any>(null)
  const [detailAlert, setDetailAlert] = useState<any>(null)

  useEffect(() => {
    const status = activeTab === 'all' ? undefined : activeTab
    fetchAlerts(status ? { status } : undefined)
    fetchPendingAlertsCount()
  }, [activeTab])

  useEffect(() => {
    if (detailAlert && alerts?.length > 0) {
      const updated = alerts.find((a: any) => a.id === detailAlert.id)
      if (updated && updated.status !== detailAlert.status) {
        setDetailAlert(updated)
      }
    }
  }, [alerts, detailAlert?.id])

  const sortedAlerts = [...(alerts || [])].sort((a: any, b: any) => {
    const priorityA = ALERT_TYPE_CONFIG[a.alert_type as AlertType]?.priority ?? 99
    const priorityB = ALERT_TYPE_CONFIG[b.alert_type as AlertType]?.priority ?? 99
    if (priorityA !== priorityB) return priorityA - priorityB
    return new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
  })

  const currentAlert = handleAlertId ? alerts.find((a: any) => a.id === handleAlertId) : null

  const handleConfirm = (remark: string) => {
    if (handleAlertId) {
      handleAlert(handleAlertId, { handler: '管理员', remark })
      setHandleAlertId(null)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">告警中心</h2>
        <div className="relative">
          <button
            className="p-2.5 rounded-lg bg-[#1a1d2e] border border-[#2a2d3e] hover:bg-[#2a2d3e]/50 transition-colors"
            title="待处理告警"
          >
            <AlertTriangle size={18} className="text-amber-400" />
          </button>
          {pendingAlertsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg shadow-red-500/30">
              {pendingAlertsCount > 99 ? '99+' : pendingAlertsCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-1 w-fit">
        {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {TAB_LABELS[tab]}
            {tab === 'pending' && pendingAlertsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                {pendingAlertsCount > 99 ? '99+' : pendingAlertsCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading?.alerts && (
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-12 text-center">
            <div className="inline-block w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-3" />
            <p className="text-slate-500 text-sm">加载中...</p>
          </div>
        )}

        {!loading?.alerts && sortedAlerts.length === 0 && (
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#2a2d3e]/50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium mb-1">暂无告警</p>
            <p className="text-slate-600 text-sm">
              {activeTab === 'all' ? '当前没有任何告警记录' : `当前没有${TAB_LABELS[activeTab]}的告警`}
            </p>
          </div>
        )}

        {!loading?.alerts && sortedAlerts.map((alert: any) => {
          const config = ALERT_TYPE_CONFIG[alert.alert_type as AlertType] || ALERT_TYPE_CONFIG.sensor_fault
          const IconComponent = config.icon
          const isHandled = alert.status === 'handled'

          return (
            <div
              key={alert.id}
              className={`bg-[#1a1d2e] border rounded-xl p-5 transition-all duration-200 hover:shadow-lg ${
                config.borderColor
              } ${
                isHandled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
                  <IconComponent size={24} className={config.iconColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-100">
                      {config.label} - {alert.spot_code}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${config.badgeBg} ${config.badgeColor} ${config.badgeBorder}`}>
                      {config.levelLabel}
                    </span>
                    {isHandled ? (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        已处理
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/30">
                        待处理
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-400 mb-3">{config.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(alert.triggered_at)}
                    </span>
                    {isHandled && (
                      <>
                        <span>处理人：{alert.handler || '-'}</span>
                        <span>处理时间：{formatTime(alert.handled_at)}</span>
                      </>
                    )}
                  </div>

                  {isHandled && alert.remark && (
                    <div className="mt-3 pt-3 border-t border-[#2a2d3e]">
                      <p className="text-xs text-slate-500 mb-1">处理备注</p>
                      <p className="text-sm text-slate-300 bg-[#0f1117] p-2.5 rounded-lg border border-[#2a2d3e]">
                        {alert.remark}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isHandled && (
                    <>
                      <button
                        onClick={() => setHandleAlertId(alert.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
                      >
                        <Check size={15} />
                        处理
                      </button>
                      <button
                        onClick={() => setDetailAlert(alert)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-[#2a2d3e]/50 text-slate-300 border border-[#2a2d3e] hover:bg-[#2a2d3e] hover:text-slate-200 transition-colors"
                      >
                        <Eye size={15} />
                        查看详情
                      </button>
                    </>
                  )}
                  {isHandled && (
                    <button
                      onClick={() => setDetailAlert(alert)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-[#2a2d3e]/50 text-slate-300 border border-[#2a2d3e] hover:bg-[#2a2d3e] hover:text-slate-200 transition-colors"
                    >
                      <Eye size={15} />
                      查看详情
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {currentAlert && (
        <AlertModal
          alert={currentAlert}
          onClose={() => setHandleAlertId(null)}
          onConfirm={handleConfirm}
        />
      )}

      {detailAlert && (
        <DetailModal
          alert={detailAlert}
          onClose={() => setDetailAlert(null)}
        />
      )}
    </div>
  )
}
