import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { Edit2, Plus, Trash2, X, Tag, Percent, Minus, Clock, Gauge } from 'lucide-react'

export default function BillingRules() {
  const { billingRules, coupons, pricingRules, loading,
    fetchBillingRules, updateBillingRule, fetchCoupons, createCoupon, updateCoupon, deleteCoupon,
    fetchPricingRules, createPricingRule, updatePricingRule, deletePricingRule } = useAppStore()

  const [editingRule, setEditingRule] = useState<number | null>(null)
  const [ruleForm, setRuleForm] = useState<any>({})
  const [couponModal, setCouponModal] = useState(false)
  const [couponForm, setCouponForm] = useState<any>({
    name: '', type: 'discount', value: 0, threshold: 0,
    valid_from: '', valid_to: '', active: true,
  })
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null)
  const [pricingModal, setPricingModal] = useState(false)
  const [editingPricingId, setEditingPricingId] = useState<number | null>(null)
  const [pricingForm, setPricingForm] = useState<any>({
    rule_name: '', date_type: 'weekday', date_start: '', date_end: '',
    time_start: '09:00', time_end: '18:00', rate_multiplier: 1.0,
    spot_type: 'all', priority: 1,
  })

  useEffect(() => {
    fetchBillingRules()
    fetchCoupons()
    fetchPricingRules()
  }, [])

  const handleEditRule = (rule: any) => {
    setEditingRule(rule.id)
    setRuleForm({ ...rule })
  }

  const handleSaveRule = async () => {
    if (editingRule) {
      await updateBillingRule(editingRule, ruleForm)
      setEditingRule(null)
    }
  }

  const handleOpenCouponModal = (coupon?: any) => {
    if (coupon) {
      setEditingCouponId(coupon.id)
      setCouponForm({ ...coupon })
    } else {
      setEditingCouponId(null)
      setCouponForm({ name: '', type: 'discount', value: 0, threshold: 0, valid_from: '', valid_to: '', active: true })
    }
    setCouponModal(true)
  }

  const handleSaveCoupon = async () => {
    if (editingCouponId) {
      await updateCoupon(editingCouponId, couponForm)
    } else {
      await createCoupon(couponForm)
    }
    setCouponModal(false)
  }

  const handleDeleteCoupon = async (id: number) => {
    await deleteCoupon(id)
  }

  const handleOpenPricingModal = (rule?: any) => {
    if (rule) {
      setEditingPricingId(rule.id)
      let date_type = 'custom'
      if (!rule.date_start && !rule.date_end) date_type = 'weekday'
      else if (rule.date_start === 'weekend') date_type = 'weekend'
      else if (rule.date_start === 'holiday') date_type = 'holiday'
      setPricingForm({
        rule_name: rule.rule_name,
        date_type,
        date_start: date_type === 'custom' ? rule.date_start : '',
        date_end: date_type === 'custom' ? rule.date_end : '',
        time_start: rule.time_start,
        time_end: rule.time_end,
        rate_multiplier: rule.rate_multiplier,
        spot_type: rule.spot_type,
        priority: rule.priority,
      })
    } else {
      setEditingPricingId(null)
      setPricingForm({
        rule_name: '', date_type: 'weekday', date_start: '', date_end: '',
        time_start: '09:00', time_end: '18:00', rate_multiplier: 1.0,
        spot_type: 'all', priority: 1,
      })
    }
    setPricingModal(true)
  }

  const handleSavePricing = async () => {
    let payload: any = {
      rule_name: pricingForm.rule_name,
      time_start: pricingForm.time_start,
      time_end: pricingForm.time_end,
      rate_multiplier: pricingForm.rate_multiplier,
      spot_type: pricingForm.spot_type,
      priority: pricingForm.priority,
    }
    if (pricingForm.date_type === 'weekday') {
      payload.date_start = null
      payload.date_end = null
    } else if (pricingForm.date_type === 'weekend') {
      payload.date_start = 'weekend'
      payload.date_end = 'weekend'
    } else if (pricingForm.date_type === 'holiday') {
      payload.date_start = 'holiday'
      payload.date_end = 'holiday'
    } else {
      payload.date_start = pricingForm.date_start
      payload.date_end = pricingForm.date_end
    }
    if (editingPricingId) {
      await updatePricingRule(editingPricingId, payload)
    } else {
      await createPricingRule(payload)
    }
    setPricingModal(false)
  }

  const handleDeletePricing = async (id: number) => {
    await deletePricingRule(id)
  }

  const getRateColor = (multiplier: number) => {
    if (multiplier < 0.5) return 'bg-emerald-700/80 text-emerald-100'
    if (multiplier < 0.8) return 'bg-emerald-600/70 text-emerald-100'
    if (multiplier < 1.0) return 'bg-emerald-500/60 text-emerald-100'
    if (multiplier === 1.0) return 'bg-slate-500/50 text-slate-200'
    if (multiplier <= 1.2) return 'bg-red-500/50 text-red-100'
    if (multiplier <= 1.5) return 'bg-red-500/70 text-red-100'
    if (multiplier <= 2.0) return 'bg-red-600/80 text-red-100'
    return 'bg-red-700 text-red-100'
  }

  const getRateBgColor = (multiplier: number) => {
    if (multiplier < 0.5) return 'bg-emerald-700'
    if (multiplier < 0.8) return 'bg-emerald-600'
    if (multiplier < 1.0) return 'bg-emerald-500'
    if (multiplier === 1.0) return 'bg-slate-500'
    if (multiplier <= 1.2) return 'bg-red-400'
    if (multiplier <= 1.5) return 'bg-red-500'
    if (multiplier <= 2.0) return 'bg-red-600'
    return 'bg-red-700'
  }

  const getRateTextColor = (multiplier: number) => {
    if (multiplier < 1.0) return 'text-emerald-400'
    if (multiplier === 1.0) return 'text-slate-300'
    return 'text-red-400'
  }

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const renderTimeline = (filter: (r: any) => boolean, label: string) => {
    const totalMinutes = 24 * 60
    const rules = pricingRules.filter(filter).sort((a, b) => b.priority - a.priority)
    const segments: { start: number; end: number; multiplier: number; name: string }[] = []
    for (let m = 0; m < totalMinutes; ) {
      let seg: any = null
      for (const r of rules) {
        const s = timeToMinutes(r.time_start)
        const e = timeToMinutes(r.time_end)
        if (m >= s && m < e) { seg = r; break }
      }
      if (!seg) {
        let end = totalMinutes
        for (const r of rules) {
          const s = timeToMinutes(r.time_start)
          if (s > m && s < end) end = s
        }
        segments.push({ start: m, end, multiplier: 1.0, name: '标准' })
        m = end
      } else {
        segments.push({ start: m, end: timeToMinutes(seg.time_end), multiplier: seg.rate_multiplier, name: seg.rule_name })
        m = timeToMinutes(seg.time_end)
      }
    }
    return (
      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1.5 font-medium">{label}</div>
        <div className="flex h-7 rounded-md overflow-hidden border border-[#2a2d3e]">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`${getRateBgColor(seg.multiplier)} flex items-center justify-center text-[10px] font-medium px-1 whitespace-nowrap cursor-pointer hover:brightness-110 transition-all`}
              style={{ width: `${((seg.end - seg.start) / totalMinutes) * 100}%` }}
              title={`${seg.name} ×${seg.multiplier} (${Math.floor(seg.start/60)}:${String(seg.start%60).padStart(2,'0')}-${Math.floor(seg.end/60)}:${String(seg.end%60).padStart(2,'0')})`}
            >
              {seg.end - seg.start >= 90 ? `×${seg.multiplier}` : ''}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-0.5">
          {['00','04','08','12','16','20','24'].map(h => <span key={h}>{h}:00</span>)}
        </div>
      </div>
    )
  }

  const formatDateLabel = (r: any) => {
    if (r.date_start === 'weekend' || r.date_end === 'weekend') return '周末'
    if (r.date_start === 'holiday' || r.date_end === 'holiday') return '节假日'
    if (!r.date_start && !r.date_end) return '工作日'
    return `${r.date_start || '-'} ~ ${r.date_end || '-'}`
  }

  const TYPE_LABELS: Record<string, string> = {
    small: '小型车位', large: '大型车位', ev: '新能源充电位', accessible: '无障碍车位', vip: 'VIP月租车位', all: '全部类型',
  }

  const SPOT_OPTIONS = ['all', 'small', 'large', 'ev', 'accessible', 'vip']

  return (
    <div className="animate-fade-in-up space-y-6">
      <h2 className="text-xl font-bold">计费规则</h2>

      <div>
        <h3 className="text-base font-semibold mb-4">费率配置</h3>
        <div className="grid grid-cols-3 gap-4">
          {billingRules.map((rule: any) => (
            <div key={rule.id} className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-200">{TYPE_LABELS[rule.spot_type] || rule.name}</h4>
                {editingRule === rule.id ? (
                  <button onClick={handleSaveRule} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">保存</button>
                ) : (
                  <button onClick={() => handleEditRule(rule)} className="text-slate-400 hover:text-emerald-400"><Edit2 size={14} /></button>
                )}
              </div>
              {editingRule === rule.id ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">免费时长(分)</span>
                    <input type="number" value={ruleForm.free_minutes} onChange={(e) => setRuleForm({ ...ruleForm, free_minutes: Number(e.target.value) })} className="w-20 text-sm text-right" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">每小时费率(元)</span>
                    <input type="number" value={ruleForm.hourly_rate} onChange={(e) => setRuleForm({ ...ruleForm, hourly_rate: Number(e.target.value) })} className="w-20 text-sm text-right" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">日封顶(元)</span>
                    <input type="number" value={ruleForm.daily_cap} onChange={(e) => setRuleForm({ ...ruleForm, daily_cap: Number(e.target.value) })} className="w-20 text-sm text-right" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">充电费(元)</span>
                    <input type="number" value={ruleForm.charging_fee} onChange={(e) => setRuleForm({ ...ruleForm, charging_fee: Number(e.target.value) })} className="w-20 text-sm text-right" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">免费时长</span>
                    <span className="text-emerald-400">{rule.free_minutes}分钟</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">每小时费率</span>
                    <span className="text-blue-400">¥{rule.hourly_rate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">日封顶</span>
                    <span className="text-amber-400">¥{rule.daily_cap}</span>
                  </div>
                  {rule.charging_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">充电费</span>
                      <span className="text-purple-400">¥{rule.charging_fee}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <Gauge size={16} className="text-blue-400" />
            分时费率配置
          </h3>
          <button
            onClick={() => handleOpenPricingModal()}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Plus size={14} /> 新增规则
          </button>
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-5 mb-4">
          <div className="flex items-center gap-6 mb-4 text-xs">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-slate-400">优惠 (× {'<'} 1.0)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-500" /><span className="text-slate-400">标准 (× 1.0)</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /><span className="text-slate-400">高峰 (× {'>'} 1.0)</span></div>
          </div>
          {renderTimeline((r: any) => !r.date_start && !r.date_end, '工作日')}
          {renderTimeline((r: any) => r.date_start === 'weekend' || r.date_end === 'weekend', '周末')}
          {renderTimeline((r: any) => r.date_start === 'holiday' || r.date_end === 'holiday', '节假日')}
          {renderTimeline((r: any) => r.date_start && r.date_start !== 'weekend' && r.date_start !== 'holiday', '自定义日期范围')}
        </div>

        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                <th className="text-left py-3 px-4 font-medium">规则名称</th>
                <th className="text-left py-3 px-4 font-medium">日期范围</th>
                <th className="text-left py-3 px-4 font-medium">时段</th>
                <th className="text-left py-3 px-4 font-medium">费率倍数</th>
                <th className="text-left py-3 px-4 font-medium">适用车位</th>
                <th className="text-left py-3 px-4 font-medium">优先级</th>
                <th className="text-left py-3 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">暂无分时费率规则</td></tr>
              )}
              {pricingRules.map((r: any) => (
                <tr key={r.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30">
                  <td className="py-3 px-4 text-slate-200 font-medium">{r.rule_name}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDateLabel(r)}</td>
                  <td className="py-3 px-4 text-slate-200">{r.time_start} - {r.time_end}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getRateColor(r.rate_multiplier)}`}>
                      ×{r.rate_multiplier}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{TYPE_LABELS[r.spot_type] || r.spot_type}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400">P{r.priority}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenPricingModal(r)} className="text-blue-400 hover:text-blue-300"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeletePricing(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">优惠券管理</h3>
          <button
            onClick={() => handleOpenCouponModal()}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Plus size={14} /> 添加优惠券
          </button>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-[#2a2d3e] bg-[#0f1117]">
                <th className="text-left py-3 px-4 font-medium">名称</th>
                <th className="text-left py-3 px-4 font-medium">类型</th>
                <th className="text-left py-3 px-4 font-medium">面值</th>
                <th className="text-left py-3 px-4 font-medium">门槛</th>
                <th className="text-left py-3 px-4 font-medium">有效期</th>
                <th className="text-left py-3 px-4 font-medium">状态</th>
                <th className="text-left py-3 px-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">暂无优惠券</td></tr>
              )}
              {coupons.map((c: any) => (
                <tr key={c.id} className="border-b border-[#2a2d3e]/50 hover:bg-[#2a2d3e]/30">
                  <td className="py-3 px-4 text-slate-200">{c.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.type === 'discount' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {c.type === 'discount' ? '折扣券' : '满减券'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200">{c.type === 'discount' ? `${c.value}折` : `¥${c.value}`}</td>
                  <td className="py-3 px-4 text-slate-400">¥{c.threshold}</td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{c.valid_from} ~ {c.valid_to}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {c.active ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenCouponModal(c)} className="text-blue-400 hover:text-blue-300"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {couponModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCouponModal(false)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{editingCouponId ? '编辑优惠券' : '添加优惠券'}</h3>
              <button onClick={() => setCouponModal(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">名称</label>
                <input value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">类型</label>
                <select value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })} className="w-full text-sm">
                  <option value="discount">折扣券</option>
                  <option value="reduction">满减券</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{couponForm.type === 'discount' ? '折扣(1-9.9)' : '减免金额'}</label>
                <input type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })} className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">使用门槛(元)</label>
                <input type="number" value={couponForm.threshold} onChange={(e) => setCouponForm({ ...couponForm, threshold: Number(e.target.value) })} className="w-full text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">生效日期</label>
                  <input type="date" value={couponForm.valid_from} onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })} className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">失效日期</label>
                  <input type="date" value={couponForm.valid_to} onChange={(e) => setCouponForm({ ...couponForm, valid_to: e.target.value })} className="w-full text-sm" />
                </div>
              </div>
              <button
                onClick={handleSaveCoupon}
                className="w-full py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                {editingCouponId ? '保存修改' : '创建优惠券'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPricingModal(false)}>
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 w-[480px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">{editingPricingId ? '编辑分时费率' : '新增分时费率'}</h3>
              <button onClick={() => setPricingModal(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">规则名称</label>
                <input value={pricingForm.rule_name} onChange={(e) => setPricingForm({ ...pricingForm, rule_name: e.target.value })} placeholder="例如：早高峰加价" className="w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">日期类型</label>
                <select value={pricingForm.date_type} onChange={(e) => setPricingForm({ ...pricingForm, date_type: e.target.value })} className="w-full text-sm">
                  <option value="weekday">工作日</option>
                  <option value="weekend">周末</option>
                  <option value="holiday">节假日</option>
                  <option value="custom">自定义日期范围</option>
                </select>
              </div>
              {pricingForm.date_type === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">开始日期</label>
                    <input type="date" value={pricingForm.date_start} onChange={(e) => setPricingForm({ ...pricingForm, date_start: e.target.value })} className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">结束日期</label>
                    <input type="date" value={pricingForm.date_end} onChange={(e) => setPricingForm({ ...pricingForm, date_end: e.target.value })} className="w-full text-sm" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">开始时间</label>
                  <input type="time" value={pricingForm.time_start} onChange={(e) => setPricingForm({ ...pricingForm, time_start: e.target.value })} className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">结束时间</label>
                  <input type="time" value={pricingForm.time_end} onChange={(e) => setPricingForm({ ...pricingForm, time_end: e.target.value })} className="w-full text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">费率倍数 ({getRateTextColor(pricingForm.rate_multiplier)})</label>
                <div className="flex items-center gap-3">
                  <input type="number" step={0.1} min={0} max={5} value={pricingForm.rate_multiplier} onChange={(e) => setPricingForm({ ...pricingForm, rate_multiplier: Number(e.target.value) })} className="flex-1 text-sm" />
                  <span className={`px-3 py-1.5 rounded text-sm font-semibold ${getRateColor(pricingForm.rate_multiplier)}`}>×{pricingForm.rate_multiplier}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">适用车位类型</label>
                <select value={pricingForm.spot_type} onChange={(e) => setPricingForm({ ...pricingForm, spot_type: e.target.value })} className="w-full text-sm">
                  {SPOT_OPTIONS.map(s => <option key={s} value={s}>{TYPE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">优先级 (数值越大越优先)</label>
                <input type="number" min={1} value={pricingForm.priority} onChange={(e) => setPricingForm({ ...pricingForm, priority: Number(e.target.value) })} className="w-full text-sm" />
              </div>
              <button
                onClick={handleSavePricing}
                className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors mt-2"
              >
                {editingPricingId ? '保存修改' : '创建规则'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
