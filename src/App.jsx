import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="app-container flex items-center justify-center">
        <div className="text-purple font-bold text-lg">جاري التحميل...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage onLogin={setSession} />
  }

  return <Dashboard session={session} onLogout={() => setSession(null)} />
}
