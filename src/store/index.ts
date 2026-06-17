import { create } from 'zustand'
import { api } from '@/api'

interface AppState {
  parkingLot: any
  spots: any[]
  vehiclesPresent: any[]
  vehicleRecords: any[]
  billingRules: any[]
  coupons: any[]
  monthlyRentals: any[]
  expiringRentals: any[]
  reservations: any[]
  floorStatus: any[]
  statsOverview: any
  statsOccupancy: any
  statsRevenue: any
  statsTurnover: any
  statsPeakPrediction: any
  recommendedSpot: any
  loading: Record<string, boolean>
  selectedFloor: number
  selectedSpot: any | null
  visitors: any[]
  alerts: any[]
  alertsFilter: Record<string, any> | null
  pendingAlertsCount: number
  dailyReport: any
  plateRecords: any[]
  plateBlacklist: any[]
  plateWhitelist: any[]
  whitelistStatus: any
  pricingRules: any[]

  setSelectedFloor: (floor: number) => void
  setSelectedSpot: (spot: any | null) => void
  fetchParkingLot: () => Promise<void>
  updateParkingLot: (data: any) => Promise<void>
  fetchSpots: (params?: Record<string, any>) => Promise<void>
  updateSpot: (id: number, data: any) => Promise<void>
  batchUpdateSpots: (data: any) => Promise<void>
  vehicleEntry: (data: any) => Promise<any>
  vehicleExit: (data: any) => Promise<any>
  fetchVehiclesPresent: () => Promise<void>
  fetchVehicleRecords: (params?: Record<string, any>) => Promise<void>
  fetchBillingRules: () => Promise<void>
  updateBillingRule: (id: number, data: any) => Promise<void>
  calculateFee: (data: any) => Promise<any>
  fetchCoupons: () => Promise<void>
  createCoupon: (data: any) => Promise<void>
  updateCoupon: (id: number, data: any) => Promise<void>
  deleteCoupon: (id: number) => Promise<void>
  fetchGuidanceRecommend: () => Promise<void>
  fetchFloorStatus: () => Promise<void>
  fetchReservations: () => Promise<void>
  reserveSpot: (data: any) => Promise<void>
  cancelReservation: (id: number) => Promise<void>
  fetchMonthlyRentals: () => Promise<void>
  createMonthlyRental: (data: any) => Promise<void>
  updateMonthlyRental: (id: number, data: any) => Promise<void>
  deleteMonthlyRental: (id: number) => Promise<void>
  renewMonthlyRental: (id: number) => Promise<void>
  fetchExpiringRentals: () => Promise<void>
  fetchStatsOverview: () => Promise<void>
  fetchStatsOccupancy: () => Promise<void>
  fetchStatsRevenue: (params?: Record<string, any>) => Promise<void>
  fetchStatsTurnover: () => Promise<void>
  fetchStatsPeakPrediction: () => Promise<void>
  fetchVisitors: (params?: Record<string, any>) => Promise<void>
  createVisitor: (data: any) => Promise<void>
  updateVisitor: (id: number, data: any) => Promise<void>
  deleteVisitor: (id: number) => Promise<void>
  approveVisitor: (id: number) => Promise<void>
  rejectVisitor: (id: number) => Promise<void>
  visitorEntry: (data: any) => Promise<any>
  fetchAlerts: (params?: Record<string, any>) => Promise<void>
  fetchPendingAlertsCount: () => Promise<void>
  handleAlert: (id: number, data: any) => Promise<void>
  deleteAlert: (id: number) => Promise<void>
  fetchDailyReport: (params?: Record<string, any>) => Promise<void>
  exportDailyReport: (params?: Record<string, any>) => Promise<Blob>
  fetchPlateRecords: (params?: Record<string, any>) => Promise<void>
  addPlateRecord: (data: any) => Promise<void>
  fetchPlateBlacklist: (params?: Record<string, any>) => Promise<void>
  addPlateBlacklist: (data: any) => Promise<void>
  removePlateBlacklist: (id: number) => Promise<void>
  fetchPlateWhitelist: (params?: Record<string, any>) => Promise<void>
  fetchWhitelistStatus: (plate: string) => Promise<any>
  fetchPricingRules: () => Promise<void>
  createPricingRule: (data: any) => Promise<void>
  updatePricingRule: (id: number, data: any) => Promise<void>
  deletePricingRule: (id: number) => Promise<void>
}

const setLoading = (loading: Record<string, boolean>, key: string, value: boolean) => ({
  loading: { ...loading, [key]: value },
})

