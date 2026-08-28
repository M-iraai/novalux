import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  ChevronDown, Trash2, Plus, Search,
  ShoppingCart, X, Pencil, Phone, MapPin, Ruler, ImageIcon, Download
} from 'lucide-react'
import BottomSheet from './BottomSheet'
import LazyImage from './LazyImage'
import ConfirmDialog from './ConfirmDialog'
import { useDebounce } from '../hooks/useDebounce'
import { compressImage } from '../utils/compressImage'

// image_url in DB is the R2 key (e.g. products/123-abc.png)
function getImageUrl(storedValue) {
  if (!storedValue) return null
  // Already a full URL (old images or direct R2 URLs)
  if (storedValue.startsWith('http')) return storedValue
  // R2 key → use API proxy (works on both localhost and Vercel)
  return `/api/image?key=${encodeURIComponent(storedValue)}`
}

function groupOrdersByDay(orders) {
  const groups = {}
  orders.forEach(order => {
    const d = new Date(order.created_at)
    const key = d.toDateString()
    if (!groups[key]) groups[key] = { date: d, orders: [] }
    groups[key].orders.push(order)
  })
  return Object.values(groups).sort((a, b) => b.date - a.date)
}

function getDayLabel(date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'اليوم'
  if (diffDays === 1) return 'أمس'
  if (diffDays < 7) return `منذ ${diffDays} أيام`
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isOlderThan7Days(date) {
  return (new Date() - new Date(date)) >= 7 * 24 * 60 * 60 * 1000
}

function formatDateFull(date) {
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatFileSize(bytes) {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function getImageFileSize(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const len = res.headers.get('content-length')
    return len ? parseInt(len, 10) : null
  } catch { return null }
}

async function downloadImage(url, filename, orderSize, orderColor) {
  try {
    // Build label from order details
    const parts = []
    if (orderSize) parts.push(orderSize)
    if (orderColor) parts.push(orderColor)
    const label = parts.join(' / ')

    // Fetch image as blob (avoids CORS issues)
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)

    // Load into an Image element
    const img = new Image()
    img.src = blobUrl
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Image failed to load'))
    })

    // Draw on canvas
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 600
    canvas.height = img.naturalHeight || 600
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(blobUrl)

    // Draw order size/color badge
    if (label) {
      const fontSize = Math.max(16, Math.round(canvas.width / 18))
      const pad = fontSize * 0.7
      ctx.font = `bold ${fontSize}px Arial, sans-serif`
      const tw = ctx.measureText(label).width
      const bw = tw + pad * 2
      const bh = fontSize + pad * 2
      const bx = canvas.width - bw - pad
      const by = canvas.height - bh - pad
      const cr = bh / 2

      // Pill background
      ctx.fillStyle = 'rgba(0,0,0,0.75)'
      ctx.beginPath()
      ctx.moveTo(bx + cr, by)
      ctx.lineTo(bx + bw - cr, by)
      ctx.arcTo(bx + bw, by, bx + bw, by + cr, cr)
      ctx.arcTo(bx + bw, by + bh, bx + bw - cr, by + bh, cr)
      ctx.lineTo(bx + cr, by + bh)
      ctx.arcTo(bx, by + bh, bx, by + bh - cr, cr)
      ctx.arcTo(bx, by, bx + cr, by, cr)
      ctx.closePath()
      ctx.fill()

      // Text
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, bx + pad, by + bh / 2)
    }

    // Export as data URL and trigger download
    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename || 'image.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (err) {
    console.error('Download with text failed, downloading original:', err)
    // Fallback: download original without text
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename || 'image.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e2) {
      console.error('Fallback download also failed:', e2)
    }
  }
}

