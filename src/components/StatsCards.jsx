import { FileText, CheckCircle, Clock } from 'lucide-react'

export default function StatsCards({ totalOrders, confirmedOrders, unconfirmedOrders }) {
  return (
    <div className="mb-7" dir="rtl">
      {/* Main Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white mb-3"
        style={{
          background: 'linear-gradient(135deg, #6734ff 0%, #8b5cf6 50%, #a78bfa 100%)',
          boxShadow: '0 8px 32px rgba(103, 52, 255, 0.3)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-5xl leading-none tracking-tight">
              {totalOrders}
            </div>
            <div className="text-sm text-white/80 mt-2 font-medium">إجمالي الطلبات</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
            <FileText size={28} strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* Sub Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-green-50 grid place-items-center shrink-0">
            <CheckCircle size={22} className="text-green-500" />
          </div>
          <div>
            <div className="text-2xl leading-none">{confirmedOrders}</div>
            <div className="text-xs text-subtle mt-1">مؤكد</div>
          </div>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 grid place-items-center shrink-0">
            <Clock size={22} className="text-amber-500" />
          </div>
          <div>
            <div className="text-2xl leading-none">{unconfirmedOrders}</div>
            <div className="text-xs text-subtle mt-1">غير مؤكد</div>
          </div>
        </div>
      </div>
    </div>
  )
}
