import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem('pwa-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log('Install outcome:', outcome)
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setDismissed(true)
    localStorage.setItem('pwa-dismissed', 'true')
  }

  if (!showBanner || dismissed) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[400px]" dir="rtl">
      <div className="bg-white border border-border rounded-2xl p-4 shadow-lg shadow-black/10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lav text-purple grid place-items-center shrink-0">
          <Download size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-ink">تثبيت التطبيق</div>
          <div className="text-xs text-subtle mt-0.5">أضف متجري للشاشة الرئيسية</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="h-9 px-4 rounded-lg bg-purple text-white text-xs font-bold border-0 hover:bg-purple-2 transition-colors"
          >
            تثبيت
          </button>
          <button
            onClick={handleDismiss}
            className="w-9 h-9 rounded-lg bg-gray-100 text-muted grid place-items-center border-0 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