async function uploadToR2(file) {
  // Compress and convert to WebP before uploading
  const compressed = await compressImage(file)

  // Upload file through Vercel serverless function (no CORS issues)
  const res = await fetch(`/api/upload?filename=${encodeURIComponent(compressed.name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': compressed.type || 'application/octet-stream',
      'X-Filename': compressed.name,
    },
    body: compressed,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to upload to R2')
  return data.key
}

async function deleteFromR2(storedValue) {
  if (!storedValue) return
  // Extract key — could be a full URL or just the key
  let key = storedValue
  if (storedValue.startsWith('http')) {
    try {
      const url = new URL(storedValue)
      const idx = url.pathname.indexOf('/products/')
      key = idx !== -1 ? url.pathname.slice(idx + 1) : url.pathname.slice(1)
    } catch {}
  }
  try {
    await fetch('/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
  } catch (err) {
    console.error('R2 delete error:', err)
  }
}

const emptyItem = () => ({
  id: Date.now() + Math.random(),
  imageFile: null,
  imagePreview: null,
  color: '',
  size: '',
})

const emptyCustomer = { customer_name: '', phone: '', address: '', delivery_type: 'home' }

export default function OrdersSection({ orders, compact, full, onRefresh, showToast }) {
  const [openDays, setOpenDays] = useState({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [customer, setCustomer] = useState(emptyCustomer)
  const [items, setItems] = useState([emptyItem()])
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [showCount, setShowCount] = useState(20)
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', confirmText: 'حذف', onConfirm: null })
  const [deleting, setDeleting] = useState(false)
  const [imageSizes, setImageSizes] = useState({})
  const debouncedSearch = useDebounce(searchQuery, 300)

  const filteredOrders = useMemo(() => {
    if (!debouncedSearch.trim()) return orders
    const q = debouncedSearch.toLowerCase()
    return orders.filter(o =>
      o.customer_name?.toLowerCase().includes(q) ||
      o.phone?.includes(q)
    )
  }, [orders, debouncedSearch])

  const allDayGroups = useMemo(() => groupOrdersByDay(filteredOrders), [filteredOrders])
  const dayGroups = useMemo(() => allDayGroups.slice(0, showCount), [allDayGroups, showCount])

  // Fetch image file sizes for visible orders
  useEffect(() => {
    dayGroups.forEach(group => {
      group.orders.forEach(order => {
        if (order.image_url && !imageSizes[order.id]) {
          const url = getImageUrl(order.image_url)
          if (url && !url.startsWith('blob:')) {
            getImageFileSize(url).then(size => {
              if (size != null) setImageSizes(prev => ({ ...prev, [order.id]: size }))
            })
          }
        }
      })
    })
  }, [dayGroups, imageSizes])

  const toggleDay = (key) => {
    setOpenDays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const openAddOrder = () => {
    setEditingOrder(null)
    setCustomer(emptyCustomer)
    setItems([emptyItem()])
    setSheetOpen(true)
  }

  const openEditOrder = (order) => {
    setEditingOrder(order)
    setCustomer({
      customer_name: order.customer_name || '',
      phone: order.phone || '',
      address: order.address || '',
      delivery_type: order.delivery_type || 'home',
    })
    setItems([{
      id: Date.now(),
      imageFile: null,
      imagePreview: order.image_url ? getImageUrl(order.image_url) : null,
      color: order.color || '',
      size: order.size || '',
    }])
    setSheetOpen(true)
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (itemId) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== itemId) : prev)
  const updateItem = (itemId, field, value) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))
  }

  const handleItemImage = (itemId, e) => {
    const file = e.target.files?.[0]
    if (file) {
      updateItem(itemId, 'imageFile', file)
      updateItem(itemId, 'imagePreview', URL.createObjectURL(file))
    }
  }

  const removeItemImage = (itemId) => {
    updateItem(itemId, 'imageFile', null)
    updateItem(itemId, 'imagePreview', null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!customer.customer_name.trim() || !customer.phone.trim()) return

    setSaving(true)
    try {
      if (editingOrder) {
        const item = items[0]
        let imageUrl = editingOrder.image_url || null

        if (item.imageFile) {
          if (editingOrder.image_url) await deleteFromR2(editingOrder.image_url)
          try { imageUrl = await uploadToR2(item.imageFile) }
          catch { showToast('الصورة لم تُرفع — تم الحفظ بدون صورة') }
        } else if (!item.imagePreview && editingOrder.image_url) {
          await deleteFromR2(editingOrder.image_url)
          imageUrl = null
        }

        const { error } = await supabase.from('orders').update({
          customer_name: customer.customer_name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          delivery_type: customer.delivery_type,
          color: item.color.trim(),
          size: item.size.trim(),
          image_url: imageUrl,
        }).eq('id', editingOrder.id)
        if (error) throw error
        showToast('تم تعديل الطلب بنجاح')
      } else {
        const rows = []
        for (const item of items) {
          let imageUrl = null
          if (item.imageFile) {
            try { imageUrl = await uploadToR2(item.imageFile) }
            catch { showToast('الصورة لم تُرفع — تم الحفظ بدون صورة') }
          }
          rows.push({
            customer_name: customer.customer_name.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim(),
            delivery_type: customer.delivery_type,
            color: item.color.trim(),
            size: item.size.trim(),
            image_url: imageUrl,
          })
        }
        const { error } = await supabase.from('orders').insert(rows)
        if (error) throw error
        showToast(`تمت إضافة ${rows.length} طلب بنجاح`)
      }
      setSheetOpen(false)
      onRefresh()
    } catch (err) {
      console.error(err)
      showToast(`خطأ: ${err.message || 'حاول مرة أخرى'}`)
    }
    setSaving(false)
  }

  const handleDeleteOrder = (order) => {
    setConfirmDialog({
      open: true,
      title: 'حذف الطلب',
      message: `هل تريد حذف طلب "${order.customer_name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      onConfirm: async () => {
        setDeleting(true)
        if (order.image_url) await deleteFromR2(order.image_url)
        const { error } = await supabase.from('orders').delete().eq('id', order.id)
        setDeleting(false)
        setConfirmDialog(prev => ({ ...prev, open: false }))
        if (!error) { showToast('تم حذف الطلب'); onRefresh() }
      },
    })
  }

  const handleDeleteDay = (dayDate, ordersList) => {
    if (!isOlderThan7Days(dayDate)) {
      showToast('يمكنك حذف الطلبات التي مضى عليها 7 أيام فقط')
      return
    }
    setConfirmDialog({
      open: true,
      title: `حذف طلبات ${getDayLabel(dayDate)}`,
      message: `هل تريد حذف جميع طلبات ${getDayLabel(dayDate)} (${ordersList.length} طلب)؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: `حذف ${ordersList.length} طلب`,
      onConfirm: async () => {
        setDeleting(true)
        for (const o of ordersList) { if (o.image_url) await deleteFromR2(o.image_url) }
        const ids = ordersList.map(o => o.id)
        const { error } = await supabase.from('orders').delete().in('id', ids)
        setDeleting(false)
        setConfirmDialog(prev => ({ ...prev, open: false }))
        if (!error) { showToast(`تم حذف ${ids.length} طلب`); onRefresh() }
      },
    })
  }

  return (
    <div>
      {/* Add button */}
      {full && (
        <button
          onClick={openAddOrder}
          className="w-full h-11 rounded-xl bg-purple text-white font-bold text-sm flex items-center justify-center gap-2 mb-4 hover:bg-purple-2 transition-all shadow-lg shadow-purple/20"
        >
          <Plus size={18} />
          <span>إضافة طلب</span>
        </button>
      )}

      {/* Search */}
      {full && (
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="ابحث عن اسم أو رقم هاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 border border-border rounded-xl px-4 pl-10 outline-none focus:border-purple focus:ring-2 focus:ring-purple/10 transition-all text-sm bg-white"
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      )}

      {/* Day Groups */}
      {dayGroups.map((group) => {
        const dayKey = group.date.toDateString()
        const isOpen = openDays[dayKey] !== false
        const canDelete = isOlderThan7Days(group.date)
        const dayLabel = getDayLabel(group.date)
        const dateStr = formatDateFull(group.date)

        return (
          <div key={dayKey} className="mb-4">
            {/* Day Header */}
            <button
              onClick={() => toggleDay(dayKey)}
              className="w-full flex items-center gap-3 py-2 px-1 bg-transparent border-0 cursor-pointer"
              dir="rtl"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 ${isOpen ? 'bg-purple text-white rotate-0' : 'bg-lav text-purple'}`}>
                <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              <div className="flex-1 text-right">
                <div className="font-bold text-sm text-ink">{dayLabel}</div>
                <div className="text-[11px] text-subtle mt-0.5">{dateStr}</div>
              </div>
              <span className="bg-lav text-purple py-1.5 px-3 rounded-full text-xs font-bold">
                {group.orders.length}
              </span>
              {full && canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDay(group.date, group.orders) }}
                  className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-danger grid place-items-center hover:bg-red-100 transition-colors"
                  title="حذف يوم"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </button>

            {/* Order Cards */}
            {isOpen && (
              <div className="mt-2 space-y-2.5 pr-1" dir="rtl">
                {group.orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-3">
                      {/* Image with download */}
                      <div className="relative w-[72px] h-[72px] shrink-0">
                        <LazyImage
                          src={order.image_url ? getImageUrl(order.image_url) : null}
                          className="w-full h-full rounded-xl border border-border6"
                          fallback={
                            <div className="w-full h-full flex items-center justify-center text-muted bg-soft">
                              <ImageIcon size={24} strokeWidth={1.5} />
                            </div>
                          }
                        />
                        {order.image_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadImage(getImageUrl(order.image_url), order.image_url.split('/').pop(), order.size, order.color)
                            }}
                            className="absolute bottom-1 left-1 w-5 h-5 rounded-md bg-black/60 text-white grid place-items-center border-0 hover:bg-black/80 transition-colors"
                            title="تحميل الصورة"
                          >
                            <Download size={11} />
                          </button>
                        )}
                        {order.image_url && imageSizes[order.id] != null && (
                          <span className="absolute top-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
                            {formatFileSize(imageSizes[order.id])}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-ink truncate m-0">{order.customer_name}</h4>
                          <div className="flex gap-1 shrink-0" dir="ltr">
                            {full && (
                              <button
                                onClick={() => openEditOrder(order)}
                                className="w-7 h-7 rounded-lg bg-lav text-purple grid place-items-center border-0 hover:bg-purple/15 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="w-7 h-7 rounded-lg bg-red-50 text-danger grid place-items-center border-0 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1 text-meta2 text-xs">
                          <Phone size={11} />
                          <span dir="ltr">{order.phone}</span>
                        </div>

                        {order.address && (
                          <div className="flex items-start gap-1.5 mt-0.5 text-meta2 text-xs">
                            <MapPin size={11} className="mt-0.5 shrink-0" />
                            <span className="break-words">{order.address}</span>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.delivery_type && (
                            <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              order.delivery_type === 'home'
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-amber-50 border-amber-200 text-amber-600'
                            }`}>
                              {order.delivery_type === 'home' ? '🏠' : '🏢'}
                              {order.delivery_type === 'home' ? 'المنزل' : 'المكتب'}
                            </span>
                          )}
                          {order.color && (
                            <span className="inline-flex items-center gap-1 bg-soft border border-border rounded-full px-2 py-0.5 text-[10px] font-semibold text-meta2">
                              <span className="w-2.5 h-2.5 rounded-full border border-border7" style={{ background: order.color }} />
                              {order.color}
                            </span>
                          )}
                          {order.size && (
                            <span className="inline-flex items-center gap-1 bg-soft border border-border rounded-full px-2 py-0.5 text-[10px] font-semibold text-meta2">
                              <Ruler size={9} />
                              {order.size}
                            </span>
                          )}
                          <span className="text-[10px] text-subtle mt-0.5">
                            {formatTime(new Date(order.created_at))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {showCount < allDayGroups.length && dayGroups.length > 0 && (
        <button
          onClick={() => setShowCount(prev => prev + 20)}
          className="w-full py-3 rounded-xl border border-border bg-white text-purple font-bold text-sm hover:bg-lav transition-colors mt-2"
        >
          تحميل المزيد ({allDayGroups.length - showCount} أيام أخرى)
        </button>
      )}

      {dayGroups.length === 0 && (
        <div className="text-center py-16 text-muted">
          <div className="w-20 h-20 rounded-full bg-lav mx-auto mb-4 grid place-items-center">
            <ShoppingCart size={32} className="text-purple" />
          </div>
          <p className="font-bold text-ink text-base">لا توجد طلبات بعد</p>
          <p className="text-sm mt-1 text-subtle">أضف أول طلب للبدء</p>
        </div>
      )}

      {/* ─── Bottom Sheet: Add / Edit Order ─── */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingOrder ? 'تعديل الطلب' : 'طلب جديد'}
      >
        <form onSubmit={handleSave} className="flex flex-col gap-0">
          {/* Customer Info */}
          <div className="bg-soft rounded-xl p-3.5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-lav text-purple grid place-items-center">
                <span className="text-sm">👤</span>
              </div>
              <span className="text-xs font-bold text-ink">بيانات الزبون</span>
            </div>
            <div className="space-y-2.5">
              <input type="text" value={customer.customer_name} onChange={(e) => setCustomer({ ...customer, customer_name: e.target.value })} placeholder="اسم الزبون" required className="w-full h-11 border border-border rounded-lg px-3 outline-none focus:border-purple transition-colors text-sm bg-white" />
              <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="رقم الهاتف" required dir="ltr" className="w-full h-11 border border-border rounded-lg px-3 outline-none focus:border-purple transition-colors text-sm bg-white" />
              <input type="text" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="العنوان (اختياري)" className="w-full h-11 border border-border rounded-lg px-3 outline-none focus:border-purple transition-colors text-sm bg-white" />

              {/* Delivery Type */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">نوع التوصيل</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomer({ ...customer, delivery_type: 'home' })}
                    className={`h-11 rounded-lg border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      customer.delivery_type === 'home'
                        ? 'border-purple bg-lav text-purple'
                        : 'border-border bg-white text-muted hover:border-purple/30'
                    }`}
                  >
                    <span>🏠</span>
                    <span>المنزل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomer({ ...customer, delivery_type: 'desk' })}
                    className={`h-11 rounded-lg border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      customer.delivery_type === 'desk'
                        ? 'border-purple bg-lav text-purple'
                        : 'border-border bg-white text-muted hover:border-purple/30'
                    }`}
                  >
                    <span>🏢</span>
                    <span>المكتب</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink">المنتجات ({items.length})</span>
            </div>
            {!editingOrder && (
              <button type="button" onClick={addItem} className="flex items-center gap-1 h-8 px-3 rounded-lg bg-lav text-purple text-xs font-bold border-0 hover:bg-purple/10 transition-colors">
                <Plus size={14} />
                إضافة منتج
              </button>
            )}
          </div>

          <div className="space-y-3 mb-4 max-h-[340px] overflow-y-auto pr-0.5">
            {items.map((item, index) => (
              <div key={item.id} className="border border-border rounded-xl p-3 bg-white relative">
                <div className="absolute -top-2.5 right-3 w-5 h-5 rounded-full bg-purple text-white text-[10px] font-bold grid place-items-center">{index + 1}</div>
                {items.length > 1 && !editingOrder && (
                  <button type="button" onClick={() => removeItem(item.id)} className="absolute -top-2.5 left-3 w-5 h-5 rounded-full bg-danger text-white grid place-items-center border-0">
                    <X size={10} />
                  </button>
                )}
                <div className="mb-2.5">
                  {item.imagePreview ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-border">
                      <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeItemImage(item.id)} className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-danger/90 text-white grid place-items-center border-0">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-purple transition-colors bg-soft">
                      <div className="flex flex-col items-center gap-0.5 text-muted">
                        <ImageIcon size={20} />
                        <span className="text-[10px]">صورة المنتج</span>
                      </div>
                      <input type="file" accept="image/*" onChange={(e) => handleItemImage(item.id, e)} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={item.color} onChange={(e) => updateItem(item.id, 'color', e.target.value)} placeholder="اللون" className="h-9 border border-border rounded-lg px-2.5 outline-none focus:border-purple transition-colors text-xs bg-white" />
                  <input type="text" value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} placeholder="المقاس" className="h-9 border border-border rounded-lg px-2.5 outline-none focus:border-purple transition-colors text-xs bg-white" />
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="w-full h-[46px] border-0 rounded-xl bg-purple text-white font-bold mt-1 hover:bg-purple-2 transition-colors disabled:opacity-60 text-sm shadow-lg shadow-purple/20">
            {saving ? 'جاري الحفظ...' : editingOrder ? 'حفظ التعديلات' : `إضافة ${items.length > 1 ? items.length + ' طلبات' : 'الطلب'}`}
          </button>
          <button type="button" onClick={() => setSheetOpen(false)} className="w-full h-[42px] border-0 bg-gray-100 rounded-xl mt-2 hover:bg-gray-200 transition-colors text-sm">
            إلغاء
          </button>
        </form>
      </BottomSheet>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        loading={deleting}
      />
    </div>
  )
}
