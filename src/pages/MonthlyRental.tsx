import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Plus, Edit2, Trash2, X, RefreshCw, AlertTriangle, Crown } from 'lucide-react'

export default function MonthlyRental() {
  const { monthlyRentals, expiringRentals, spots, loading,
    fetchMonthlyRentals, fetchExpiringRentals, fetchSpots,
    createMonthlyRental, updateMonthlyRental, deleteMonthlyRental, renewMonthlyRental } = useAppStore()

  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    plate_number: '', owner_name: '', phone: '', expire_date: '', spot_id: '', monthly_fee: 300,
  })
  const [renewId, setRenewId] = useState<number | null>(null)

  useEffect(() => {
    fetchMonthlyRentals()
    fetchExpiringRentals()
    fetchSpots()
  }, [])

  const openModal = (rental?: any) => {
    if (rental) {
      setEditingId(rental.id)
      setForm({
        plate_number: rental.plate_number,
        owner_name: rental.owner_name,
        phone: rental.phone,
        expire_date: rental.expire_date,
        spot_id: String(rental.spot_id),
        monthly_fee: rental.monthly_fee,
      })
    } else {
      setEditingId(null)
      setForm({ plate_number: '', owner_name: '', phone: '', expire_date: '', spot_id: '', monthly_fee: 300 })
    }
    setModal(true)
  }

  const handleSave = async () => {
    if (editingId) {
      await updateMonthlyRental(editingId, { ...form, spot_id: Number(form.spot_id) })
    } else {
      await createMonthlyRental({ ...form, spot_id: Number(form.spot_id) })
    }
    setModal(false)
  }

  const handleRenew = async (id: number) => {
    await renewMonthlyRental(id)
    setRenewId(null)
  }

  const isExpiring = (date: string) => {
    const diff = new Date(date).getTime() - Date.now()
    return diff > 0 && diff < 7 * 24 * 3600000
  }

  const vipSpots = spots.filter((s: any) => s.type === 'vip' && s.status === 'occupied')
  const vipSpotRentals = vipSpots.map((s: any) => {
    const rental = monthlyRentals.find((r: any) => r.spot_id === s.id)
    return { spot: s, rental }
  }).filter((v: any) => !v.rental)

  const availableVipSpots = spots.filter((s: any) => s.type === 'vip' && s.status === 'free')

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">月租管理</h2>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">月租车列表</h3>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Plus size={14} /> 新增月租
        </button>
      </div>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
              <th className="text-left py-3 px-4 font-medium">车牌号</th>
              <th className="text-left py-3 px-4 font-medium">车主</th>
              <th className="text-left py-3 px-4 font-medium">联系电话</th>
              <th className="text-left py-3 px-4 font-medium">到期日期</th>
              <th className="text-left py-3 px-4 font-medium">绑定车位</th>
              <th className="text-left py-3 px-4 font-medium">月费</th>
              <th className="text-left py-3 px-4 font-medium">状态</th>
              <th className="text-left py-3 px-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRentals.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500">暂无月租记录</td></tr>
            )}
            {monthlyRentals.map((r: any) => (
              <tr key={r.id} className={`border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30 ${isExpiring(r.expire_date) ? 'bg-amber-500/5' : ''}`}>
                <td className="py-3 px-4 text-slate-200 font-medium">{r.plate_number}</td>
                <td className="py-3 px-4 text-slate-300">{r.owner_name}</td>
                <td className="py-3 px-4 text-slate-400">{r.phone}</td>
                <td className="py-3 px-4">
                  <span className={isExpiring(r.expire_date) ? 'text-amber-400 font-medium' : 'text-slate-300'}>
                    {r.expire_date}
                  </span>
                </td>
                <td className="py-3 px-4 text-blue-400">#{r.spot_id}</td>
                <td className="py-3 px-4 text-slate-300">¥{r.monthly_fee}</td>
                <td className="py-3 px-4">
                  {isExpiring(r.expire_date) ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400">即将到期</span>
                  ) : new Date(r.expire_date) < new Date() ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">已过期</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400">有效</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => openModal(r)} className="text-blue-400 hover:text-blue-300"><Edit2 size={14} /></button>
                    <button onClick={() => setRenewId(r.id)} className="text-emerald-400 hover:text-emerald-300"><RefreshCw size={14} /></button>
                    <button onClick={() => deleteMonthlyRental(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {vipSpotRentals.length > 0 && (
        <div className="bg-[#1a1d2e] border border-amber-500/30 rounded-lg p-5">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-amber-400">
            <AlertTriangle size={16} /> 月租车位占用通知
          </h3>
          <div className="space-y-2">
            {vipSpotRentals.map((v: any) => (
              <div key={v.spot.id} className="flex items-center justify-between p-3 bg-[#0f1117] rounded-lg">
                <div>
                  <span className="text-sm text-slate-200">VIP车位 B{v.spot.floor}-{v.spot.zone}{v.spot.number}</span>
                  <span className="text-xs text-slate-500 ml-2">被临时车辆占用</span>
                </div>
                <span className="text-xs text-amber-400">需通知物业处理</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModal(false)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{editingId ? '编辑月租' : '新增月租'}</h3>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">车牌号</label>
                <input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">车主姓名</label>
                <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">联系电话</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">绑定车位</label>
                <select value={form.spot_id} onChange={(e) => setForm({ ...form, spot_id: e.target.value })} className="w-full text-sm">
                  <option value="">选择车位</option>
                  {availableVipSpots.map((s: any) => (
                    <option key={s.id} value={s.id}>B{s.floor}-{s.zone}{s.number} (VIP)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">到期日期</label>
                <input type="date" value={form.expire_date} onChange={(e) => setForm({ ...form, expire_date: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">月费(元)</label>
                <input type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })} className="w-full text-sm" />
              </div>
              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                {editingId ? '保存修改' : '创建月租'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renewId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRenewId(null)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">确认续费</h3>
            <p className="text-sm text-slate-400 mb-4">确认为该月租车续费一个月？</p>
            <div className="flex gap-3">
              <button onClick={() => setRenewId(null)} className="flex-1 py-2 rounded-lg bg-[#2a2d3e] text-slate-300 text-sm hover:bg-[#2a2d3e]/80">取消</button>
              <button onClick={() => handleRenew(renewId)} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600">确认续费</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
