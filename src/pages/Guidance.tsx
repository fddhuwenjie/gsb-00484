import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { MapPin, Navigation, Timer, X, Car } from 'lucide-react'

export default function Guidance() {
  const { floorStatus, recommendedSpot, spots, reservations, loading,
    fetchFloorStatus, fetchGuidanceRecommend, fetchSpots, fetchReservations, reserveSpot, cancelReservation } = useAppStore()

  const [reserveForm, setReserveForm] = useState({ spot_id: '', plate_number: '' })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    fetchFloorStatus()
    fetchGuidanceRecommend()
    fetchSpots()
    fetchReservations()
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleReserve = async () => {
    if (!reserveForm.spot_id || !reserveForm.plate_number) return
    await reserveSpot({
      spot_id: Number(reserveForm.spot_id),
      plate_number: reserveForm.plate_number,
    })
    setReserveForm({ spot_id: '', plate_number: '' })
    await fetchFloorStatus()
  }

  const freeSpots = spots.filter((s: any) => s.status === 'free')

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">车位引导</h2>

      <div className="grid grid-cols-3 gap-4">
        {(floorStatus && floorStatus.length > 0 ? floorStatus : [
          { floor: 1, free: 28, total: 40 },
          { floor: 2, free: 32, total: 40 },
          { floor: 3, free: 25, total: 40 },
        ]).map((f: any) => {
          const pct = Math.round((f.free / f.total) * 100)
          return (
            <div key={f.floor} className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-200">B{f.floor}层</h4>
                <span className="text-xs text-slate-500">{f.total}个车位</span>
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-emerald-400 font-['Outfit']">{f.free}</span>
                <span className="text-sm text-slate-400 pb-1">空余</span>
              </div>
              <div className="w-full bg-[#0f1117] rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct > 50 ? '#10b981' : pct > 20 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">占用率 {100 - pct}%</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Navigation size={16} className="text-emerald-400" /> 推荐车位
          </h3>
          {recommendedSpot ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-400 text-lg font-bold mb-1">
                B{recommendedSpot.floor}层 {recommendedSpot.zone}区 第{recommendedSpot.number}号车位
              </p>
              <p className="text-sm text-slate-300">
                请前往B{recommendedSpot.floor}层{recommendedSpot.zone}区第{recommendedSpot.number}号车位
              </p>
              <p className="text-xs text-slate-500 mt-2">类型：{recommendedSpot.type} · 距入口约{recommendedSpot.distance || 50}米</p>
            </div>
          ) : (
            <div className="p-4 bg-[#0f1117] border border-[#2a2d3e] rounded-lg text-center">
              <MapPin size={24} className="mx-auto text-slate-500 mb-2" />
              <p className="text-slate-500 text-sm">暂无推荐车位</p>
            </div>
          )}
          <button
            onClick={() => fetchGuidanceRecommend()}
            className="mt-3 w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
          >
            刷新推荐
          </button>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Timer size={16} className="text-amber-400" /> 车位预约
          </h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">选择车位</label>
              <select
                value={reserveForm.spot_id}
                onChange={(e) => setReserveForm({ ...reserveForm, spot_id: e.target.value })}
                className="w-full text-sm"
              >
                <option value="">请选择空余车位</option>
                {freeSpots.map((s: any) => (
                  <option key={s.id} value={s.id}>B{s.floor}-{s.zone}{s.number} ({s.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">车牌号</label>
              <input
                value={reserveForm.plate_number}
                onChange={(e) => setReserveForm({ ...reserveForm, plate_number: e.target.value })}
                placeholder="输入车牌号"
                className="w-full text-sm"
              />
            </div>
            <button
              onClick={handleReserve}
              className="w-full py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              预约车位
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <h3 className="text-base font-semibold mb-4">活跃预约</h3>
        {(!reservations || reservations.length === 0) && (
          <p className="py-6 text-center text-slate-500 text-sm">暂无活跃预约</p>
        )}
        <div className="grid grid-cols-3 gap-4">
          {(reservations || []).map((r: any) => {
            const remain = new Date(r.expire_time).getTime() - now
            const mins = Math.max(0, Math.floor(remain / 60000))
            const secs = Math.max(0, Math.floor((remain % 60000) / 1000))
            return (
              <div key={r.id} className="p-3 bg-[#0f1117] border border-[#2a2d3e] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">{r.plate_number}</span>
                  <button
                    onClick={() => cancelReservation(r.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">B{r.floor}层 · {r.spot_code || `车位#${r.spot_id}`}</p>
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <Timer size={10} />
                  剩余 {mins}:{secs.toString().padStart(2, '0')}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
