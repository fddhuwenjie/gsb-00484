import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Edit2, X, Car, Zap, Accessibility, Crown, Truck } from 'lucide-react'

const TYPE_CONFIG: Record<string, { label: string; border: string; icon: any }> = {
  small: { label: '小型车', border: 'border-slate-500/50', icon: Car },
  large: { label: '大型车', border: 'border-blue-500/70', icon: Truck },
  ev: { label: '新能源', border: 'border-emerald-500/70', icon: Zap },
  accessible: { label: '无障碍', border: 'border-purple-500/70', icon: Accessibility },
  vip: { label: 'VIP', border: 'border-yellow-500/70', icon: Crown },
}

const STATUS_BG: Record<string, string> = {
  free: 'bg-emerald-500/20',
  occupied: 'bg-red-500/20',
  reserved: 'bg-amber-500/20',
  fault: 'bg-gray-500/20',
}

const STATUS_TEXT: Record<string, string> = {
  free: 'text-emerald-400',
  occupied: 'text-red-400',
  reserved: 'text-amber-400',
  fault: 'text-gray-400',
}

const STATUS_LABEL: Record<string, string> = {
  free: '空闲', occupied: '占用', reserved: '预留', fault: '故障',
}

export default function ParkingSpots() {
  const { parkingLot, spots, vehiclesPresent, selectedFloor, selectedSpot, loading,
    fetchParkingLot, fetchSpots, fetchVehiclesPresent, setSelectedFloor, setSelectedSpot, updateParkingLot, updateSpot } = useAppStore()

  const [editingLot, setEditingLot] = useState(false)
  const [lotForm, setLotForm] = useState<any>({})
  const [editSpotForm, setEditSpotForm] = useState<any>({})

  useEffect(() => {
    fetchParkingLot()
    fetchSpots({ floor: selectedFloor })
    fetchVehiclesPresent()
  }, [selectedFloor])

  useEffect(() => {
    if (parkingLot) setLotForm({ ...parkingLot })
  }, [parkingLot])

  const handleSaveLot = async () => {
    await updateParkingLot(lotForm)
    setEditingLot(false)
  }

  const handleSpotClick = (spot: any) => {
    setSelectedSpot(spot)
    setEditSpotForm({ type: spot.type, status: spot.status })
  }

  const handleUpdateSpot = async () => {
    if (selectedSpot) {
      await updateSpot(selectedSpot.id, editSpotForm)
      setSelectedSpot(null)
    }
  }

  const floors = Array.from({ length: parkingLot?.floors || 3 }, (_, i) => i + 1)

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">车位管理</h2>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">停车场信息</h3>
          <button
            onClick={() => editingLot ? handleSaveLot() : setEditingLot(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Edit2 size={14} />
            {editingLot ? '保存' : '编辑'}
          </button>
        </div>
        {parkingLot && (
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">名称</p>
              {editingLot ? (
                <input value={lotForm.name || ''} onChange={(e) => setLotForm({ ...lotForm, name: e.target.value })} className="w-full text-sm" />
              ) : (
                <p className="text-sm text-slate-200">{parkingLot.name}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">地址</p>
              {editingLot ? (
                <input value={lotForm.address || ''} onChange={(e) => setLotForm({ ...lotForm, address: e.target.value })} className="w-full text-sm" />
              ) : (
                <p className="text-sm text-slate-200">{parkingLot.address}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">总车位数</p>
              <p className="text-sm text-slate-200">{parkingLot.total_spots}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">楼层数</p>
              <p className="text-sm text-slate-200">{parkingLot.floors}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {floors.map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFloor(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFloor === f
                ? 'bg-emerald-500 text-white'
                : 'bg-[#1a1d2e] text-slate-400 border border-[#2a2d3e] hover:text-slate-200'
            }`}
          >
            B{f}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5">
        <h3 className="text-base font-semibold mb-4">B{selectedFloor}层 车位地图</h3>
        <div className="grid grid-cols-8 gap-2">
          {spots.map((spot: any) => {
            const typeConf = TYPE_CONFIG[spot.type] || TYPE_CONFIG.small
            return (
              <button
                key={spot.id}
                onClick={() => handleSpotClick(spot)}
                className={`relative aspect-square rounded-lg border-2 ${typeConf.border} ${STATUS_BG[spot.status]} flex flex-col items-center justify-center text-xs transition-all hover:scale-105 hover:shadow-lg cursor-pointer`}
              >
                <span className={`${STATUS_TEXT[spot.status]} font-bold`}>
                  {spot.zone}{spot.number}
                </span>
                <span className={`${STATUS_TEXT[spot.status]} text-[10px] mt-0.5`}>
                  {STATUS_LABEL[spot.status]}
                </span>
                {spot.type !== 'small' && (
                  <typeConf.icon size={10} className={`absolute top-1 right-1 ${STATUS_TEXT[spot.status]}`} />
                )}
              </button>
            )
          })}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-slate-500/50" />空闲</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20 border border-slate-500/50" />占用</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-slate-500/50" />预留</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-500/20 border border-slate-500/50" />故障</span>
        </div>
      </div>

      {selectedSpot && (() => {
        const spotVehicle = vehiclesPresent.find((v: any) => v.spot_id === selectedSpot.id)
        return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSpot(null)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">车位详情</h3>
              <button onClick={() => setSelectedSpot(null)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">车位编号</span>
                <span className="text-slate-200">B{selectedSpot.floor}-{selectedSpot.zone}{selectedSpot.number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">类型</span>
                <select value={editSpotForm.type} onChange={(e) => setEditSpotForm({ ...editSpotForm, type: e.target.value })} className="text-sm">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">状态</span>
                <select value={editSpotForm.status} onChange={(e) => setEditSpotForm({ ...editSpotForm, status: e.target.value })} className="text-sm">
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {spotVehicle && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">当前车辆</span>
                  <span className="text-red-400">{spotVehicle.plate_number}</span>
                </div>
              )}
              <button
                onClick={handleUpdateSpot}
                className="w-full mt-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}
