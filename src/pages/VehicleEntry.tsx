import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { ArrowRightFromLine, ArrowLeftToLine, Clock, ShieldAlert, X, Ticket } from 'lucide-react'

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}时${m}分`
}

export default function VehicleEntry() {
  const { vehiclesPresent, coupons, recommendedSpot, loading,
    fetchVehiclesPresent, fetchCoupons, fetchGuidanceRecommend,
    vehicleEntry, vehicleExit, calculateFee, visitorEntry } = useAppStore()

  const [tab, setTab] = useState<'entry' | 'exit'>('entry')
  const [entryMode, setEntryMode] = useState<'plate' | 'passcode'>('plate')
  const [plate, setPlate] = useState('')
  const [passCode, setPassCode] = useState(['', '', '', '', '', ''])
  const passCodeRefs = useRef<(HTMLInputElement | null)[]>([])
  const [gateAnim, setGateAnim] = useState(false)
  const [exitInfo, setExitInfo] = useState<any>(null)
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [blacklistModal, setBlacklistModal] = useState(false)

  useEffect(() => {
    fetchVehiclesPresent()
    fetchCoupons()
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleEntry = async () => {
    if (!plate.trim()) return
    await fetchGuidanceRecommend()
    const spot = useAppStore.getState().recommendedSpot
    try {
      const res: any = await vehicleEntry({ plate_number: plate, spot_id: spot?.id })
      if (res && (res.blacklist || !res.success)) {
        setBlacklistModal(true)
        return
      }
      setGateAnim(true)
      setTimeout(() => { setGateAnim(false); setPlate('') }, 2000)
    } catch (e: any) {
      if (e?.message?.includes('黑名单')) {
        setBlacklistModal(true)
      } else {
        console.error(e)
      }
    }
  }

  const handlePassCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...passCode]
    newCode[index] = value.slice(-1)
    setPassCode(newCode)
    if (value && index < 5) {
      passCodeRefs.current[index + 1]?.focus()
    }
  }

  const handlePassCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !passCode[index] && index > 0) {
      passCodeRefs.current[index - 1]?.focus()
    }
  }

  const handlePassCodeEntry = async () => {
    const code = passCode.join('')
    if (code.length !== 6) return
    try {
      const res: any = await visitorEntry({ pass_code: code } as any)
      await fetchGuidanceRecommend()
      setGateAnim(true)
      setTimeout(() => {
        setGateAnim(false)
        setPassCode(['', '', '', '', '', ''])
      }, 2000)
    } catch (e: any) {
      if (e?.message?.includes('黑名单')) {
        setBlacklistModal(true)
      } else {
        console.error(e)
      }
    }
  }

  const handleExitLookup = async () => {
    if (!plate.trim()) return
    try {
      const vehicle = vehiclesPresent.find((v: any) => v.plate_number === plate)
      if (!vehicle) { setExitInfo(null); return }
      const allSpots = useAppStore.getState().spots
      const spot = allSpots.find((s: any) => s.id === vehicle.spot_id)
      const fee = await calculateFee({ entry_time: vehicle.entry_time, spot_type: spot?.spot_type ?? spot?.type })
      setExitInfo(fee)
    } catch (e) {
      setExitInfo(null)
    }
  }

  const handleExitConfirm = async () => {
    try {
      await vehicleExit({ plate_number: plate, coupon_id: selectedCoupon })
      setGateAnim(true)
      setTimeout(() => {
        setGateAnim(false)
        setPlate('')
        setExitInfo(null)
        setSelectedCoupon(null)
      }, 2000)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">车辆进出</h2>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setTab('entry')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'entry' ? 'bg-emerald-500 text-white' : 'bg-[#1a1d2e] text-slate-400 border border-[#2a2d3e]'
          }`}
        >
          <ArrowRightFromLine size={16} /> 入场
        </button>
        <button
          onClick={() => setTab('exit')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'exit' ? 'bg-red-500 text-white' : 'bg-[#1a1d2e] text-slate-400 border border-[#2a2d3e]'
          }`}
        >
          <ArrowLeftToLine size={16} /> 出场
        </button>
      </div>

      {tab === 'entry' ? (
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6">
          <h3 className="text-base font-semibold mb-4">车辆入场</h3>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setEntryMode('plate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                entryMode === 'plate' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#0f1117] text-slate-400 border border-[#2a2d3e] hover:text-slate-300'
              }`}
            >
              <ArrowRightFromLine size={14} /> 车牌识别入场
            </button>
            <button
              onClick={() => setEntryMode('passcode')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                entryMode === 'passcode' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-[#0f1117] text-slate-400 border border-[#2a2d3e] hover:text-slate-300'
              }`}
            >
              <Ticket size={14} /> 通行码入场(访客)
            </button>
          </div>

          {entryMode === 'plate' ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="输入车牌号"
                  className="flex-1 text-sm"
                />
                <button
                  onClick={handleEntry}
                  className="px-6 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  确认入场
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="text-xs text-slate-400 mb-1">请输入6位通行码</div>
                <div className="flex gap-2">
                  {passCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { passCodeRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePassCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handlePassCodeKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-[#0f1117] border border-[#2a2d3e] rounded-lg text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handlePassCodeEntry}
                disabled={passCode.some(d => !d)}
                className="w-full py-2.5 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                验证并入场
              </button>
            </div>
          )}

          {recommendedSpot && gateAnim && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm mt-4">
              <span className="text-emerald-400">分配车位：</span>
              <span className="text-slate-200">B{recommendedSpot.floor}-{recommendedSpot.zone}{recommendedSpot.number}</span>
            </div>
          )}
          {recommendedSpot && !gateAnim && entryMode === 'plate' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm mt-4">
              <span className="text-emerald-400">推荐车位：</span>
              <span className="text-slate-200">B{recommendedSpot.floor}-{recommendedSpot.zone}{recommendedSpot.number}</span>
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <div className="relative w-48 h-20">
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-600 rounded" />
              <div className={`absolute bottom-1 left-2 h-16 w-1.5 bg-amber-500 rounded gate-bar ${gateAnim ? 'open' : ''}`} />
              <div className="absolute bottom-0 left-0 w-6 h-4 bg-[#2a2d3e] rounded-t" />
              {gateAnim && (
                <span className="absolute top-0 right-0 text-emerald-400 text-xs font-medium animate-pulse">通行中...</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6">
          <h3 className="text-base font-semibold mb-4">车辆出场</h3>
          <div className="flex gap-3 mb-4">
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="输入车牌号"
              className="flex-1 text-sm"
            />
            <button
              onClick={handleExitLookup}
              className="px-6 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              查询费用
            </button>
          </div>
          {exitInfo && (
            <div className="space-y-3 p-4 bg-[#0f1117] rounded-lg border border-[#2a2d3e]">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">停车时长</span>
                <span className="text-slate-200">{exitInfo.details?.billableHours ? `${exitInfo.details.billableHours}小时` : exitInfo.duration || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">基础费用</span>
                <span className="text-slate-200">¥{exitInfo.details ? (exitInfo.details.hourlyRate * exitInfo.details.billableHours) : (exitInfo.baseFee ?? exitInfo.fee ?? '0')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">充电费</span>
                <span className="text-slate-200">¥{exitInfo.details?.chargingFee ?? exitInfo.chargingFee ?? '0'}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-400">优惠券</span>
                <select
                  value={selectedCoupon ?? ''}
                  onChange={(e) => setSelectedCoupon(e.target.value ? Number(e.target.value) : null)}
                  className="text-sm w-40"
                >
                  <option value="">不使用</option>
                  {coupons.filter((c: any) => c.active).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} (-¥{c.type === 'discount' ? c.value : c.value})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-[#2a2d3e]">
                <span className="text-slate-300 font-medium">应付金额</span>
                <span className="text-emerald-400 text-lg font-bold">¥{exitInfo.fee ?? exitInfo.totalFee ?? '0'}</span>
              </div>
              <button
                onClick={handleExitConfirm}
                className="w-full py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
              >
                确认支付
              </button>
            </div>
          )}
          <div className="mt-4 flex justify-center">
            <div className="relative w-48 h-20">
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-600 rounded" />
              <div className={`absolute bottom-1 left-2 h-16 w-1.5 bg-amber-500 rounded gate-bar ${gateAnim ? 'open' : ''}`} />
              <div className="absolute bottom-0 left-0 w-6 h-4 bg-[#2a2d3e] rounded-t" />
              {gateAnim && (
                <span className="absolute top-0 right-0 text-emerald-400 text-xs font-medium animate-pulse">通行中...</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <h3 className="text-base font-semibold mb-4">在场车辆</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-[#2a2d3e]">
                <th className="text-left py-2 font-medium">车牌号</th>
                <th className="text-left py-2 font-medium">入场时间</th>
                <th className="text-left py-2 font-medium">所在车位</th>
                <th className="text-left py-2 font-medium">已停时长</th>
              </tr>
            </thead>
            <tbody>
              {vehiclesPresent.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">暂无在场车辆</td></tr>
              )}
              {vehiclesPresent.map((v: any) => (
                <tr key={v.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30">
                  <td className="py-2.5 text-slate-200">{v.plate_number}</td>
                  <td className="py-2.5 text-slate-400">{v.entry_time}</td>
                  <td className="py-2.5 text-blue-400">{v.spot_id ? `车位#${v.spot_id}` : '-'}</td>
                  <td className="py-2.5 text-amber-400">
                    <span className="flex items-center gap-1"><Clock size={12} />{formatDuration(now - new Date(v.entry_time).getTime())}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {blacklistModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setBlacklistModal(false)}>
          <div className="bg-[#1a1d2e] border border-red-500/40 rounded-xl p-6 w-96 shadow-2xl shadow-red-500/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={24} className="text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-red-400">车辆拒绝入场</h3>
                  <button onClick={() => setBlacklistModal(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  车牌在黑名单中，请联系管理员处理。
                </p>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <ShieldAlert size={12} />
                <span>安全系统已触发自动拦截</span>
              </div>
            </div>
            <button
              onClick={() => setBlacklistModal(false)}
              className="w-full py-2.5 rounded-lg bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors border border-red-500/30"
            >
              <span className="flex items-center justify-center gap-2">
                <X size={14} /> 关闭
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
