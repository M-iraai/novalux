import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShoppingBag, LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    onLogin(data.session)
  }

  return (
    <div className="app-container flex flex-col items-center justify-center min-h-screen" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShoppingBag className="w-7 h-7 text-purple" strokeWidth={1.8} />
          <span className="text-2xl font-extrabold text-purple">متجري</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold text-ink mb-2 text-center">تسجيل الدخول</h1>
        <p className="text-subtle text-sm mb-8 text-center">أدخل بياناتك للوصول إلى لوحة التحكم</p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-lg p-3 mb-4 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1.5 text-ink">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full h-11 border border-border rounded-lg px-3 outline-none focus:border-purple transition-colors text-sm"
              dir="ltr"
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold mb-1.5 text-ink">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 border border-border rounded-lg px-3 pl-10 outline-none focus:border-purple transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-purple text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-purple-2 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span>جاري الدخول...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>دخول</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
