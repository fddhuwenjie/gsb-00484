import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { CreditCard, Plus, X, ShieldCheck, ShieldAlert, Users, UserCheck, UserX, Clock, Info, Filter } from 'lucide-react'

type TabType = 'records' | 'blacklist' | 'whitelist'

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round((value || 0) * 100)
  let cls = 'text-red-400'
  if (value > 0.9) cls = 'text-emerald-400'
  else if (value > 0.7) cls = 'text-amber-400'
  return <span className={`text-xs font-medium ${cls}`}>{pct}%</span>
}

function OperationBadge({ op }: { op: 'entry' | 'exit' | string }) {
  const isEntry = op === 'entry'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isEntry ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'}`}>
      {isEntry ? '入场' : '出场'}
    </span>
  )
}

function StatusBadge({ status }: { status: 'active' | 'removed' | string }) {
  const isActive = status === 'active'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isActive ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'}`}>
      {isActive ? '生效' : '已移除'}
    </span>
  )
}

function WhitelistStatusBadge({ date }: { date: string }) {
  const isExpired = new Date(date) < new Date()
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${isExpired ? 'bg-red-500/15 text-red-400 border border-red-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>
      {isExpired ? '已过期' : '有效'}
    </span>
  )
}

function PlateImagePlaceholder({ plate }: { plate: string }) {
  const colors = ['#1e3a5f', '#2d4a3e', '#5c3d2e', '#4a2d5c', '#2d3d5c']
  const idx = plate ? plate.charCodeAt(0) % colors.length : 0
  return (
    <div
      className="flex items-center justify-center rounded-md text-xs font-mono font-bold w-28 h-10"
      style={{ backgroundColor: colors[idx], color: '#e0f2fe', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }}
    >
      {plate || '---'}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-4 flex items-center gap-3 hover:shadow-lg transition-shadow">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-100">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function PlateManagement() {
  const {
    plateRecords, plateBlacklist, plateWhitelist, whitelistStatus, loading,
    fetchPlateRecords, fetchPlateBlacklist, addPlateBlacklist, removePlateBlacklist,
    fetchPlateWhitelist, fetchWhitelistStatus,
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<TabType>('records')
  const [blacklistModal, setBlacklistModal] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState<number | null>(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [form, setForm] = useState({
    plate_number: '',
    reason: '',
    operator: '管理员',
  })

  useEffect(() => {
    if (activeTab === 'records') fetchPlateRecords()
    else if (activeTab === 'blacklist') fetchPlateBlacklist()
    else if (activeTab === 'whitelist') {
      fetchPlateWhitelist()
      fetchWhitelistStatus('')
    }
  }, [activeTab])

  const filteredBlacklist = useMemo(() => {
    if (showRemoved) return plateBlacklist
    return plateBlacklist.filter((b: any) => b.status === 'active' || !b.status || b.status === undefined)
  }, [plateBlacklist, showRemoved])

  const recordsData = useMemo(() => {
    if (Array.isArray(plateRecords)) return plateRecords
    return (plateRecords as any)?.records || plateRecords || []
  }, [plateRecords])

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === tab
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-[#1a1d2e] text-slate-400 hover:text-slate-200 border border-[#2a2d3e] hover:border-[#3a3d4e]'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  )

  const handleAddBlacklist = async () => {
    if (!form.plate_number.trim()) return
    await addPlateBlacklist({ ...form })
    setBlacklistModal(false)
    setForm({ plate_number: '', reason: '', operator: '管理员' })
  }

  const handleRemoveBlacklist = async (id: number) => {
    await removePlateBlacklist(id)
    setRemoveConfirm(null)
  }

  const recentSync = whitelistStatus?.recentlySynced
  const recentSyncLabel = recentSync
    ? `${recentSync.plate_number} · ${recentSync.created_at ? new Date(recentSync.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}`
    : '暂无同步'

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold text-slate-100">车牌管理</h2>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <TabButton tab="records" label="识别记录" icon={CreditCard} />
        <TabButton tab="blacklist" label="黑名单" icon={ShieldAlert} />
        <TabButton tab="whitelist" label="白名单" icon={ShieldCheck} />
      </div>

      {activeTab === 'records' && (
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                  <th className="text-left py-3 px-4 font-medium">车牌号</th>
                  <th className="text-left py-3 px-4 font-medium">操作类型</th>
                  <th className="text-left py-3 px-4 font-medium">识别时间</th>
                  <th className="text-left py-3 px-4 font-medium">识别置信度</th>
                  <th className="text-left py-3 px-4 font-medium">识别图片</th>
                </tr>
              </thead>
              <tbody>
                {recordsData.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">暂无识别记录</td></tr>
                )}
                {recordsData.map((r: any) => (
                  <tr key={r.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-slate-200 font-mono font-medium">{r.plate_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <OperationBadge op={r.operation} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {r.recognized_at ? new Date(r.recognized_at).toLocaleString('zh-CN') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <ConfidenceBadge value={r.confidence} />
                    </td>
                    <td className="py-3 px-4">
                      <PlateImagePlaceholder plate={r.plate_number} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'blacklist' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setShowRemoved(!showRemoved)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                showRemoved ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : 'bg-[#1a1d2e] text-slate-400 hover:text-slate-200 border border-[#2a2d3e]'
              }`}
            >
              <Filter size={14} />
              {showRemoved ? '显示全部' : '仅显示生效'}
            </button>
            <button
              onClick={() => {
                setForm({ plate_number: '', reason: '', operator: '管理员' })
                setBlacklistModal(true)
              }}
              className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors font-medium"
            >
              <Plus size={14} />
              添加黑名单
            </button>
          </div>

          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                    <th className="text-left py-3 px-4 font-medium">车牌号</th>
                    <th className="text-left py-3 px-4 font-medium">加入原因</th>
                    <th className="text-left py-3 px-4 font-medium">加入时间</th>
                    <th className="text-left py-3 px-4 font-medium">操作人</th>
                    <th className="text-left py-3 px-4 font-medium">状态</th>
                    <th className="text-left py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlacklist.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-500">黑名单为空</td></tr>
                  )}
                  {filteredBlacklist.map((b: any) => {
                    const isActive = b.status === 'active' || !b.status || b.status === undefined
                    return (
                      <tr key={b.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-slate-200 font-mono font-medium">{b.plate_number}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={b.reason}>
                          {b.reason || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {b.added_at ? new Date(b.added_at).toLocaleString('zh-CN') : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {b.operator || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={b.status || 'active'} />
                        </td>
                        <td className="py-3 px-4">
                          {isActive ? (
                            <button
                              onClick={() => setRemoveConfirm(b.id)}
                              className="text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors font-medium"
                            >
                              移除
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'whitelist' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="总数" value={whitelistStatus?.total ?? plateWhitelist.length ?? '-'} color="bg-blue-500/20 text-blue-400" />
            <StatCard icon={UserCheck} label="激活" value={whitelistStatus?.active ?? '-'} color="bg-emerald-500/20 text-emerald-400" />
            <StatCard icon={UserX} label="失效" value={whitelistStatus?.inactive ?? '-'} color="bg-red-500/20 text-red-400" />
            <StatCard icon={Clock} label="最近同步" value={recentSync?.plate_number ?? '-'} sub={recentSync?.created_at ? new Date(recentSync.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '暂无同步'} color="bg-amber-500/20 text-amber-400" />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300/90">月租车自动加入白名单，过期自动失效</p>
          </div>

          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                    <th className="text-left py-3 px-4 font-medium">车牌号</th>
                    <th className="text-left py-3 px-4 font-medium">车主姓名</th>
                    <th className="text-left py-3 px-4 font-medium">联系电话</th>
                    <th className="text-left py-3 px-4 font-medium">绑定车位</th>
                    <th className="text-left py-3 px-4 font-medium">有效期</th>
                    <th className="text-left py-3 px-4 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {plateWhitelist.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-500">白名单为空</td></tr>
                  )}
                  {plateWhitelist.map((w: any) => (
                    <tr key={w.plate_number} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-slate-200 font-mono font-medium">{w.plate_number}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {w.owner_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {w.phone || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {w.spot_id ? (
                          <span className="text-blue-400 font-mono">#{w.spot_id}</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {w.expire_date || '长期有效'}
                      </td>
                      <td className="py-3 px-4">
                        <WhitelistStatusBadge date={w.expire_date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {blacklistModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setBlacklistModal(false)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-6 w-96 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-100">添加黑名单</h3>
              <button onClick={() => setBlacklistModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-[#2a2d3e]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">车牌号 <span className="text-red-400">*</span></label>
                <input
                  value={form.plate_number}
                  onChange={(e) => setForm({ ...form, plate_number: e.target.value.toUpperCase() })}
                  placeholder="例如：京A12345"
                  className="w-full text-sm bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">加入原因</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="例如：多次违规停车"
                  rows={3}
                  className="w-full text-sm bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">操作人</label>
                <input
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  className="w-full text-sm bg-[#0f1117] border border-[#2a2d3e] rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setBlacklistModal(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm font-medium hover:bg-[#2a2d3e]/80 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddBlacklist}
                  disabled={!form.plate_number.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  确认添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {removeConfirm !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setRemoveConfirm(null)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-6 w-80 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={20} className="text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-100">确认移除</h3>
            </div>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">确认将该车辆从黑名单中移除？移除后将不再拦截此车辆。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm font-medium hover:bg-[#2a2d3e]/80 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleRemoveBlacklist(removeConfirm)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                确认移除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
