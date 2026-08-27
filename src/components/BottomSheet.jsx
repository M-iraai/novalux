import { X } from 'lucide-react'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="sheet-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app bg-white rounded-t-20px p-4 pb-6 z-50"
        dir="rtl"
        style={{ maxWidth: 'min(100%, 430px)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="m-0 text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-0 hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
