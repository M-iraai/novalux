import { FileText, TrendingUp } from 'lucide-react'

export default function StatsCards({ totalOrders }) {
  return (
    <div className="mb-7" dir="rtl">
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white"
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
            <div className="text-5xl font-extrabold leading-none tracking-tight">
              {totalOrders}
            </div>
            <div className="text-sm text-white/80 mt-2 font-medium">إجمالي الطلبات</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
            <FileText size={28} strokeWidth={1.8} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2 text-xs text-white/70">
          <TrendingUp size={14} />
          <span>إدارة طلباتك بسهولة</span>
        </div>
      </div>
    </div>
  )
}