export const useAppStore = create<AppState>((set, get) => ({
  parkingLot: null,
  spots: [],
  vehiclesPresent: [],
  vehicleRecords: [],
  billingRules: [],
  coupons: [],
  monthlyRentals: [],
  expiringRentals: [],
  reservations: [],
  floorStatus: [],
  statsOverview: null,
  statsOccupancy: null,
  statsRevenue: null,
  statsTurnover: null,
  statsPeakPrediction: null,
  recommendedSpot: null,
  loading: {},
  selectedFloor: 1,
  selectedSpot: null,
  visitors: [],
  alerts: [],
  alertsFilter: null,
  pendingAlertsCount: 0,
  dailyReport: null,
  plateRecords: [],
  plateBlacklist: [],
  plateWhitelist: [],
  whitelistStatus: null,
  pricingRules: [],

  setSelectedFloor: (floor) => set({ selectedFloor: floor }),
  setSelectedSpot: (spot) => set({ selectedSpot: spot }),

  fetchParkingLot: async () => {
    set((s) => setLoading(s.loading, 'parkingLot', true))
    try {
      const data = await api.parkingLot.get()
      set({ parkingLot: data })
    } finally {
      set((s) => setLoading(s.loading, 'parkingLot', false))
    }
  },

  updateParkingLot: async (data) => {
    const res = await api.parkingLot.update(data)
    set({ parkingLot: res })
  },

  fetchSpots: async (params) => {
    set((s) => setLoading(s.loading, 'spots', true))
    try {
      const data = await api.spots.list(params)
      set({ spots: data.map((sp: any) => ({ ...sp, type: sp.spot_type ?? sp.type })) })
    } finally {
      set((s) => setLoading(s.loading, 'spots', false))
    }
  },

  updateSpot: async (id, data) => {
    const res = await api.spots.update(id, data)
    set((s) => ({ spots: s.spots.map((sp: any) => sp.id === id ? res : sp) }))
  },

  batchUpdateSpots: async (data) => {
    await api.spots.batchUpdate(data)
    await get().fetchSpots({ floor: get().selectedFloor })
  },

  vehicleEntry: async (data) => {
    const res: any = await api.vehicles.entry(data)
    if (res && (res.blacklist || !res.success)) {
      return res
    }
    await get().fetchSpots({ floor: get().selectedFloor })
    await get().fetchVehiclesPresent()
    return res
  },

  vehicleExit: async (data) => {
    const res = await api.vehicles.exit(data)
    await get().fetchSpots({ floor: get().selectedFloor })
    await get().fetchVehiclesPresent()
    return res
  },

  fetchVehiclesPresent: async () => {
    set((s) => setLoading(s.loading, 'vehiclesPresent', true))
    try {
      const data = await api.vehicles.present()
      set({ vehiclesPresent: data })
    } finally {
      set((s) => setLoading(s.loading, 'vehiclesPresent', false))
    }
  },

  fetchVehicleRecords: async (params) => {
    set((s) => setLoading(s.loading, 'vehicleRecords', true))
    try {
      const data = await api.vehicles.records(params) as any
      set({ vehicleRecords: Array.isArray(data) ? data : data?.records || [] })
    } finally {
      set((s) => setLoading(s.loading, 'vehicleRecords', false))
    }
  },

  fetchBillingRules: async () => {
    set((s) => setLoading(s.loading, 'billingRules', true))
    try {
      const data = await api.billing.getRules()
      set({ billingRules: data })
    } finally {
      set((s) => setLoading(s.loading, 'billingRules', false))
    }
  },

  updateBillingRule: async (id, data) => {
    const res = await api.billing.updateRule(id, data)
    set((s) => ({ billingRules: s.billingRules.map((r: any) => r.id === id ? res : r) }))
  },

  calculateFee: async (data) => {
    return await api.billing.calculate(data)
  },

  fetchCoupons: async () => {
    set((s) => setLoading(s.loading, 'coupons', true))
    try {
      const data = await api.billing.getCoupons()
      const now = new Date().toISOString()
      set({ coupons: data.map((c: any) => ({
        ...c,
        threshold: c.min_amount ?? c.threshold ?? 0,
        type: c.type === '满减' ? 'reduction' : c.type === '折扣' ? 'discount' : c.type,
        active: c.active !== undefined ? c.active : (c.valid_from && c.valid_to ? (now >= c.valid_from && now <= c.valid_to) : true),
      })) })
    } finally {
      set((s) => setLoading(s.loading, 'coupons', false))
    }
  },

  createCoupon: async (data) => {
    const payload = {
      ...data,
      type: data.type === 'reduction' ? '满减' : data.type === 'discount' ? '折扣' : data.type,
      min_amount: data.min_amount ?? data.threshold ?? 0,
    }
    await api.billing.createCoupon(payload)
    await get().fetchCoupons()
  },

  updateCoupon: async (id, data) => {
    const payload = {
      ...data,
      type: data.type === 'reduction' ? '满减' : data.type === 'discount' ? '折扣' : data.type,
      min_amount: data.min_amount ?? data.threshold ?? 0,
    }
    await api.billing.updateCoupon(id, payload)
    await get().fetchCoupons()
  },

  deleteCoupon: async (id) => {
    await api.billing.deleteCoupon(id)
    await get().fetchCoupons()
  },

  fetchGuidanceRecommend: async () => {
    const data = await api.guidance.recommend()
    set({ recommendedSpot: data })
  },

  fetchFloorStatus: async () => {
    const data = await api.guidance.floorStatus()
    set({ floorStatus: data })
  },

  fetchReservations: async () => {
    const data = await api.guidance.reservations()
    set({ reservations: data })
  },

  reserveSpot: async (data) => {
    await api.guidance.reserve(data)
    await get().fetchFloorStatus()
    await get().fetchReservations()
  },

  cancelReservation: async (id) => {
    await api.guidance.cancelReservation(id)
    await get().fetchFloorStatus()
    await get().fetchReservations()
  },

  fetchMonthlyRentals: async () => {
    set((s) => setLoading(s.loading, 'monthlyRentals', true))
    try {
      const data = await api.monthly.list()
      set({ monthlyRentals: data.map((r: any) => ({ ...r, owner_name: r.owner_name ?? r.name, monthly_fee: r.monthly_fee ?? 300 })) })
    } finally {
      set((s) => setLoading(s.loading, 'monthlyRentals', false))
    }
  },

  createMonthlyRental: async (data) => {
    const payload = { ...data, name: data.name ?? data.owner_name }
    await api.monthly.create(payload)
    await get().fetchMonthlyRentals()
  },

  updateMonthlyRental: async (id, data) => {
    const payload = { ...data, name: data.name ?? data.owner_name }
    await api.monthly.update(id, payload)
    await get().fetchMonthlyRentals()
  },

  deleteMonthlyRental: async (id) => {
    await api.monthly.delete(id)
    await get().fetchMonthlyRentals()
  },

  renewMonthlyRental: async (id) => {
    await api.monthly.renew(id)
    await get().fetchMonthlyRentals()
  },

  fetchExpiringRentals: async () => {
    const data = await api.monthly.expiring()
    set({ expiringRentals: data.map((r: any) => ({ ...r, owner_name: r.owner_name ?? r.name })) })
  },

  fetchStatsOverview: async () => {
    set((s) => setLoading(s.loading, 'statsOverview', true))
    try {
      const data = await api.stats.overview()
      set({ statsOverview: {
        ...data,
        todayEntries: data.todayEntries ?? data.entryCount,
        todayExits: data.todayExits ?? data.exitCount,
        presentVehicles: data.presentVehicles ?? data.occupiedSpots,
      } })
    } finally {
      set((s) => setLoading(s.loading, 'statsOverview', false))
    }
  },

  fetchStatsOccupancy: async () => {
    const data = await api.stats.occupancy()
    const statusDistribution = data.statusDistribution
      ?? (data.statusMap ? Object.entries(data.statusMap).map(([status, count]) => ({ status, count })) : undefined)
    const hourlyTrend = data.hourlyTrend?.map((h: any) => {
      const total = (h.entries || 0) + (h.exits || 0)
      const rate = h.rate != null ? h.rate : Math.min(100, Math.round(total * 3))
      return { ...h, hour: h.hour, rate }
    })
    set({ statsOccupancy: { ...data, statusDistribution, hourlyTrend } })
  },

  fetchStatsRevenue: async (params) => {
    const data = await api.stats.revenue(params)
    const transformed = { ...data }
    if (transformed.dailyRevenue) {
      transformed.dailyRevenue = transformed.dailyRevenue.map((d: any) => ({ ...d, amount: d.amount ?? d.revenue }))
    }
    if (transformed.data) {
      transformed.data = transformed.data.map((d: any) => ({ ...d, amount: d.amount ?? d.revenue }))
    }
    set({ statsRevenue: transformed })
  },

  fetchStatsTurnover: async () => {
    const data = await api.stats.turnover()
    set({ statsTurnover: {
      ...data,
      avgDuration: data.avgDuration ?? (data.avgDurationMinutes != null ? +(data.avgDurationMinutes / 60).toFixed(1) : undefined),
      turnoverRate: data.turnoverRate,
    } })
  },

  fetchStatsPeakPrediction: async () => {
    const data = await api.stats.peakPrediction()
    const peakHours = data.peakHours || data.peakHour || []
    const peakHourStr = peakHours.length > 0 
      ? `${String(peakHours[0]).padStart(2, '0')}:00-${String(peakHours[0] + 1).padStart(2, '0')}:00`
      : '10:00-12:00'
    const peakRate = data.peakRate ?? data.peakOccupancyRate ?? 85
    set({ statsPeakPrediction: {
      ...data,
      peakHour: peakHourStr,
      peakRate,
    } })
  },

  fetchVisitors: async (params) => {
    set((s) => setLoading(s.loading, 'visitors', true))
    try {
      const data = await api.visitors.list(params)
      set({ visitors: data })
    } finally {
      set((s) => setLoading(s.loading, 'visitors', false))
    }
  },

  createVisitor: async (data) => {
    await api.visitors.create(data)
    await get().fetchVisitors()
  },

  updateVisitor: async (id, data) => {
    await api.visitors.update(id, data)
    await get().fetchVisitors()
  },

  deleteVisitor: async (id) => {
    await api.visitors.remove(id)
    await get().fetchVisitors()
  },

  approveVisitor: async (id) => {
    await api.visitors.approve(id)
    await get().fetchVisitors()
  },

  rejectVisitor: async (id) => {
    await api.visitors.reject(id)
    await get().fetchVisitors()
  },

  visitorEntry: async (data) => {
    const res = await api.visitors.entry(data)
    await get().fetchVisitors()
    await get().fetchVehiclesPresent()
    return res
  },

  fetchAlerts: async (params) => {
    set((s) => setLoading(s.loading, 'alerts', true))
    try {
      const data = await api.alerts.list(params)
      set({ alerts: data, alertsFilter: params ?? null })
    } finally {
      set((s) => setLoading(s.loading, 'alerts', false))
    }
  },

  fetchPendingAlertsCount: async () => {
    const data = await api.alerts.getPendingCount()
    set({ pendingAlertsCount: typeof data === 'number' ? data : (data as any)?.count ?? 0 })
  },

  handleAlert: async (id, data) => {
    await api.alerts.handle(id, data)
    const currentFilter = get().alertsFilter
    await get().fetchAlerts(currentFilter ?? undefined)
    await get().fetchPendingAlertsCount()
  },

  deleteAlert: async (id) => {
    await api.alerts.remove(id)
    const currentFilter = get().alertsFilter
    await get().fetchAlerts(currentFilter ?? undefined)
    await get().fetchPendingAlertsCount()
  },

  fetchDailyReport: async (params) => {
    set((s) => setLoading(s.loading, 'dailyReport', true))
    try {
      const data = await api.reports.getDaily(params)
      set({ dailyReport: data })
    } finally {
      set((s) => setLoading(s.loading, 'dailyReport', false))
    }
  },

  exportDailyReport: async (params) => {
    return await api.reports.exportDaily(params)
  },

  fetchPlateRecords: async (params) => {
    set((s) => setLoading(s.loading, 'plateRecords', true))
    try {
      const data = await api.plates.getRecords(params)
      set({ plateRecords: data })
    } finally {
      set((s) => setLoading(s.loading, 'plateRecords', false))
    }
  },

  addPlateRecord: async (data) => {
    await api.plates.addRecord(data)
    await get().fetchPlateRecords()
  },

  fetchPlateBlacklist: async (params) => {
    set((s) => setLoading(s.loading, 'plateBlacklist', true))
    try {
      const data = await api.plates.getBlacklist(params)
      set({ plateBlacklist: data })
    } finally {
      set((s) => setLoading(s.loading, 'plateBlacklist', false))
    }
  },

  addPlateBlacklist: async (data) => {
    await api.plates.addBlacklist(data)
    await get().fetchPlateBlacklist()
  },

  removePlateBlacklist: async (id) => {
    await api.plates.removeBlacklist(id)
    await get().fetchPlateBlacklist()
  },

  fetchPlateWhitelist: async (params) => {
    set((s) => setLoading(s.loading, 'plateWhitelist', true))
    try {
      const data = await api.plates.getWhitelist(params)
      set({ plateWhitelist: data })
    } finally {
      set((s) => setLoading(s.loading, 'plateWhitelist', false))
    }
  },

  fetchWhitelistStatus: async (plate) => {
    const data = await api.plates.getWhitelistStatus(plate)
    set({ whitelistStatus: data })
    return data
  },

  fetchPricingRules: async () => {
    set((s) => setLoading(s.loading, 'pricingRules', true))
    try {
      const data = await api.billing.getPricingRules()
      set({ pricingRules: data })
    } finally {
      set((s) => setLoading(s.loading, 'pricingRules', false))
    }
  },

  createPricingRule: async (data) => {
    await api.billing.createPricingRule(data)
    await get().fetchPricingRules()
  },

  updatePricingRule: async (id, data) => {
    await api.billing.updatePricingRule(id, data)
    await get().fetchPricingRules()
  },

  deletePricingRule: async (id) => {
    await api.billing.deletePricingRule(id)
    await get().fetchPricingRules()
  },
}))
