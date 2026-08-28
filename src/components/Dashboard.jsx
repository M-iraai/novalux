import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LayoutGrid, ClipboardList } from 'lucide-react'
import StatsCards from './StatsCards'
import OrdersSection from './OrdersSection'
import InstallPrompt from './InstallPrompt'
import Toast from './Toast'

export default function Dashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('home')
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState({ show: false, message: '' })

  const showToast = (message) => {
    setToast({ show: true, message })
    setTimeout(() => setToast({ show: false, message: '' }), 2500)
  }

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
    if (data) setOrders(data)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: LayoutGrid },
    { id: 'orders', label: 'الطلبات', icon: ClipboardList },
  ]

  return (
    <div className="app-container" dir="rtl">
      <main>
        {/* Home Tab */}
        {activeTab === 'home' && (
          <>
            <h1 className="text-[27px] font-extrabold tracking-tight mt-3 mb-0.5">مرحباً بك!</h1>
            <div className="text-[15px] text-subtle2 mb-6">إدارة طلباتك بسهولة.</div>
            <StatsCards
              totalOrders={orders.length}
              confirmedOrders={orders.filter(o => o.confirmed).length}
              unconfirmedOrders={orders.filter(o => !o.confirmed).length}
            />


          </>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            <h1 className="text-[27px] font-extrabold tracking-tight mt-3 mb-0.5">الطلبات</h1>
            <div className="text-[15px] text-subtle2 mb-6">إدارة طلباتك اليومية.</div>
            <OrdersSection
              orders={orders}
              full
              onRefresh={fetchOrders}
              showToast={showToast}
            />
          </>
        )}
      </main>

      {/* Bottom Nav */}
      <div className="bottom-nav-container">
        <div className="grid grid-cols-2 gap-1" dir="rtl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-0 min-h-[61px] flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-lav text-purple font-bold'
                  : 'bg-white text-subtle2'
              }`}
              style={{ borderRadius: '10px' }}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.2 : 1.8} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Toast show={toast.show} message={toast.message} />
      <InstallPrompt />
    </div>
  )
}
