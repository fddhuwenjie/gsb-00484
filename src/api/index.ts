const BASE = ''

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!res.ok) {
    if (json.blacklist || json.error?.includes('黑名单')) {
      return json as T
    }
    throw new Error(json.error || `API Error: ${res.status}`)
  }
  if (json.success && json.data !== undefined) return json.data
  return json
}

async function requestBlob(url: string, options?: RequestInit): Promise<Blob> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  return await res.blob()
}

export const api = {
  parkingLot: {
    get: () => request<any>('/api/parking-lot'),
    update: (data: any) => request<any>('/api/parking-lot', { method: 'PUT', body: JSON.stringify(data) }),
  },
  spots: {
    list: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/spots${qs}`)
    },
    get: (id: number) => request<any>(`/api/spots/${id}`),
    update: (id: number, data: any) => request<any>(`/api/spots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    batchUpdate: (data: any) => request<any>('/api/spots/batch', { method: 'PUT', body: JSON.stringify(data) }),
  },
  vehicles: {
    entry: (data: any) => request<any>('/api/vehicles/entry', { method: 'POST', body: JSON.stringify(data) }),
    exit: (data: any) => request<any>('/api/vehicles/exit', { method: 'POST', body: JSON.stringify(data) }),
    present: () => request<any[]>('/api/vehicles/present'),
    records: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/vehicles/records${qs}`)
    },
  },
  billing: {
    getRules: () => request<any[]>('/api/billing/rules'),
    updateRule: (id: number, data: any) => request<any>(`/api/billing/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    calculate: (data: any) => request<any>('/api/billing/calculate', { method: 'POST', body: JSON.stringify(data) }),
    getCoupons: () => request<any[]>('/api/coupons'),
    createCoupon: (data: any) => request<any>('/api/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id: number, data: any) => request<any>(`/api/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCoupon: (id: number) => request<void>(`/api/coupons/${id}`, { method: 'DELETE' }),
    getPricingRules: () => request<any[]>('/api/pricing-rules'),
    createPricingRule: (data: any) => request<any>('/api/pricing-rules', { method: 'POST', body: JSON.stringify(data) }),
    updatePricingRule: (id: number, data: any) => request<any>(`/api/pricing-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePricingRule: (id: number) => request<void>(`/api/pricing-rules/${id}`, { method: 'DELETE' }),
  },
  guidance: {
    recommend: () => request<any>('/api/guidance/recommend'),
    floorStatus: () => request<any[]>('/api/guidance/floor-status'),
    reservations: () => request<any[]>('/api/guidance/reservations'),
    reserve: (data: any) => request<any>('/api/guidance/reserve', { method: 'POST', body: JSON.stringify(data) }),
    cancelReservation: (id: number) => request<void>(`/api/guidance/reserve/${id}`, { method: 'DELETE' }),
  },
  monthly: {
    list: () => request<any[]>('/api/monthly'),
    create: (data: any) => request<any>('/api/monthly', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/api/monthly/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => request<void>(`/api/monthly/${id}`, { method: 'DELETE' }),
    renew: (id: number) => request<any>(`/api/monthly/${id}/renew`, { method: 'POST' }),
    expiring: () => request<any[]>('/api/monthly/expiring'),
  },
  stats: {
    overview: () => request<any>('/api/stats/overview'),
    occupancy: () => request<any>('/api/stats/occupancy'),
    revenue: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any>(`/api/stats/revenue${qs}`)
    },
    turnover: () => request<any>('/api/stats/turnover'),
    peakPrediction: () => request<any>('/api/stats/peak-prediction'),
  },
  visitors: {
    list: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/visitors${qs}`)
    },
    create: (data: any) => request<any>('/api/visitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => request<any>(`/api/visitors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/api/visitors/${id}`, { method: 'DELETE' }),
    approve: (id: number) => request<any>(`/api/visitors/${id}/approve`, { method: 'PUT' }),
    reject: (id: number) => request<any>(`/api/visitors/${id}/reject`, { method: 'PUT' }),
    entry: (data: any) => request<any>('/api/visitors/entry', { method: 'POST', body: JSON.stringify(data) }),
  },
  alerts: {
    list: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/alerts${qs}`)
    },
    getPendingCount: () => request<number>('/api/alerts/pending-count'),
    handle: (id: number, data: any) => request<any>(`/api/alerts/${id}/handle`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/api/alerts/${id}`, { method: 'DELETE' }),
  },
  reports: {
    getDaily: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any>(`/api/reports/daily${qs}`)
    },
    exportDaily: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return requestBlob(`/api/reports/daily/export${qs}`)
    },
  },
  plates: {
    getRecords: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/plates/records${qs}`)
    },
    addRecord: (data: any) => request<any>('/api/plates/records', { method: 'POST', body: JSON.stringify(data) }),
    getBlacklist: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/plates/blacklist${qs}`)
    },
    addBlacklist: (data: any) => request<any>('/api/plates/blacklist', { method: 'POST', body: JSON.stringify(data) }),
    removeBlacklist: (id: number) => request<void>(`/api/plates/blacklist/${id}/remove`, { method: 'PUT' }),
    getWhitelist: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<any[]>(`/api/plates/whitelist${qs}`)
    },
    getWhitelistStatus: (plate: string) => request<any>(`/api/plates/whitelist/status?plate=${encodeURIComponent(plate)}`),
  },
}
