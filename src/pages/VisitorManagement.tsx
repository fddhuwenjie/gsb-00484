import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { UserPlus, Check, X, Trash2, Copy, Users, ClipboardList } from 'lucide-react'

type TabType = 'list' | 'create'

export default function VisitorManagement() {
  const { visitors, monthlyRentals, loading,
    fetchVisitors, createVisitor, approveVisitor, rejectVisitor, deleteVisitor, fetchMonthlyRentals } = useAppStore()

  const [activeTab, setActiveTab] = useState<TabType>('list')
  const [form, setForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    host_plate: '',
    expected_arrival: '',
    expected_duration: 30,
  })
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [rejectConfirmId, setRejectConfirmId] = useState<number | null>(null)

  useEffect(() => {
    fetchVisitors()
    fetchMonthlyRentals()
  }, [])

  const resetForm = () => {
    setForm({
      visitor_name: '',
      visitor_phone: '',
      purpose: '',
      host_plate: '',
      expected_arrival: '',
      expected_duration: 30,
    })
  }

  const handleSubmit = async () => {
    await createVisitor({
      ...form,
      expected_duration: Number(form.expected_duration),
    })
    resetForm()
    setActiveTab('list')
    await fetchVisitors()
  }

  const handleCopyPassCode = (id: number, passCode: string) => {
    navigator.clipboard.writeText(passCode)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: number) => {
    await deleteVisitor(id)
    setDeleteConfirmId(null)
  }

  const handleReject = async (id: number) => {
    await rejectVisitor(id)
    setRejectConfirmId(null)
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes: number) => {
    if (!minutes && minutes !== 0) return '-'
    if (minutes < 60) return `${minutes}分钟`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
  }

  const getSpotInfo = (v: any) => {
    const parts = []
    if (v.host_plate) parts.push(v.host_plate)
    if (v.spot_code) parts.push(v.spot_code)
    else if (v.floor != null && v.zone && v.number != null) {
      parts.push(`B${v.floor}-${v.zone}${v.number}`)
    }
    return parts.length > 0 ? parts.join(' / ') : '-'
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      expired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }
    const label: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      expired: '已过期',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded text-xs font-medium border ${map[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
        {label[status] || status}
      </span>
    )
  }

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        activeTab === tab
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-[#1a1d2e] text-slate-400 hover:text-slate-200 border border-[#2a2d3e] hover:border-emerald-500/30'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  )

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Users size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">访客管理</h2>
            <p className="text-xs text-slate-500 mt-0.5">访客预登记与通行码管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          实时同步
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TabButton tab="list" label="访客列表" icon={ClipboardList} />
        <TabButton tab="create" label="新增预登记" icon={UserPlus} />
      </div>

      {activeTab === 'list' && (
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2d3e] flex items-center justify-between bg-[#0f1117]/50">
            <div>
              <h3 className="text-sm font-semibold">访客登记记录</h3>
              <p className="text-xs text-slate-500 mt-1">共 {visitors.length} 条记录</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-slate-400">待审核</span>
                <span className="text-amber-400 font-medium">{visitors.filter((v: any) => v.status === 'pending').length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-400">已通过</span>
                <span className="text-emerald-400 font-medium">{visitors.filter((v: any) => v.status === 'approved').length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-400">已过期</span>
                <span className="text-slate-400 font-medium">{visitors.filter((v: any) => v.status === 'expired').length}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                  <th className="text-left py-3 px-4 font-medium">访客姓名</th>
                  <th className="text-left py-3 px-4 font-medium">手机号</th>
                  <th className="text-left py-3 px-4 font-medium">来访事由</th>
                  <th className="text-left py-3 px-4 font-medium">被访车牌/车位</th>
                  <th className="text-left py-3 px-4 font-medium">预计到达时间</th>
                  <th className="text-left py-3 px-4 font-medium">预计停留</th>
                  <th className="text-left py-3 px-4 font-medium">通行码</th>
                  <th className="text-left py-3 px-4 font-medium">状态</th>
                  <th className="text-left py-3 px-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-[#2a2d3e] flex items-center justify-center">
                          <Users size={28} className="text-slate-600" />
                        </div>
                        <p className="text-slate-500">暂无访客登记记录</p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          立即新增预登记 →
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {visitors.map((v: any) => (
                  <tr key={v.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 transition-colors">
                    <td className="py-3.5 px-4 text-slate-200 font-medium">{v.visitor_name || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{v.visitor_phone || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-[140px] truncate" title={v.purpose}>{v.purpose || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex flex-col gap-1">
                        {getSpotInfo(v).split(' / ').map((part, i) => (
                          <span key={i} className="text-xs">
                            {i === 0 && v.host_plate ? (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                {part}
                              </span>
                            ) : part !== '-' ? (
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {part}
                              </span>
                            ) : part}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">{formatDateTime(v.expected_arrival)}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">{formatDuration(v.expected_duration)}</td>
                    <td className="py-3.5 px-4">
                      {v.status === 'approved' && v.pass_code ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-emerald-400 font-bold tracking-wider text-sm">
                          {v.pass_code}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{statusBadge(v.status)}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {v.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveVisitor(v.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all text-xs font-medium"
                              title="通过"
                            >
                              <Check size={13} />
                              通过
                            </button>
                            <button
                              onClick={() => setRejectConfirmId(v.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all text-xs font-medium"
                              title="拒绝"
                            >
                              <X size={13} />
                              拒绝
                            </button>
                          </>
                        )}
                        {v.status === 'approved' && v.pass_code && (
                          <button
                            onClick={() => handleCopyPassCode(v.id, v.pass_code)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all text-xs font-medium ${
                              copiedId === v.id
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-[#2a2d3e] text-slate-300 hover:text-emerald-400 border-[#3a3d4e] hover:border-emerald-500/40'
                            }`}
                            title="复制通行码"
                          >
                            <Copy size={13} />
                            {copiedId === v.id ? '已复制' : '复制码'}
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirmId(v.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/30 transition-all"
                          title="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2a2d3e] bg-[#0f1117]/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <UserPlus size={14} className="text-emerald-400" />
              </div>
              新增访客预登记
            </h3>
            <p className="text-xs text-slate-500 mt-1">填写访客信息，审核通过后将生成6位通行码</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  访客姓名 <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.visitor_name}
                  onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                  placeholder="请输入访客姓名"
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  访客手机号 <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.visitor_phone}
                  onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  className="w-full text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  来访事由 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="请描述来访事由，如：探亲、商务洽谈、送货等"
                  rows={2}
                  className="w-full text-sm resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  被访车牌 <span className="text-slate-600 text-xs font-normal">(月租车牌)</span>
                </label>
                <select
                  value={form.host_plate}
                  onChange={(e) => setForm({ ...form, host_plate: e.target.value })}
                  className="w-full text-sm"
                >
                  <option value="">请选择月租车牌</option>
                  {monthlyRentals.map((r: any) => (
                    <option key={r.id} value={r.plate_number}>
                      {r.plate_number} - {r.owner_name || '车主'}
                    </option>
                  ))}
                </select>
                {monthlyRentals.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-400" />
                    暂无月租车牌数据，可手动填写车牌
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  预计停留时间 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    value={form.expected_duration}
                    onChange={(e) => setForm({ ...form, expected_duration: Number(e.target.value) })}
                    className="w-full text-sm pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">分钟</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[30, 60, 120, 240].map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm({ ...form, expected_duration: m })}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        form.expected_duration === m
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#2a2d3e] text-slate-400 border border-transparent hover:border-[#3a3d4e]'
                      }`}
                    >
                      {m < 60 ? `${m}分` : `${m / 60}时`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                  预计到达时间 <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={form.expected_arrival}
                  onChange={(e) => setForm({ ...form, expected_arrival: e.target.value })}
                  className="w-full text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-[#2a2d3e]">
              <button
                onClick={resetForm}
                className="px-5 py-2 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm font-medium hover:bg-[#3a3d4e] transition-colors"
              >
                重置表单
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.visitor_name || !form.visitor_phone || !form.purpose || !form.expected_arrival || !form.expected_duration}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <UserPlus size={15} />
                提交预登记
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-6 w-[380px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">确认删除</h3>
                <p className="text-xs text-slate-500 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              确定要删除这条访客登记记录吗？删除后将无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm font-medium hover:bg-[#3a3d4e] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-up" onClick={() => setRejectConfirmId(null)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-6 w-[380px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <X size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold">确认拒绝</h3>
                <p className="text-xs text-slate-500 mt-0.5">拒绝后该申请将失效</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              确定要拒绝该访客的登记申请吗？拒绝后访客将无法获得通行码。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm font-medium hover:bg-[#3a3d4e] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleReject(rejectConfirmId)}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
