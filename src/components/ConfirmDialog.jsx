import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'حذف', loading = false }) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Dialog */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[340px] bg-white rounded-2xl p-5 z-50 shadow-xl"
        dir="rtl"
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-danger" />
        </div>

        {/* Title */}
        <h3 className="text-center text-base font-bold text-ink m-0 mb-2">{title}</h3>

        {/* Message */}
        <p className="text-center text-sm text-subtle m-0 mb-5 leading-relaxed">{message}</p>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-border bg-white text-ink font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl border-0 bg-danger text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : confirmText}
          </button>
        </div>
      </div>
    </>
  )
}
