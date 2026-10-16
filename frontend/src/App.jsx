import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import './App.css'

const operatingAlerts = [
  { title: 'KDS queue', detail: '3 orders waiting for pickup', priority: 'high' },
  { title: 'Table turnover', detail: '8 tables are ready for reset', priority: 'medium' },
  { title: 'Staff coverage', detail: 'Two servers on break, add support at 1:30 PM', priority: 'medium' },
]

const statusFlow = {
  submitted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: [],
}

const orderStatusTabs = ['submitted', 'preparing', 'ready', 'served', 'cancelled']

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const billsPerPage = 10

const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

async function requestJson(url, options = {}, token = '') {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const responseText = await response.text()
  const payload = responseText ? JSON.parse(responseText) : {}

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Request failed.')
  }

  return payload
}

function App() {
  const [tableId, setTableId] = useState('1')
  const [pin, setPin] = useState('1234')
  const [guestName, setGuestName] = useState(() => {
    try { return localStorage.getItem('guestName') || '' } catch { return '' }
  })
  const [guestContactNumber, setGuestContactNumber] = useState(() => {
    try { return localStorage.getItem('guestContactNumber') || '' } catch { return '' }
  })
  const [sessionId, setSessionId] = useState('')
  const [guestSessionId, setGuestSessionId] = useState(() => {
    try {
      return localStorage.getItem('guestSessionId') || ''
    } catch {
      return ''
    }
  })
  const [guestSessionToken, setGuestSessionToken] = useState(() => {
    try {
      return localStorage.getItem('guestSessionToken') || ''
    } catch {
      return ''
    }
  })
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cart, setCart] = useState({})
  const [view, setView] = useState('home')
  const [activeAdminSection, setActiveAdminSection] = useState('overview')
  const [orders, setOrders] = useState([])
  const [bills, setBills] = useState([])
  const [opsLoadError, setOpsLoadError] = useState('')
  const [guestOrders, setGuestOrders] = useState([])
  const [billingTab, setBillingTab] = useState('pending')
  const [billingPage, setBillingPage] = useState(1)
  const [activeOrderTab, setActiveOrderTab] = useState('submitted')
  const [isLoadingOps, setIsLoadingOps] = useState(false)
  const [staffEmail, setStaffEmail] = useState('manager@example.com')
  const [staffPassword, setStaffPassword] = useState('password123')
  const [ownerName, setOwnerName] = useState('Hotel Owner')
  const [ownerEmail, setOwnerEmail] = useState('owner@example.com')
  const [ownerPassword, setOwnerPassword] = useState('secure123')
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('secure123')
  const [staffToken, setStaffToken] = useState(() => {
    try {
      return localStorage.getItem('staffToken') || ''
    } catch {
      return ''
    }
  })
  const [staffUser, setStaffUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('staffUser')
      return storedUser ? JSON.parse(storedUser) : null
    } catch {
      return null
    }
  })
  const [superAdminSession, setSuperAdminSession] = useState(() => {
    try {
      const storedSession = localStorage.getItem('superAdminSession')
      return storedSession ? JSON.parse(storedSession) : null
    } catch {
      return null
    }
  })
  const [impersonatedRestaurant, setImpersonatedRestaurant] = useState(() => {
    try {
      const storedRestaurant = localStorage.getItem('impersonatedRestaurant')
      return storedRestaurant ? JSON.parse(storedRestaurant) : null
    } catch {
      return null
    }
  })
  const [staffAuthError, setStaffAuthError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [restaurantId, setRestaurantId] = useState(() => {
    try {
      return localStorage.getItem('restaurantId') || ''
    } catch {
      return ''
    }
  })
  const [branchId, setBranchId] = useState(() => {
    try {
      return localStorage.getItem('branchId') || ''
    } catch {
      return ''
    }
  })
  const [branchAdminName, setBranchAdminName] = useState('Aditi Verma')
  const [branchAdminEmail, setBranchAdminEmail] = useState('branchadmin@example.com')
  const [branchAdminPassword, setBranchAdminPassword] = useState('branchadmin123')
  const [branchAdminRole, setBranchAdminRole] = useState('Waiter')
  const [branchAdminMessage, setBranchAdminMessage] = useState('')
  const [isAssigningBranchAdmin, setIsAssigningBranchAdmin] = useState(false)
  const [tableNumber, setTableNumber] = useState('T-20')
  const [tableName, setTableName] = useState('Window table')
  const [tableCapacity, setTableCapacity] = useState('4')
  const [tableSection, setTableSection] = useState('Main hall')
  const [tableMessage, setTableMessage] = useState('')
  const [isCreatingTable, setIsCreatingTable] = useState(false)
  const [qrTableId, setQrTableId] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const [restaurantTables, setRestaurantTables] = useState([])
  const [platformRestaurants, setPlatformRestaurants] = useState([])
  const [platformRestaurantsError, setPlatformRestaurantsError] = useState('')
  const [subscriptionPlans, setSubscriptionPlans] = useState([])
  const [selectedPlanByRestaurant, setSelectedPlanByRestaurant] = useState({})
  const [newPlatformRestaurantName, setNewPlatformRestaurantName] = useState('')
  const [newPlatformRestaurantSlug, setNewPlatformRestaurantSlug] = useState('')
  const [platformRestaurantMessage, setPlatformRestaurantMessage] = useState('')
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    price_monthly: '0',
    price_annual: '0',
    max_tables: '5',
    features: '',
  })
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planMessage, setPlanMessage] = useState('')
  const [platformSearchTerm, setPlatformSearchTerm] = useState('')
  const [platformStatusFilter, setPlatformStatusFilter] = useState('all')
  const [staffMembers, setStaffMembers] = useState([])
  const [availableBranches, setAvailableBranches] = useState([])
  const [restaurantProfile, setRestaurantProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('restaurantProfile')
      return saved ? JSON.parse(saved) : {
        name: 'Bluebird Bistro',
        tagline: 'Fine dining with modern comfort',
        description: 'A warm, modern rooftop restaurant serving handcrafted meals, slow coffee, and unforgettable hospitality.',
        logoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80',
        phone: '+91 98765 43210',
        address: '12 Garden Avenue, Jaipur, Rajasthan',
        accentColor: '#f97316',
      }
    } catch {
      return {
        name: 'Bluebird Bistro',
        tagline: 'Fine dining with modern comfort',
        description: 'A warm, modern rooftop restaurant serving handcrafted meals, slow coffee, and unforgettable hospitality.',
        logoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80',
        phone: '+91 98765 43210',
        address: '12 Garden Avenue, Jaipur, Rajasthan',
        accentColor: '#f97316',
      }
    }
  })
  const [restaurantMenu, setRestaurantMenu] = useState(() => {
    try {
      const saved = localStorage.getItem('restaurantMenu')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [menuCategories, setMenuCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('restaurantMenuCategories')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [restaurantPageForm, setRestaurantPageForm] = useState({
    name: restaurantProfile.name,
    tagline: restaurantProfile.tagline,
    description: restaurantProfile.description,
    logoUrl: restaurantProfile.logoUrl,
    phone: restaurantProfile.phone,
    address: restaurantProfile.address,
    accentColor: restaurantProfile.accentColor,
  })
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    category: 'Mains',
    price: '',
    description: '',
    badge: 'Popular',
  })
  const [restaurantShareUrl, setRestaurantShareUrl] = useState('')
  const [restaurantPageMessage, setRestaurantPageMessage] = useState('')
  const [editingStaffId, setEditingStaffId] = useState(null)
  const [staffDraft, setStaffDraft] = useState({ name: '', email: '', role: 'Waiter', status: 'active', branchId: '', password: '' })
  const [staffEditError, setStaffEditError] = useState('')
  const [isSavingStaff, setIsSavingStaff] = useState(false)
  const [editingTableId, setEditingTableId] = useState(null)
  const [tableDraft, setTableDraft] = useState({ table_number: '', name: '', section: '', capacity: '2', status: 'available' })
  const [editingMenuItemId, setEditingMenuItemId] = useState(null)
  const [menuItemDraft, setMenuItemDraft] = useState({ name: '', category: 'Mains', price: '', description: '', badge: 'Popular' })
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryDraft, setCategoryDraft] = useState('')

  const cartItems = Object.values(cart)
  const guestMenuItems = restaurantMenu
  const isSuperAdmin = Boolean(staffUser?.is_super_admin)
  const activeUserRole = String(staffUser?.role_name || staffUser?.role || (isSuperAdmin ? 'Super Admin' : '')).trim()
  const canManageRestaurantOperations = Boolean(
    staffUser && (
      isSuperAdmin
      || /manager|branch admin|branch-admin|restaurant owner|owner|super admin|super-admin/i.test(activeUserRole)
    ),
  )
  const canEditRestaurantPage = Boolean(
    staffUser && /restaurant owner|owner/i.test(activeUserRole),
  )
  const canReverseBillPayment = Boolean(
    staffUser && !isSuperAdmin && /\bowner\b/i.test(activeUserRole),
  )

  const adminMetrics = useMemo(() => {
    const pendingOrders = orders.filter((order) => ['submitted', 'preparing', 'ready'].includes(order.status)).length
    const activeTables = restaurantTables.filter((table) => table.status === 'occupied').length
    const totalRevenue = bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0)
    const avgPrepMinutes = orders.length > 0
      ? Math.round(orders.reduce((sum, order) => {
          if (order.status === 'submitted') return sum + 12
          if (order.status === 'preparing') return sum + 14
          if (order.status === 'ready') return sum + 8
          return sum + 6
        }, 0) / orders.length)
      : 0

    return [
      { label: 'Orders today', value: String(pendingOrders || orders.length || 0), change: pendingOrders > 0 ? '+12%' : '0%' },
      { label: 'Avg. prep time', value: avgPrepMinutes ? `${avgPrepMinutes} min` : '0 min', change: avgPrepMinutes > 0 ? '-3 min' : '0 min' },
      { label: 'Tables active', value: `${activeTables}/${restaurantTables.length || 0}`, change: activeTables > 0 ? `+${activeTables}` : '0' },
      { label: 'Revenue', value: `₹ ${totalRevenue.toLocaleString('en-IN')}`, change: totalRevenue > 0 ? '+8.4%' : '0%' },
    ]
  }, [orders, restaurantTables, bills])

  const clearAuthSession = () => {
    setStaffToken('')
    setStaffUser(null)
    setSuperAdminSession(null)
    setImpersonatedRestaurant(null)
    setRestaurantId('')
    setBranchId('')
    setStaffAuthError('')
    setJoined(false)
    setSessionId('')
    setCart({})
    setActiveAdminSection('overview')
    setView('admin')

    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('hotelPage')) {
      setView('restaurant')
    }

    try {
      const storedToken = localStorage.getItem('staffToken')
      const storedUser = localStorage.getItem('staffUser')

      if ((!storedToken || storedToken === 'null' || storedToken === 'undefined') && storedUser) {
        localStorage.removeItem('staffUser')
      }

      if (storedToken === 'null' || storedToken === 'undefined') {
        localStorage.removeItem('staffToken')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [])

  useEffect(() => {
    try {
      if (guestSessionId) {
        localStorage.setItem('guestSessionId', guestSessionId)
      } else {
        localStorage.removeItem('guestSessionId')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [guestSessionId])

  useEffect(() => {
    try {
      if (guestSessionToken) {
        localStorage.setItem('guestSessionToken', guestSessionToken)
      } else {
        localStorage.removeItem('guestSessionToken')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [guestSessionToken])

  useEffect(() => {
    try {
      if (staffToken) {
        localStorage.setItem('staffToken', staffToken)
      } else {
        localStorage.removeItem('staffToken')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [staffToken])

  useEffect(() => {
    try {
      if (staffUser) {
        localStorage.setItem('staffUser', JSON.stringify(staffUser))
      } else {
        localStorage.removeItem('staffUser')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [staffUser])

  useEffect(() => {
    try {
      if (superAdminSession) {
        localStorage.setItem('superAdminSession', JSON.stringify(superAdminSession))
      } else {
        localStorage.removeItem('superAdminSession')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [superAdminSession])

  useEffect(() => {
    try {
      if (impersonatedRestaurant) {
        localStorage.setItem('impersonatedRestaurant', JSON.stringify(impersonatedRestaurant))
      } else {
        localStorage.removeItem('impersonatedRestaurant')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [impersonatedRestaurant])

  useEffect(() => {
    try {
      if (restaurantId) {
        localStorage.setItem('restaurantId', restaurantId)
      } else {
        localStorage.removeItem('restaurantId')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [restaurantId])

  useEffect(() => {
    try {
      localStorage.setItem('restaurantProfile', JSON.stringify(restaurantProfile))
    } catch {
      // Ignore storage errors.
    }
  }, [restaurantProfile])

  useEffect(() => {
    try {
      localStorage.setItem('restaurantMenu', JSON.stringify(restaurantMenu))
    } catch {
      // Ignore storage errors.
    }
  }, [restaurantMenu])

  useEffect(() => {
    try {
      localStorage.setItem('restaurantMenuCategories', JSON.stringify(menuCategories))
    } catch {
      // Ignore storage errors.
    }
  }, [menuCategories])

  useEffect(() => {
    setRestaurantPageForm({
      name: restaurantProfile.name,
      tagline: restaurantProfile.tagline,
      description: restaurantProfile.description,
      logoUrl: restaurantProfile.logoUrl,
      phone: restaurantProfile.phone,
      address: restaurantProfile.address,
      accentColor: restaurantProfile.accentColor,
    })
  }, [restaurantProfile])

  useEffect(() => {
    try {
      if (branchId) {
        localStorage.setItem('branchId', branchId)
      } else {
        localStorage.removeItem('branchId')
      }
    } catch {
      // Ignore storage errors.
    }
  }, [branchId])

  useEffect(() => {
    if (staffToken && view === 'guest') {
      setView('staff')
    }
  }, [staffToken, view])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tableFromUrl = params.get('table')
    const pinFromUrl = params.get('pin')

    if (!tableFromUrl || !pinFromUrl) {
      return
    }

    setTableId(tableFromUrl)
    setPin(pinFromUrl)
    setView('guest')

    let savedGuestName = ''
    let savedGuestContact = ''
    try {
      savedGuestName = localStorage.getItem('guestName') || ''
      savedGuestContact = localStorage.getItem('guestContactNumber') || ''
    } catch {
      // Continue to the join form when browser storage is unavailable.
    }
    if (savedGuestName.trim()) {
      setGuestName(savedGuestName)
      setGuestContactNumber(savedGuestContact)
      void joinTable(tableFromUrl, pinFromUrl, savedGuestName, savedGuestContact)
    }
  }, [])

  useEffect(() => {
    if (!joined || !sessionId || !tableId || view !== 'guest') {
      return undefined
    }

    const refreshGuestStatus = async () => {
      await fetchGuestOrders(String(tableId), String(sessionId), guestSessionId ? String(guestSessionId) : '')
    }

    void refreshGuestStatus()

    const intervalId = window.setInterval(() => {
      void refreshGuestStatus()
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [joined, sessionId, tableId, guestSessionId, view])

  const total = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * item.menuItem.price,
        0,
      ),
    [cartItems],
  )

  const guestOrdersTotal = useMemo(
    () => guestOrders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
    [guestOrders],
  )

  const guestAmountDue = useMemo(
    () => guestOrders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + Math.max(
        Number(order.amount_due ?? (Number(order.total || 0) - Number(order.paid_amount || 0))),
        0,
      ), 0),
    [guestOrders],
  )

  const fetchGuestOrders = async (tableValue = tableId, sessionValue = sessionId, guestSessionValue = guestSessionId) => {
    if (!tableValue || !sessionValue) {
      setGuestOrders([])
      return []
    }

    try {
      const params = new URLSearchParams({
        table_id: String(tableValue),
        session_id: String(sessionValue),
      })

      if (guestSessionValue) {
        params.set('guest_session_id', String(guestSessionValue))
      }

      const response = await requestJson(`/api/v1/guest/orders?${params.toString()}`)
      const list = Array.isArray(response?.data) ? response.data : []
      setGuestOrders(list)
      return list
    } catch (error) {
      setGuestOrders([])
      return []
    }
  }

  const joinTable = async (tableValue = tableId, pinValue = pin, nameValue = guestName, contactValue = guestContactNumber) => {
    if (!String(tableValue).trim() || !/^[0-9]+$/.test(String(tableValue).trim())) {
      setError('Please enter a valid numeric table ID.')
      return
    }

    if (!String(pinValue).trim()) {
      setError('Please enter the guest PIN.')
      return
    }

    if (!String(nameValue).trim()) {
      setError('Please enter your name.')
      return
    }

    try {
      setIsJoining(true)
      setError('')
      setConfirmation('')

      const response = await requestJson('/api/v1/guest/join-session', {
        method: 'POST',
        body: JSON.stringify({
          table_id: Number(tableValue),
          pin: String(pinValue),
          name: String(nameValue).trim(),
          contact_number: String(contactValue || '').trim() || null,
          guest_session_id: guestSessionId ? Number(guestSessionId) : undefined,
          guest_session_token: guestSessionToken || undefined,
        }),
      })

      const restaurant = response?.data?.restaurant
      const nextMenuItems = Array.isArray(response?.data?.menu_items)
        ? response.data.menu_items
        : []

      if (restaurant) {
        setRestaurantProfile((current) => ({
          ...current,
          name: restaurant.name || current.name,
          tagline: restaurant.name ? `${restaurant.name} dining experience` : current.tagline,
          address: current.address,
          phone: current.phone,
          accentColor: current.accentColor,
        }))
      }

      setRestaurantMenu(nextMenuItems)
      const savedName = response?.data?.guest_name || String(nameValue).trim()
      const savedContact = response?.data?.guest_contact_number || String(contactValue || '').trim()
      setGuestName(savedName)
      setGuestContactNumber(savedContact)
      try {
        localStorage.setItem('guestName', savedName)
        localStorage.setItem('guestContactNumber', savedContact)
      } catch {
        // Guest details remain available in component state for this visit.
      }

      const currentOrder = response?.data?.current_order
      const nextCart = {}

      if (currentOrder?.items?.length) {
        currentOrder.items.forEach((item) => {
          const menuItemId = Number(item.menu_item_id)
          nextCart[menuItemId] = {
            menuItem: {
              id: menuItemId,
              name: item.name,
              price: Number(item.unit_price || item.price || 0),
              description: item.description || '',
              badge: item.badge || 'Popular',
            },
            quantity: Number(item.quantity || 0),
          }
        })
      }

      setCart(nextCart)

      const nextSessionId = String(response?.data?.session_id ?? '')
      const nextGuestSessionId = String(response?.data?.guest_session_id ?? (guestSessionId || ''))
      const nextGuestSessionToken = String(response?.data?.guest_session_token ?? (guestSessionToken || ''))

      setSessionId(nextSessionId)
      if (nextGuestSessionId) {
        setGuestSessionId(nextGuestSessionId)
      }
      if (nextGuestSessionToken) {
        setGuestSessionToken(nextGuestSessionToken)
      }
      setJoined(Boolean(nextSessionId))
      if (nextSessionId) {
        await fetchGuestOrders(String(tableValue), nextSessionId, nextGuestSessionId || guestSessionId)
      }
      setConfirmation(`Table ${tableValue} joined successfully.`)
      return nextSessionId
    } catch (joinError) {
      setJoined(false)
      setSessionId('')
      setError(joinError.message)
      return ''
    } finally {
      setIsJoining(false)
    }
  }

  const handleJoin = async (event) => {
    event.preventDefault()
    await joinTable(tableId, pin)
  }

  const addItem = (menuItem) => {
    setCart((current) => {
      const existing = current[menuItem.id]

      return {
        ...current,
        [menuItem.id]: {
          menuItem,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      }
    })
  }

  const removeItem = (menuItemId) => {
    setCart((current) => {
      const updated = { ...current }
      delete updated[menuItemId]
      return updated
    })
  }

  const updateQuantity = (menuItemId, nextQuantity) => {
    if (nextQuantity <= 0) {
      removeItem(menuItemId)
      return
    }

    setCart((current) => ({
      ...current,
      [menuItemId]: {
        ...current[menuItemId],
        quantity: nextQuantity,
      },
    }))
  }

  const submitOrder = async () => {
    if (!joined || !sessionId) {
      setError('Please join the table before placing an order.')
      return
    }

    if (cartItems.length === 0) {
      setError('Add at least one item before submitting.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setConfirmation('')

      await requestJson('/api/v1/guest/orders', {
        method: 'POST',
        body: JSON.stringify({
          table_id: Number(tableId),
          session_id: Number(sessionId),
          guest_session_id: guestSessionId ? Number(guestSessionId) : undefined,
          idempotency_key: `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          items: cartItems.map(({ menuItem, quantity }) => ({
            menu_item_id: menuItem.id,
            quantity,
            notes: 'Prepared from guest ordering UI',
          })),
        }),
      })

      setConfirmation('Order submitted successfully. Chef is preparing it now.')
      setCart({})
      await fetchGuestOrders(tableId, sessionId, guestSessionId)
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelGuestOrder = async (orderId) => {
    if (!joined || !sessionId) {
      setError('Please join the table before cancelling an order.')
      return
    }

    try {
      setError('')
      setConfirmation('')

      const response = await requestJson(`/api/v1/guest/orders/${orderId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          table_id: Number(tableId),
          session_id: Number(sessionId),
          guest_session_id: guestSessionId ? Number(guestSessionId) : undefined,
        }),
      })

      setConfirmation(response?.data?.message || `Order ${orderId} cancelled.`)
      await fetchGuestOrders(tableId, sessionId, guestSessionId)
    } catch (cancelError) {
      setError(cancelError.message)
    }
  }

  const updateGuestOrder = async (orderId, nextItems) => {
    if (!joined || !sessionId) {
      setError('Please join the table before editing an order.')
      return
    }

    try {
      setError('')
      setConfirmation('')

      const response = await requestJson(`/api/v1/guest/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          table_id: Number(tableId),
          session_id: Number(sessionId),
          guest_session_id: guestSessionId ? Number(guestSessionId) : undefined,
          items: nextItems
            .filter((item) => Number(item.quantity) > 0)
            .map((item) => ({
              menu_item_id: Number(item.menu_item_id),
              quantity: Number(item.quantity),
              notes: item.notes || '',
            })),
        }),
      })

      setConfirmation(response?.data?.message || `Order ${orderId} updated.`)
      await fetchGuestOrders(tableId, sessionId, guestSessionId)
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const changeGuestOrderItemQuantity = async (orderId, menuItemId, delta) => {
    const order = guestOrders.find((candidate) => Number(candidate.id) === Number(orderId))

    if (!order) {
      return
    }

    const nextItems = (order.items || []).map((item) => {
      if (Number(item.menu_item_id) !== Number(menuItemId)) {
        return item
      }

      return {
        ...item,
        quantity: Math.max(0, Number(item.quantity || 0) + delta),
      }
    })

    await updateGuestOrder(orderId, nextItems)
  }

  const removeGuestOrderItem = async (orderId, menuItemId) => {
    const order = guestOrders.find((candidate) => Number(candidate.id) === Number(orderId))

    if (!order) {
      return
    }

    const nextItems = (order.items || []).filter(
      (item) => Number(item.menu_item_id) !== Number(menuItemId),
    )

    await updateGuestOrder(orderId, nextItems)
  }

  const ensureOwnerRestaurantAndBranch = async (token) => {
    if (!token) {
      return { restaurantId: '', branchId: '' }
    }

    let restaurantsResponse
    try {
      restaurantsResponse = await requestJson('/api/v1/restaurants', {}, token)
    } catch (error) {
      throw new Error(`Could not load your restaurant access: ${error.message}`)
    }

    const restaurants = Array.isArray(restaurantsResponse?.data) ? restaurantsResponse.data : []

    if (restaurants.length > 0) {
      const roleName = String(staffUser?.role_name || staffUser?.role || '').trim()
      const isEmployeeAccount = !staffUser?.is_super_admin && !/\bowner\b/i.test(roleName)
      const membershipRestaurants = isEmployeeAccount
        ? restaurants.filter((restaurant) => String(restaurant.owner_id) !== String(staffUser?.id))
        : restaurants
      if (isEmployeeAccount && membershipRestaurants.length === 0) {
        throw new Error('This employee account is not linked to an owner restaurant. Ask the restaurant owner to add the employee again.')
      }

      const selectableRestaurants = isEmployeeAccount ? membershipRestaurants : restaurants
      const restaurantCandidate = restaurantId
        ? selectableRestaurants.find((restaurant) => String(restaurant.id) === String(restaurantId)) || selectableRestaurants[0]
        : selectableRestaurants[0]

      const branchFallback = Array.isArray(restaurantCandidate?.branches) && restaurantCandidate.branches.length > 0
        ? restaurantCandidate.branches[0]
        : null

      const storedBranchMatchesCurrentRestaurant = Boolean(
        branchId && restaurantId && Array.isArray(restaurantCandidate?.branches)
        && restaurantCandidate.branches.some((branch) => String(branch.id) === String(branchId)),
      )

      const resolvedRestaurantId = String(restaurantCandidate.id)
      const resolvedBranchId = storedBranchMatchesCurrentRestaurant
        ? String(branchId)
        : (branchFallback ? String(branchFallback.id) : '')

      if (resolvedRestaurantId !== String(restaurantId)) {
        setRestaurantId(resolvedRestaurantId)
      }
      setAvailableBranches((restaurantCandidate.branches || []).map((branch) => ({
        id: String(branch.id),
        name: branch.name || `Branch ${branch.id}`,
      })))
      if (resolvedBranchId && resolvedBranchId !== String(branchId)) {
        setBranchId(resolvedBranchId)
      }

      if (!resolvedBranchId) {
        throw new Error('Your restaurant account has no available branch. Ask the owner to assign one.')
      }

      return {
        restaurantId: resolvedRestaurantId,
        branchId: resolvedBranchId,
      }
    }

    const roleName = String(staffUser?.role_name || staffUser?.role || '').trim()
    if (!/\bowner\b/i.test(roleName)) {
      throw new Error('This employee account is not linked to an owner restaurant. Ask the restaurant owner to add the employee again.')
    }

    const restaurantName = staffUser?.name ? `${staffUser.name} Restaurant` : 'Bluebird Table Service'
    const restaurantSlug = `restaurant-${Date.now()}`

    const restaurantResponse = await requestJson(
      '/api/v1/restaurants',
      {
        method: 'POST',
        body: JSON.stringify({
          name: restaurantName,
          slug: restaurantSlug,
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        }),
      },
      token,
    )

    const createdRestaurantId = String(restaurantResponse?.data?.id || '')
    setRestaurantId(createdRestaurantId)

    const branchResponse = await requestJson(
      `/api/v1/restaurants/${createdRestaurantId}/branches`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'Main Branch',
          code: 'MAIN',
          address: 'Main dining hall',
          city: 'Bengaluru',
          country: 'India',
          timezone: 'Asia/Kolkata',
        }),
      },
      token,
    )

    const createdBranchId = String(branchResponse?.data?.id || '')
    setBranchId(createdBranchId)

    return { restaurantId: createdRestaurantId, branchId: createdBranchId }
  }

  useEffect(() => {
    if (!staffToken || !isSuperAdmin || view !== 'admin') {
      return
    }

    const loadPlatformRestaurants = async () => {
      try {
        setPlatformRestaurantsError('')
        const [restaurantsResponse, plansResponse] = await Promise.all([
          requestJson('/api/v1/restaurants', {}, staffToken),
          requestJson('/api/v1/subscription-plans', {}, staffToken),
        ])

        const restaurants = Array.isArray(restaurantsResponse?.data) ? restaurantsResponse.data : []
        const plans = Array.isArray(plansResponse?.data) ? plansResponse.data : []

        setPlatformRestaurants(restaurants)
        setSubscriptionPlans(plans)
      } catch (error) {
        setPlatformRestaurantsError(error.message)
        setPlatformRestaurants([])
        setSubscriptionPlans([])
      }
    }

    void loadPlatformRestaurants()
  }, [staffToken, isSuperAdmin, view])

  useEffect(() => {
    if (view !== 'staff' && view !== 'billing' && view !== 'admin') {
      return
    }

    let requestInFlight = false
    let isInitialLoad = true

    const loadOperationalData = async () => {
      if (requestInFlight) {
        return
      }

      requestInFlight = true
      try {
        if (isInitialLoad) {
          setIsLoadingOps(true)
        }
        setOpsLoadError('')

        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const targetRestaurantId = context.restaurantId || restaurantId || '1'
        const targetBranchId = context.branchId || branchId || '1'

        const [membershipsResponse, tablesResponse, ordersResponse, billsResponse] = await Promise.all([
          requestJson(`/api/v1/restaurants/${targetRestaurantId}/memberships`, {}, staffToken).catch(() => ({ data: [] })),
          requestJson(`/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/tables`, {}, staffToken).catch((error) => {
            setOpsLoadError((current) => current ? `${current} Tables: ${error.message}` : `Could not load restaurant tables: ${error.message}`)
            return { data: [] }
          }),
          requestJson(`/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/orders`, {}, staffToken).catch((error) => {
            setOpsLoadError(`Could not load restaurant orders: ${error.message}`)
            return { data: [] }
          }),
          requestJson(`/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/bills`, {}, staffToken).catch((error) => {
            setOpsLoadError((current) => current ? `${current} Bills: ${error.message}` : `Could not load restaurant bills: ${error.message}`)
            return { data: [] }
          }),
        ])

        if (Array.isArray(membershipsResponse?.data)) {
          setStaffMembers(
            membershipsResponse.data.map((membership) => {
              const normalizedStatus = (membership?.status || 'active').toLowerCase()
              return {
                id: membership?.user_id ?? membership?.id,
                membershipId: membership?.id,
                name: membership?.user?.name || 'Unknown staff',
                email: membership?.user?.email || '',
                role: membership?.role?.name || 'Staff',
                membershipStatus: normalizedStatus,
                branchId: membership?.branch?.id ? String(membership.branch.id) : '',
                branchName: membership?.branch?.name || 'All branches',
                status: normalizedStatus === 'active' ? 'online' : normalizedStatus === 'inactive' ? 'break' : normalizedStatus,
              }
            }),
          )
        }

        if (Array.isArray(tablesResponse?.data)) {
          setRestaurantTables(
            tablesResponse.data.map((table) => ({
              id: table.id,
              table_number: table.table_number,
              name: table.name || table.table_number,
              section: table.section || 'Main hall',
              capacity: Number(table.capacity || 2),
              status: table.status === 'occupied' ? 'occupied' : 'available',
            })),
          )
        }

        if (Array.isArray(ordersResponse?.data)) {
          setOrders(
            ordersResponse.data.map((order) => ({
              id: order.id,
              table: String(order.table || 'T-01'),
              orderStatus: order.status || 'submitted',
              customer: order.customer || (order.guest_session_id ? `Guest #${order.guest_session_id}` : `Table ${String(order.table || 'T-01')}`),
              customerId: order.customer_id ?? order.guest_session_id ?? null,
              guestSessionId: order.guest_session_id ?? null,
              guestName: order.guest_name ?? '',
              guestContactNumber: order.guest_contact_number ?? '',
              time: order.time || 'Now',
              items: Array.isArray(order.items) ? order.items : [],
              total: Number(order.total || 0),
              status: order.status || 'submitted',
            })),
          )
        } else {
          setOrders([])
        }

        if (Array.isArray(billsResponse?.data)) {
          setBills(
            billsResponse.data.map((bill) => ({
              id: bill.id,
              table: String(bill.table || 'T-01'),
              orderId: bill.orderId ?? bill.order_id ?? 0,
              orderStatus: bill.order_status ?? '',
              guestSessionId: bill.guest_session_id ?? null,
              guestName: bill.guest_name ?? '',
              guestContactNumber: bill.guest_contact_number ?? '',
              total: Number(bill.total || 0),
              paid: Number(bill.paid || 0),
              status: bill.status || 'pending',
              method: bill.method || 'cash',
              provider: bill.provider || '',
            })),
          )
        } else {
          setBills([])
        }
      } catch (error) {
        setOrders([])
        setBills([])
        setOpsLoadError(error.message || 'Could not load restaurant operations.')
      } finally {
        if (isInitialLoad) {
          setIsLoadingOps(false)
          isInitialLoad = false
        }
        requestInFlight = false
      }
    }

    void loadOperationalData()

    // Keep the staff order board current while guests place orders from their tables.
    const refreshInterval = window.setInterval(() => {
      void loadOperationalData()
    }, 10000)

    return () => window.clearInterval(refreshInterval)
  }, [view, staffToken, restaurantId, branchId])

  const handleStaffLogin = async (event) => {
    event.preventDefault()

    try {
      setIsLoggingIn(true)
      setStaffAuthError('')

      const response = await requestJson('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: staffEmail,
          password: staffPassword,
        }),
      })

      setStaffToken(response.token)
      setStaffUser(response.user)

      if (response?.user?.is_super_admin) {
        setSuperAdminSession({ token: response.token, user: response.user })
        setImpersonatedRestaurant(null)
        setView('admin')
        setActiveAdminSection('restaurants')
      } else {
        setView('staff')
      }
    } catch (loginError) {
      setStaffAuthError(loginError.message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleImpersonateRestaurant = async (restaurant) => {
    if (!staffToken || !superAdminSession || !staffUser?.is_super_admin) {
      setPlatformRestaurantMessage('Only the platform super admin can login as a restaurant.')
      return
    }

    try {
      const response = await requestJson(`/api/v1/restaurants/${restaurant.id}/impersonate`, {
        method: 'POST',
      }, staffToken)

      const previousAdminSession = { token: staffToken, user: staffUser }
      const targetBranchId = Array.isArray(restaurant?.branches) && restaurant.branches.length > 0
        ? String(restaurant.branches[0].id)
        : ''

      setSuperAdminSession(previousAdminSession)
      setImpersonatedRestaurant({ id: restaurant.id, name: restaurant.name })
      setStaffToken(response.token)
      setStaffUser(response.user)
      setRestaurantId(String(restaurant.id))
      setBranchId(targetBranchId)
      setActiveAdminSection('overview')
      setView('staff')
      setPlatformRestaurantMessage(`Logged in as ${restaurant.name}. Use the return button to go back to super admin.`)
    } catch (error) {
      setPlatformRestaurantMessage(error.message)
    }
  }

  const handleReturnToSuperAdmin = () => {
    if (!superAdminSession?.token || !superAdminSession?.user) {
      setPlatformRestaurantMessage('No super admin session available to restore.')
      return
    }

    setStaffToken(superAdminSession.token)
    setStaffUser(superAdminSession.user)
    setImpersonatedRestaurant(null)
    setRestaurantId('')
    setBranchId('')
    setView('admin')
    setActiveAdminSection('restaurants')
    setPlatformRestaurantMessage('Returned to super admin dashboard.')
  }

  const handleOwnerSignup = async (event) => {
    event.preventDefault()

    if (ownerPassword !== ownerConfirmPassword) {
      setStaffAuthError('Passwords do not match.')
      return
    }

    try {
      setIsRegistering(true)
      setStaffAuthError('')

      const response = await requestJson('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword,
          password_confirmation: ownerConfirmPassword,
        }),
      })

      setStaffToken(response.token)
      setStaffUser(response.user)
      setView('staff')
    } catch (signupError) {
      setStaffAuthError(signupError.message)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleStaffLogout = async () => {
    const currentToken = staffToken

    try {
      if (currentToken) {
        await requestJson('/api/v1/auth/logout', { method: 'POST' }, currentToken)
      }
    } catch {
      // Ignore backend logout errors and clear the local session anyway.
    } finally {
      clearAuthSession()

      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('hotelPage')
        url.searchParams.delete('table')
        url.searchParams.delete('pin')
        window.history.replaceState({}, '', url)
      } catch {
        // Ignore storage errors.
      }

      window.location.reload()
    }
  }

  const startEditingStaff = (member) => {
    setStaffEditError('')
    setEditingStaffId(member.id)
    setStaffDraft({
      name: member.name,
      email: member.email || '',
      role: member.role,
      status: member.membershipStatus || (member.status === 'break' ? 'inactive' : 'active'),
      branchId: member.branchId || '',
      password: '',
    })
  }

  const saveStaffMember = async () => {
    if (!staffDraft.name.trim() || !staffDraft.email.trim()) {
      setStaffEditError('Enter the employee name and email address.')
      return
    }

    const member = staffMembers.find((item) => item.id === editingStaffId)
    if (!member?.membershipId || !restaurantId || !staffToken) {
      setStaffEditError('Could not find the employee membership to update. Refresh the page and try again.')
      return
    }

    try {
      setIsSavingStaff(true)
      setStaffEditError('')
      const payload = {
        name: staffDraft.name.trim(),
        email: staffDraft.email.trim(),
        role: staffDraft.role.trim(),
        status: staffDraft.status,
        branch_id: staffDraft.branchId || null,
      }
      if (staffDraft.password.trim()) {
        payload.password = staffDraft.password
      }

      await requestJson(`/api/v1/restaurants/${restaurantId}/memberships/${member.membershipId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }, staffToken)

      const normalizedStatus = staffDraft.status === 'active' ? 'online' : 'break'
      setStaffMembers((current) => current.map((item) => item.id === editingStaffId
        ? {
            ...item,
            name: staffDraft.name.trim(),
            email: staffDraft.email.trim(),
            role: staffDraft.role.trim(),
            membershipStatus: staffDraft.status,
            branchId: staffDraft.branchId,
            branchName: availableBranches.find((branch) => branch.id === staffDraft.branchId)?.name || 'All branches',
            status: normalizedStatus,
          }
        : item))
      setEditingStaffId(null)
      setStaffDraft({ name: '', email: '', role: 'Waiter', status: 'active', branchId: '', password: '' })
    } catch (error) {
      setStaffEditError(error.message || 'Could not save employee details.')
    } finally {
      setIsSavingStaff(false)
    }
  }

  const deleteStaffMember = (id) => {
    const member = staffMembers.find((item) => item.id === id)
    const confirmed = window.confirm(
      `Do you really want to delete ${member?.name || 'this staff member'}? This will remove them from the platform and they can be restored later if needed.`,
    )

    if (!confirmed) {
      return
    }

    setStaffMembers((current) => current.filter((member) => member.id !== id))
    if (editingStaffId === id) {
      setEditingStaffId(null)
      setStaffDraft({ name: '', email: '', role: 'Waiter', status: 'active', branchId: '', password: '' })
    }
  }

  const startEditingTable = (table) => {
    setEditingTableId(table.id)
    setTableDraft({
      table_number: table.table_number,
      name: table.name,
      section: table.section,
      capacity: String(table.capacity || 2),
      status: table.status,
    })
  }

  const saveTable = () => {
    if (!tableDraft.table_number.trim()) {
      return
    }

    setRestaurantTables((current) =>
      current.map((table) =>
        table.id === editingTableId
          ? {
              ...table,
              table_number: tableDraft.table_number.trim(),
              name: tableDraft.name.trim() || table.name,
              section: tableDraft.section.trim() || table.section,
              capacity: Number(tableDraft.capacity || table.capacity || 2),
              status: tableDraft.status,
            }
          : table,
      ),
    )

    setEditingTableId(null)
    setTableDraft({ table_number: '', name: '', section: '', capacity: '2', status: 'available' })
  }

  const deleteTable = (id) => {
    const table = restaurantTables.find((item) => item.id === id)
    const confirmed = window.confirm(
      `Do you really want to delete table ${table?.table_number || 'this table'}? This will soft delete it so it can be recovered later.`,
    )

    if (!confirmed) {
      return
    }

    setRestaurantTables((current) => current.filter((table) => table.id !== id))
    if (editingTableId === id) {
      setEditingTableId(null)
      setTableDraft({ table_number: '', name: '', section: '', capacity: '2', status: 'available' })
    }
  }

  const startEditingMenuItem = (item) => {
    setEditingMenuItemId(item.id)
    setMenuItemDraft({
      name: item.name,
      category: item.category,
      price: String(item.price || 0),
      description: item.description || '',
      badge: item.badge || 'Popular',
    })
  }

  const saveMenuItem = () => {
    if (!menuItemDraft.name.trim()) {
      return
    }

    const category = menuItemDraft.category.trim() || 'Mains'

    setRestaurantMenu((current) =>
      current.map((item) =>
        item.id === editingMenuItemId
          ? {
              ...item,
              name: menuItemDraft.name.trim(),
              category,
              description: menuItemDraft.description.trim() || item.description,
              badge: menuItemDraft.badge || item.badge || 'Popular',
              price: Number(menuItemDraft.price || 0),
            }
          : item,
      ),
    )

    setMenuCategories((current) => (current.includes(category) ? current : [...current, category]))
    setEditingMenuItemId(null)
    setMenuItemDraft({ name: '', category: 'Mains', price: '', description: '', badge: 'Popular' })
  }

  const deleteMenuItem = (id) => {
    const item = restaurantMenu.find((menuItem) => menuItem.id === id)
    const confirmed = window.confirm(
      `Do you really want to delete "${item?.name || 'this menu item'}"? This soft deletes it and it can be restored later.`,
    )

    if (!confirmed) {
      return
    }

    setRestaurantMenu((current) => current.filter((item) => item.id !== id))
    if (editingMenuItemId === id) {
      setEditingMenuItemId(null)
      setMenuItemDraft({ name: '', category: 'Mains', price: '', description: '', badge: 'Popular' })
    }
  }

  const startEditingCategory = (category) => {
    setEditingCategoryName(category)
    setCategoryDraft(category)
  }

  const saveCategory = () => {
    const normalized = categoryDraft.trim()
    if (!normalized) {
      return
    }

    setMenuCategories((current) => {
      const next = current.filter((category) => category !== editingCategoryName)
      return [...next, normalized]
    })

    setRestaurantMenu((current) =>
      current.map((item) =>
        item.category === editingCategoryName ? { ...item, category: normalized } : item,
      ),
    )

    setEditingCategoryName('')
    setCategoryDraft('')
  }

  const deleteCategory = (category) => {
    const confirmed = window.confirm(
      `Do you really want to delete the "${category}" category? This will soft delete it and it can be restored later.`,
    )

    if (!confirmed) {
      return
    }

    setMenuCategories((current) => current.filter((item) => item !== category))
    setRestaurantMenu((current) =>
      current.map((item) =>
        item.category === category ? { ...item, category: 'Mains' } : item,
      ),
    )
    if (editingCategoryName === category) {
      setEditingCategoryName('')
      setCategoryDraft('')
    }
  }

  const handleRestaurantProfileSave = (event) => {
    event.preventDefault()

    const payload = {
      ...restaurantPageForm,
      name: restaurantPageForm.name.trim() || 'Bluebird Bistro',
      tagline: restaurantPageForm.tagline.trim() || 'Fine dining with modern comfort',
      description: restaurantPageForm.description.trim() || 'Freshly prepared meals in a welcoming environment.',
      logoUrl: restaurantPageForm.logoUrl.trim() || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80',
      phone: restaurantPageForm.phone.trim() || '+91 98765 43210',
      address: restaurantPageForm.address.trim() || '12 Garden Avenue, Jaipur, Rajasthan',
      accentColor: restaurantPageForm.accentColor || '#f97316',
    }

    setRestaurantProfile(payload)
    setRestaurantPageMessage('Restaurant page saved successfully.')
  }

  const handleAddMenuItem = async (event) => {
    event.preventDefault()

    if (!newMenuItem.name.trim() || !newMenuItem.price) {
      setRestaurantPageMessage('Please add a menu item name and price.')
      return
    }

    const normalizedCategory = newMenuItem.category.trim() || 'Mains'
    const priceValue = Number(newMenuItem.price)
    const baseItem = {
      name: newMenuItem.name.trim(),
      category: normalizedCategory,
      price: Number.isFinite(priceValue) ? priceValue : 0,
      description: newMenuItem.description.trim() || 'Freshly made to order.',
      badge: newMenuItem.badge || 'Popular',
    }

    if (staffToken) {
      try {
        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const activeRestaurantId = context.restaurantId || restaurantId || '1'
        const activeBranchId = context.branchId || branchId || '1'

        const response = await requestJson(
          `/api/v1/restaurants/${activeRestaurantId}/branches/${activeBranchId}/items`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...baseItem,
              currency: 'INR',
              status: 'active',
            }),
          },
          staffToken,
        )

        const createdItem = response?.data
        const item = {
          id: createdItem?.id ?? Date.now(),
          name: createdItem?.name || baseItem.name,
          category: normalizedCategory,
          price: Number(createdItem?.price ?? baseItem.price),
          description: createdItem?.description || baseItem.description,
          badge: createdItem?.badge || baseItem.badge,
        }

        setMenuCategories((current) => {
          const next = current.includes(item.category)
            ? current
            : [...current, item.category]
          return next
        })

        setRestaurantMenu((current) => [item, ...current])
        setNewMenuItem({
          name: '',
          category: normalizedCategory,
          price: '',
          description: '',
          badge: 'Popular',
        })
        setRestaurantPageMessage('Menu item added successfully.')
        return
      } catch (menuError) {
        setRestaurantPageMessage(menuError.message)
        return
      }
    }

    const item = {
      id: Date.now(),
      name: baseItem.name,
      category: baseItem.category,
      price: baseItem.price,
      description: baseItem.description,
      badge: baseItem.badge,
    }

    setMenuCategories((current) => {
      const next = current.includes(normalizedCategory)
        ? current
        : [...current, normalizedCategory]
      return next
    })

    setRestaurantMenu((current) => [item, ...current])
    setNewMenuItem({
      name: '',
      category: normalizedCategory,
      price: '',
      description: '',
      badge: 'Popular',
    })
    setRestaurantPageMessage('Menu item added successfully.')
  }

  const handleAddMenuCategory = async (event) => {
    event.preventDefault()

    const cleanCategory = newCategoryName.trim()
    if (!cleanCategory) {
      setRestaurantPageMessage('Please enter a category name.')
      return
    }

    if (staffToken) {
      try {
        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const activeRestaurantId = context.restaurantId || restaurantId || '1'
        const activeBranchId = context.branchId || branchId || '1'

        const response = await requestJson(
          `/api/v1/restaurants/${activeRestaurantId}/branches/${activeBranchId}/categories`,
          {
            method: 'POST',
            body: JSON.stringify({
              name: cleanCategory,
              sort_order: menuCategories.length,
            }),
          },
          staffToken,
        )

        const createdCategory = response?.data?.name || cleanCategory
        setMenuCategories((current) => (current.includes(createdCategory) ? current : [...current, createdCategory]))
        setNewMenuItem((current) => ({ ...current, category: createdCategory }))
        setNewCategoryName('')
        setRestaurantPageMessage(`Category "${createdCategory}" added.`)
        return
      } catch (categoryError) {
        setRestaurantPageMessage(categoryError.message)
        return
      }
    }

    setMenuCategories((current) => (current.includes(cleanCategory) ? current : [...current, cleanCategory]))
    setNewMenuItem((current) => ({ ...current, category: cleanCategory }))
    setNewCategoryName('')
    setRestaurantPageMessage(`Category "${cleanCategory}" added.`)
  }

  const handleGenerateRestaurantShareLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    const slug = (restaurantProfile.name || 'bluebird-bistro').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const shareUrl = `${baseUrl}/?hotelPage=${encodeURIComponent(slug)}`
    setRestaurantShareUrl(shareUrl)
    setRestaurantPageMessage('Shareable restaurant page link created.')

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {})
    }
  }

  const handleAssignBranchAdmin = async (event) => {
    event.preventDefault()

    if (!staffToken) {
      setBranchAdminMessage('Please sign in as the restaurant owner first.')
      return
    }

    if (!branchAdminName.trim() || !branchAdminEmail.trim() || !branchAdminPassword.trim()) {
      setBranchAdminMessage('Please provide a name, email, and password.')
      return
    }

    try {
      setIsAssigningBranchAdmin(true)
      setBranchAdminMessage('')

      const context = await ensureOwnerRestaurantAndBranch(staffToken)
      const activeRestaurantId = context.restaurantId || restaurantId || '1'
      const activeBranchId = context.branchId || branchId || '1'

      const createdUser = await requestJson('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: branchAdminName.trim(),
          email: branchAdminEmail.trim(),
          password: branchAdminPassword,
          password_confirmation: branchAdminPassword,
        }),
      })

      const normalizedRoleName = branchAdminRole.trim() || 'Waiter'
      const roleResponse = await requestJson(`/api/v1/restaurants/${activeRestaurantId}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          name: normalizedRoleName,
          slug: `${normalizedRoleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          description: `${normalizedRoleName} role for this restaurant.`,
        }),
      }, staffToken)

      const roleId = roleResponse?.data?.id

      if (!roleId) {
        throw new Error('The branch admin role was not created correctly.')
      }

      const membershipResponse = await requestJson(`/api/v1/restaurants/${activeRestaurantId}/memberships`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: createdUser?.user?.id,
          role_id: roleId,
          branch_id: activeBranchId,
          status: 'active',
        }),
      }, staffToken)

      const newStaffMember = {
        id: createdUser?.user?.id || Date.now(),
        membershipId: membershipResponse?.data?.id,
        name: createdUser?.user?.name || branchAdminName.trim(),
        email: createdUser?.user?.email || branchAdminEmail.trim(),
        role: normalizedRoleName,
        membershipStatus: 'active',
        branchId: activeBranchId,
        branchName: availableBranches.find((branch) => branch.id === activeBranchId)?.name || 'Main Branch',
        status: 'online',
      }

      setStaffMembers((current) => [newStaffMember, ...current])
      setBranchAdminMessage(`${normalizedRoleName} access granted to ${createdUser?.user?.name || branchAdminName.trim()}.`)
      setBranchAdminName('')
      setBranchAdminEmail('')
      setBranchAdminPassword('')
    } catch (assignError) {
      setBranchAdminMessage(assignError.message)
    } finally {
      setIsAssigningBranchAdmin(false)
    }
  }

  const handleCreateTable = async (event) => {
    event.preventDefault()

    if (!staffToken) {
      setTableMessage('Please sign in as the restaurant owner first.')
      return
    }

    try {
      setIsCreatingTable(true)
      setTableMessage('')

      const context = await ensureOwnerRestaurantAndBranch(staffToken)
      const activeRestaurantId = context.restaurantId || restaurantId || '1'
      const activeBranchId = context.branchId || branchId || '1'

      const response = await requestJson(`/api/v1/restaurants/${activeRestaurantId}/branches/${activeBranchId}/tables`, {
        method: 'POST',
        body: JSON.stringify({
          table_number: tableNumber,
          name: tableName,
          capacity: Number(tableCapacity || 2),
          section: tableSection,
        }),
      }, staffToken)

      const createdTableId = response?.data?.id
      const newTable = {
        id: createdTableId || Date.now(),
        table_number: tableNumber,
        name: tableName || 'New table',
        section: tableSection || 'Main hall',
        capacity: Number(tableCapacity || 2),
        status: 'available',
      }

      setRestaurantTables((current) => [newTable, ...current])
      setQrTableId(createdTableId ? String(createdTableId) : '')
      setQrToken('')
      setQrImageUrl('')
      setTableMessage(`Table ${tableNumber} created successfully. Use table ID ${createdTableId ?? 'n/a'} for QR generation.`)
      setTableNumber(tableNumber)
      setTableName('')
      setTableCapacity('2')
      setTableSection('Main hall')
    } catch (tableError) {
      setTableMessage(tableError.message)
    } finally {
      setIsCreatingTable(false)
    }
  }

  const handleGenerateQr = async (event) => {
    event.preventDefault()

    if (!staffToken) {
      setQrToken('Please sign in as the restaurant owner first.')
      return undefined
    }

    if (!qrTableId) {
      setQrToken('Create a table first so a QR code can be generated.')
      return undefined
    }

    try {
      setIsGeneratingQr(true)
      const context = await ensureOwnerRestaurantAndBranch(staffToken)
      const activeRestaurantId = context.restaurantId || restaurantId || '1'
      const activeBranchId = context.branchId || branchId || '1'

      const response = await requestJson(`/api/v1/restaurants/${activeRestaurantId}/branches/${activeBranchId}/tables/${qrTableId}/qr-token`, {
        method: 'POST',
      }, staffToken)

      const generatedToken = response?.data?.token
      const generatedQrUrl = response?.data?.qr_url

      let nextImageUrl = ''

      if (generatedQrUrl) {
        nextImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(generatedQrUrl)}`
      } else if (generatedToken) {
        nextImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(generatedToken)}`
      }

      setQrToken(generatedToken || 'QR token generated successfully.')
      setQrImageUrl(nextImageUrl)
      return nextImageUrl
    } catch (qrError) {
      setQrToken(qrError.message)
      setQrImageUrl('')
      return undefined
    } finally {
      setIsGeneratingQr(false)
    }
  }

  const handleDownloadQrImage = async (tableIdValue = qrTableId) => {
    if (!tableIdValue) {
      return
    }

    setQrTableId(String(tableIdValue))
    const nextUrl = await handleGenerateQr({ preventDefault: () => {} })

    if (!nextUrl && !qrImageUrl) {
      return
    }

    const imageSource = nextUrl || qrImageUrl

    const link = document.createElement('a')
    link.href = imageSource
    link.download = `table-${tableIdValue}-qr.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const advanceOrderStatus = async (orderId, nextStatus) => {
    const currentOrder = orders.find((order) => order.id === orderId)

    if (!currentOrder) {
      return
    }

    if (staffToken) {
      try {
        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const targetRestaurantId = context.restaurantId || restaurantId || '1'
        const targetBranchId = context.branchId || branchId || '1'

        const response = await requestJson(
          `/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/orders/${orderId}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
          },
          staffToken,
        )

        const updatedStatus = response?.data?.status || nextStatus

        setOrders((current) =>
          current.map((order) =>
            order.id === orderId ? { ...order, status: updatedStatus } : order,
          ),
        )

        if (['ready', 'served'].includes(updatedStatus)) {
          const existingBill = bills.some((bill) => bill.orderId === orderId)
          if (!existingBill) {
            await createBillForOrder(orderId)
          }
        }

        setConfirmation(`Order ${orderId} updated to ${updatedStatus}.`)
        return
      } catch (statusError) {
        setError(statusError.message)
        return
      }
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order,
      ),
    )
    setConfirmation(`Order ${orderId} updated to ${nextStatus}.`)
  }

  const createBillForOrder = async (orderId) => {
    const order = orders.find((entry) => entry.id === orderId)

    if (!order) {
      return
    }

    if (!['ready', 'served'].includes(order.status)) {
      setError('Order must be marked ready before a bill can be created.')
      return
    }

    const alreadyExists = bills.some((bill) => bill.orderId === orderId)

    if (alreadyExists) {
      return
    }

    if (staffToken) {
      try {
        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const targetRestaurantId = context.restaurantId || restaurantId || '1'
        const targetBranchId = context.branchId || branchId || '1'

        const response = await requestJson(
          `/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/orders/${orderId}/bill`,
          {
            method: 'POST',
          },
          staffToken,
        )

        const billPayload = response?.data || {}
        setBills((current) => [
          {
            id: billPayload.id ?? Date.now(),
            table: String(order.table || 'T-01'),
            orderId: order.id,
            orderStatus: order.status,
            guestSessionId: order.guestSessionId ?? null,
            guestName: order.guestName ?? '',
            guestContactNumber: order.guestContactNumber ?? '',
            total: Number(billPayload.total_amount ?? order.total),
            paid: Number(billPayload.paid_amount ?? 0),
            status: billPayload.status ?? 'pending',
            method: 'cash',
          },
          ...current,
        ])
        return
      } catch (createError) {
        setError(createError.message)
        return
      }
    }

    setBills((current) => [
      {
        id: Date.now(),
        table: order.table,
        orderId: order.id,
        total: order.total,
        paid: 0,
        status: 'pending',
        method: 'cash',
      },
      ...current,
    ])
  }

  const payBill = async (billId, amount, method, provider = method === 'cash' ? 'cash' : 'mock') => {
    const bill = bills.find((entry) => entry.id === billId)

    if (provider === 'razorpay' && razorpayKeyId) {
      const scriptUrl = 'https://checkout.razorpay.com/v1/checkout.js'
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`)

      if (!existingScript) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = scriptUrl
          script.onload = resolve
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(Number(amount || bill?.total || 0) * 100),
        currency: 'INR',
        name: 'Bluebird Table Service',
        description: `Bill #${billId}`,
        handler: async (response) => {
          try {
            const verified = await requestJson('/api/v1/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                bill_id: Number(billId),
                provider: 'razorpay',
                payment_id: response.razorpay_payment_id,
                order_id: String(response.razorpay_order_id || ''),
                signature: response.razorpay_signature,
                amount: Number(amount || bill?.total || 0),
                currency: 'INR',
              }),
            }, staffToken)

            const paymentPayload = verified?.data || {}

            setBills((current) =>
              current.map((entry) =>
                entry.id === billId
                  ? {
                      ...entry,
                      paid: Number(paymentPayload.paid_amount ?? entry.paid),
                      status: paymentPayload.status ?? entry.status,
                      method: 'card',
                      provider: paymentPayload.payment_provider ?? 'razorpay',
                    }
                  : entry,
              ),
            )
          } catch (payError) {
            setError(payError.message)
          }
        },
        theme: { color: '#0f766e' },
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()
      return
    }

    if (staffToken) {
      try {
        const context = await ensureOwnerRestaurantAndBranch(staffToken)
        const targetRestaurantId = context.restaurantId || restaurantId || '1'
        const targetBranchId = context.branchId || branchId || '1'

        const response = await requestJson(
          `/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/bills/${billId}/pay`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              amount: Number(amount || 0),
              payment_method: method,
              provider,
            }),
          },
          staffToken,
        )

        const paymentPayload = response?.data || {}

        setBills((current) =>
          current.map((billEntry) => {
            if (billEntry.id !== billId) {
              return billEntry
            }

            return {
              ...billEntry,
              paid: Number(paymentPayload.paid_amount ?? billEntry.paid),
              total: Number(paymentPayload.total_amount ?? billEntry.total),
              status: paymentPayload.status ?? billEntry.status,
              method,
              provider: paymentPayload.payment_provider ?? provider,
            }
          }),
        )

        return
      } catch (payError) {
        setError(payError.message)
        return
      }
    }

    setBills((current) =>
      current.map((billEntry) => {
        if (billEntry.id !== billId) {
          return billEntry
        }

        const nextPaid = Math.min(billEntry.total, billEntry.paid + Number(amount || 0))
        const isPaid = nextPaid >= billEntry.total

        return {
          ...billEntry,
          paid: nextPaid,
          status: isPaid ? 'paid' : 'partial',
          method,
          provider,
        }
      }),
    )
  }

  const reverseCashBillPayment = async (bill) => {
    if (!canReverseBillPayment || !staffToken || bill.provider !== 'cash' || Number(bill.paid) <= 0) {
      return
    }

    const confirmed = window.confirm(
      `Undo the cash payment for Bill #${bill.id}? The bill will return to Pending with the full amount due.`,
    )
    if (!confirmed) return

    try {
      const context = await ensureOwnerRestaurantAndBranch(staffToken)
      const targetRestaurantId = context.restaurantId || restaurantId || '1'
      const targetBranchId = context.branchId || branchId || '1'
      const response = await requestJson(
        `/api/v1/restaurants/${targetRestaurantId}/branches/${targetBranchId}/bills/${bill.id}/reverse-cash-payment`,
        { method: 'PATCH' },
        staffToken,
      )
      const paymentPayload = response?.data || {}

      setBills((current) => current.map((entry) => entry.id === bill.id
        ? {
            ...entry,
            paid: Number(paymentPayload.paid_amount ?? 0),
            total: Number(paymentPayload.total_amount ?? entry.total),
            status: paymentPayload.status ?? 'pending',
            method: '',
            provider: '',
          }
        : entry))
      setConfirmation(`Cash payment for Bill #${bill.id} was undone.`)
    } catch (reverseError) {
      setError(reverseError.message)
    }
  }

  const renderLandingPage = () => (
    <main className="landing-page">
      <section className="hero-panel panel">
        <div className="hero-copy">
          <span className="eyebrow">Restaurant QR platform</span>
          <h2>Serve faster, manage smarter, delight guests.</h2>
          <p>
            Bluebird Table Service helps hotels and restaurants turn table scans into instant ordering,
            faster payments, and smarter operations.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => setView('guest')}>
              Try guest ordering
            </button>
            <button type="button" className="secondary-button" onClick={() => setView('admin')}>
              Open admin dashboard
            </button>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card primary">
            <span>Live tables</span>
            <strong>24</strong>
            <small>Across 3 active branches</small>
          </div>
          <div className="visual-card secondary">
            <span>Avg. order time</span>
            <strong>6 min</strong>
            <small>From scan to kitchen</small>
          </div>
          <div className="mini-surface">
            <div className="mini-wave" />
            <div className="mini-wave smaller" />
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel feature-card">
          <span className="mini-tag">Smart QR</span>
          <h3>Scan-to-order menu</h3>
          <p>Guests join their table instantly by scanning the QR and ordering without waiting for staff.</p>
        </article>
        <article className="panel feature-card">
          <span className="mini-tag">Operations</span>
          <h3>Kitchen and billing flow</h3>
          <p>Track live orders, update kitchen status, and settle bills from one dashboard.</p>
        </article>
        <article className="panel feature-card">
          <span className="mini-tag">Control</span>
          <h3>Owner tools</h3>
          <p>Create staff accounts, tables, and QR codes from the admin control panel in seconds.</p>
        </article>
      </section>
    </main>
  )

  const renderContactPage = () => (
    <main className="contact-page">
      <section className="panel contact-panel">
        <div className="panel-header">
          <h2>Contact us</h2>
          <span className="mini-tag">Support</span>
        </div>

        <div className="contact-grid">
          <div>
            <h3>Restaurant platform support</h3>
            <p>For demo setup, staff onboarding, or custom menu integration, our team is available for fast support.</p>
            <ul className="contact-list">
              <li>Email: hello@bluebirdtables.com</li>
              <li>Phone: +91 98765 43210</li>
              <li>Hours: Mon–Sat, 9:00 AM – 8:00 PM</li>
            </ul>
          </div>

          <form className="join-form contact-form">
            <label>
              Name
              <input type="text" placeholder="Your name" />
            </label>
            <label>
              Email
              <input type="email" placeholder="you@example.com" />
            </label>
            <label>
              Message
              <textarea rows="5" placeholder="Tell us how we can help." />
            </label>
            <button type="button" className="primary-button">Send message</button>
          </form>
        </div>
      </section>
    </main>
  )

  const handleCreatePlatformRestaurant = async (event) => {
    event.preventDefault()

    if (!staffToken) {
      setPlatformRestaurantMessage('Please log in as a platform admin first.')
      return
    }

    const cleanName = newPlatformRestaurantName.trim()
    const cleanSlug = (newPlatformRestaurantSlug || cleanName).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')

    if (!cleanName || !cleanSlug) {
      setPlatformRestaurantMessage('Please provide a restaurant name and slug.')
      return
    }

    try {
      const response = await requestJson('/api/v1/restaurants', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
          slug: cleanSlug,
          currency: 'INR',
          timezone: 'Asia/Kolkata',
        }),
      }, staffToken)

      const createdRestaurant = response?.data
      setPlatformRestaurants((current) => [createdRestaurant, ...current])
      setNewPlatformRestaurantName('')
      setNewPlatformRestaurantSlug('')
      setPlatformRestaurantMessage(`Restaurant "${cleanName}" created successfully.`)
    } catch (error) {
      setPlatformRestaurantMessage(error.message)
    }
  }

  const handleAssignRestaurantPlan = async (restaurantId, planSlug, billingCycle = 'monthly') => {
    if (!staffToken) {
      setPlatformRestaurantMessage('Please log in as a platform admin first.')
      return
    }

    try {
      const response = await requestJson(`/api/v1/restaurants/${restaurantId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan_slug: planSlug,
          billing_cycle: billingCycle,
        }),
      }, staffToken)

      const nextSubscription = response?.data?.subscription_plan || null
      const nextStatus = response?.data?.subscription_status || 'active'

      setPlatformRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === restaurantId
            ? { ...restaurant, subscription_plan: nextSubscription, subscription_status: nextStatus, billing_cycle: billingCycle }
            : restaurant,
        ),
      )
      setPlatformRestaurantMessage(`Restaurant plan updated to ${nextSubscription?.name || planSlug}.`)
    } catch (error) {
      setPlatformRestaurantMessage(error.message)
    }
  }

  const resetPlanForm = () => {
    setEditingPlanId(null)
    setPlanForm({
      name: '',
      slug: '',
      price_monthly: '0',
      price_annual: '0',
      max_tables: '5',
      features: '',
    })
  }

  const handleSaveSubscriptionPlan = async (event) => {
    event.preventDefault()

    if (!staffToken) {
      setPlanMessage('Please log in as a platform admin first.')
      return
    }

    const payload = {
      name: planForm.name.trim(),
      slug: planForm.slug.trim(),
      price_monthly: Number(planForm.price_monthly || 0),
      price_annual: Number(planForm.price_annual || 0),
      max_tables: Number(planForm.max_tables || 1),
      features: planForm.features
        .split(',')
        .map((feature) => feature.trim())
        .filter(Boolean),
    }

    if (!payload.name || !payload.slug) {
      setPlanMessage('Please add a plan name and slug.')
      return
    }

    try {
      const endpoint = editingPlanId ? `/api/v1/subscription-plans/${editingPlanId}` : '/api/v1/subscription-plans'
      const method = editingPlanId ? 'PATCH' : 'POST'
      const response = await requestJson(endpoint, {
        method,
        body: JSON.stringify(payload),
      }, staffToken)

      const savedPlan = response?.data
      setSubscriptionPlans((current) => {
        if (editingPlanId) {
          return current.map((plan) => plan.id === savedPlan.id ? savedPlan : plan)
        }

        return [savedPlan, ...current]
      })

      resetPlanForm()
      setPlanMessage(editingPlanId ? `Plan "${savedPlan.name}" updated.` : `Plan "${savedPlan.name}" created.`)
    } catch (error) {
      setPlanMessage(error.message)
    }
  }

  const handleEditSubscriptionPlan = (plan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      name: plan.name || '',
      slug: plan.slug || '',
      price_monthly: String(plan.price_monthly ?? 0),
      price_annual: String(plan.price_annual ?? 0),
      max_tables: String(plan.max_tables ?? 1),
      features: Array.isArray(plan.features) ? plan.features.join(', ') : '',
    })
    setPlanMessage(`Editing plan: ${plan.name}`)
  }

  const handleDeleteSubscriptionPlan = async (planId) => {
    if (!staffToken) {
      setPlanMessage('Please log in as a platform admin first.')
      return
    }

    const plan = subscriptionPlans.find((item) => item.id === planId)
    const confirmed = window.confirm(`Do you really want to delete plan "${plan?.name || 'this plan'}"? This will soft delete it, so it can be recovered later.`)
    if (!confirmed) {
      return
    }

    try {
      await requestJson(`/api/v1/subscription-plans/${planId}`, { method: 'DELETE' }, staffToken)
      setSubscriptionPlans((current) => current.filter((plan) => plan.id !== planId))
      setPlatformRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.subscription_plan?.id === planId
            ? { ...restaurant, subscription_plan: null, subscription_status: 'inactive' }
            : restaurant,
        ),
      )

      if (editingPlanId === planId) {
        resetPlanForm()
      }

      setPlanMessage('Plan soft deleted successfully. It can be recovered later.')
    } catch (error) {
      setPlanMessage(error.message)
    }
  }

  const handleToggleRestaurantStatus = async (restaurant) => {
    if (!staffToken) {
      setPlatformRestaurantMessage('Please log in as a platform admin first.')
      return
    }

    const nextStatus = restaurant.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await requestJson(`/api/v1/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }, staffToken)

      setPlatformRestaurants((current) =>
        current.map((item) => item.id === restaurant.id ? { ...item, status: response?.data?.status || nextStatus } : item),
      )
      setPlatformRestaurantMessage(`Restaurant "${restaurant.name}" is now ${nextStatus}.`)
    } catch (error) {
      setPlatformRestaurantMessage(error.message)
    }
  }

  const handleDeletePlatformRestaurant = async (restaurant) => {
    if (!staffToken) {
      setPlatformRestaurantMessage('Please log in as a platform admin first.')
      return
    }

    const confirmed = window.confirm(`Do you really want to delete restaurant "${restaurant.name}"? This will soft delete it, so it can be recovered later.`)
    if (!confirmed) {
      return
    }

    try {
      await requestJson(`/api/v1/restaurants/${restaurant.id}`, {
        method: 'DELETE',
      }, staffToken)

      setPlatformRestaurants((current) => current.filter((item) => item.id !== restaurant.id))
      setPlatformRestaurantMessage(`Restaurant "${restaurant.name}" was soft deleted and can be recovered later.`)
    } catch (error) {
      setPlatformRestaurantMessage(error.message)
    }
  }

  const getRestaurantTableCount = (restaurant) => {
    const branchList = Array.isArray(restaurant?.branches) ? restaurant.branches : []

    return branchList.reduce((total, branch) => {
      const tables = Array.isArray(branch?.dining_tables) ? branch.dining_tables : []
      return total + tables.length
    }, 0)
  }

  const renderPlatformRestaurants = () => {
    const filteredRestaurants = platformRestaurants.filter((restaurant) => {
      const searchText = platformSearchTerm.trim().toLowerCase()
      const matchesSearch = !searchText ||
        (restaurant.name || '').toLowerCase().includes(searchText) ||
        (restaurant.slug || '').toLowerCase().includes(searchText)
      const matchesStatus = platformStatusFilter === 'all' || (restaurant.status || 'draft') === platformStatusFilter

      return matchesSearch && matchesStatus
    })

    return (
      <>
        <div className="panel-header">
          <h2>Registered restaurants</h2>
          <span className="mini-tag">Platform admin</span>
        </div>

        <form className="join-form" onSubmit={handleCreatePlatformRestaurant} style={{ marginBottom: '1.5rem' }}>
          <label>
            Restaurant name
            <input
              type="text"
              value={newPlatformRestaurantName}
              onChange={(event) => setNewPlatformRestaurantName(event.target.value)}
              placeholder="Sunset Cafe"
            />
          </label>

          <label>
            Slug
            <input
              type="text"
              value={newPlatformRestaurantSlug}
              onChange={(event) => setNewPlatformRestaurantSlug(event.target.value)}
              placeholder="sunset-cafe"
            />
          </label>

          <button type="submit" className="primary-button">Add restaurant</button>
        </form>

        {platformRestaurantsError && <p className="message error">{platformRestaurantsError}</p>}
        {platformRestaurantMessage && <p className="message success">{platformRestaurantMessage}</p>}
        {impersonatedRestaurant && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" className="primary-button" onClick={handleReturnToSuperAdmin}>
              Return to super admin
            </button>
          </div>
        )}

        <div className="panel section-panel" style={{ marginBottom: '1.5rem' }}>
          <div className="panel-header compact">
            <h3>Restaurant pricing plans</h3>
            <span className="mini-tag">{subscriptionPlans.length}</span>
          </div>

          <form onSubmit={handleSaveSubscriptionPlan} className="join-form" style={{ marginBottom: '1.25rem' }}>
            <label>
              Plan name
              <input
                type="text"
                value={planForm.name}
                onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Growth"
              />
            </label>

            <label>
              Slug
              <input
                type="text"
                value={planForm.slug}
                onChange={(event) => setPlanForm((current) => ({ ...current, slug: event.target.value }))}
                placeholder="growth"
              />
            </label>

            <label>
              Monthly price
              <input
                type="number"
                min="0"
                step="0.01"
                value={planForm.price_monthly}
                onChange={(event) => setPlanForm((current) => ({ ...current, price_monthly: event.target.value }))}
              />
            </label>

            <label>
              Annual price
              <input
                type="number"
                min="0"
                step="0.01"
                value={planForm.price_annual}
                onChange={(event) => setPlanForm((current) => ({ ...current, price_annual: event.target.value }))}
              />
            </label>

            <label>
              Max tables
              <input
                type="number"
                min="1"
                value={planForm.max_tables}
                onChange={(event) => setPlanForm((current) => ({ ...current, max_tables: event.target.value }))}
              />
            </label>

            <label>
              Features
              <input
                type="text"
                value={planForm.features}
                onChange={(event) => setPlanForm((current) => ({ ...current, features: event.target.value }))}
                placeholder="Unlimited menu items, priority support"
              />
            </label>

            <div className="order-actions" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="primary-button">
                {editingPlanId ? 'Update plan' : 'Create plan'}
              </button>
              {editingPlanId && (
                <button type="button" className="secondary-button" onClick={resetPlanForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          {planMessage && <p className="message success">{planMessage}</p>}

          <div className="stack-list">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="order-card">
                <div className="order-head">
                  <strong>{plan.name}</strong>
                  <span>₹{Number(plan.price_monthly).toLocaleString('en-IN')}/mo</span>
                </div>
                <p>{Array.isArray(plan.features) && plan.features.length ? plan.features.join(' • ') : 'Includes access'}</p>
                <small>{plan.max_tables} tables</small>
                <div className="row-actions" style={{ marginTop: '0.75rem' }}>
                  <button type="button" className="small-button" onClick={() => handleEditSubscriptionPlan(plan)}>Edit</button>
                  <button type="button" className="small-button accent" onClick={() => handleDeleteSubscriptionPlan(plan.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel section-panel" style={{ marginBottom: '1.5rem' }}>
          <div className="order-actions" style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={platformSearchTerm}
              onChange={(event) => setPlatformSearchTerm(event.target.value)}
              placeholder="Search by restaurant name or slug"
              style={{ minWidth: '220px', flex: 1 }}
            />
            <select
              value={platformStatusFilter}
              onChange={(event) => setPlatformStatusFilter(event.target.value)}
              style={{ minWidth: '160px' }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {filteredRestaurants.length === 0 ? (
            <p className="empty-state">No matching restaurants found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Restaurant</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Slug</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Tables</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Plan</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #dfe2ea' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((restaurant) => {
                    const tableCount = getRestaurantTableCount(restaurant)
                    const selectedPlan = selectedPlanByRestaurant[restaurant.id] ?? restaurant.subscription_plan?.slug ?? 'starter'

                    return (
                      <tr key={restaurant.id}>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>
                          <strong>{restaurant.name || 'Unnamed restaurant'}</strong>
                        </td>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>{restaurant.slug || '—'}</td>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>{tableCount}</td>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>{restaurant.subscription_plan?.name || 'No plan assigned'}</td>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>
                          <span className={`status-chip ${restaurant.status === 'active' ? 'ready' : restaurant.status === 'inactive' ? 'cancelled' : 'submitted'}`}>
                            {restaurant.status || 'draft'}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 0.75rem', borderBottom: '1px solid #edf0f5' }}>
                          <div className="order-actions" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                            <select
                              value={selectedPlan}
                              onChange={(event) => setSelectedPlanByRestaurant((current) => ({ ...current, [restaurant.id]: event.target.value }))}
                            >
                              {subscriptionPlans.map((plan) => (
                                <option key={plan.id} value={plan.slug}>{plan.name}</option>
                              ))}
                            </select>
                            <button type="button" className="small-button" onClick={() => handleAssignRestaurantPlan(restaurant.id, selectedPlan)}>
                              Assign plan
                            </button>
                            <button type="button" className="small-button" onClick={() => handleImpersonateRestaurant(restaurant)}>
                              Login as
                            </button>
                            <button type="button" className="small-button" onClick={() => handleToggleRestaurantStatus(restaurant)}>
                              {restaurant.status === 'active' ? 'Disable' : 'Enable'}
                            </button>
                            <button type="button" className="small-button accent" onClick={() => handleDeletePlatformRestaurant(restaurant)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )
  }

  const renderAdminOverview = () => (
    <>
      <div className="panel-header">
        <h2>Restaurant overview</h2>
        <span className="mini-tag">Owner dashboard</span>
      </div>

      <div className="metric-grid">
        {adminMetrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <label>{metric.label}</label>
            <strong>{metric.value}</strong>
            <span>{metric.change}</span>
          </article>
        ))}
      </div>

      <div className="admin-summary-grid">
        <section className="panel inside-panel">
          <div className="panel-header compact">
            <h3>Operational alerts</h3>
            <span className="mini-tag">Live</span>
          </div>

          <div className="alert-list">
            {operatingAlerts.map((alert) => (
              <div className="alert-item" key={alert.title}>
                <div className={`alert-pill ${alert.priority}`}>{alert.priority}</div>
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel inside-panel">
          <div className="panel-header compact">
            <h3>Shift summary</h3>
            <span className="mini-tag">Team</span>
          </div>

          <div className="staff-list">
            {staffMembers.map((member) => (
              <div className="staff-row" key={member.id ?? member.name}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <div className="row-actions">
                  <span className={`team-status ${member.status}`}>{member.status}</span>
                  <button type="button" className="small-button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); startEditingStaff(member) }}>Edit</button>
                  <button type="button" className="small-button accent" onClick={() => deleteStaffMember(member.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

        </section>
      </div>

      <div className="admin-summary-grid" style={{ marginTop: '1.5rem' }}>
        <section className="panel inside-panel">
          <div className="panel-header compact">
            <h3>Restaurant tables</h3>
            <span className="mini-tag">{restaurantTables.length}</span>
          </div>

          <div className="staff-list">
            {restaurantTables.map((table) => (
              <div className="staff-row" key={table.id ?? `${table.table_number}-${table.section}`}>
                <div>
                  <strong>{table.table_number}</strong>
                  <span>{table.name} • {table.section}</span>
                </div>
                <div className="row-actions">
                  <span className={`team-status ${table.status === 'occupied' ? 'busy' : 'online'}`}>
                    {table.status}
                  </span>
                  <button type="button" className="small-button" onClick={() => startEditingTable(table)}>Edit</button>
                  <button type="button" className="small-button accent" onClick={() => deleteTable(table.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {editingTableId && (
            <div className="modal-backdrop" onClick={() => setEditingTableId(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <div className="panel-header compact">
                  <h3>Edit table</h3>
                  <button type="button" className="small-button" onClick={() => setEditingTableId(null)}>Close</button>
                </div>

                <div className="inline-editor">
                  <input
                    type="text"
                    value={tableDraft.table_number}
                    onChange={(event) => setTableDraft((current) => ({ ...current, table_number: event.target.value }))}
                    placeholder="Table number"
                  />
                  <input
                    type="text"
                    value={tableDraft.name}
                    onChange={(event) => setTableDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Table name"
                  />
                  <input
                    type="text"
                    value={tableDraft.section}
                    onChange={(event) => setTableDraft((current) => ({ ...current, section: event.target.value }))}
                    placeholder="Section"
                  />
                  <input
                    type="number"
                    min="1"
                    value={tableDraft.capacity}
                    onChange={(event) => setTableDraft((current) => ({ ...current, capacity: event.target.value }))}
                    placeholder="Capacity"
                  />
                  <select value={tableDraft.status} onChange={(event) => setTableDraft((current) => ({ ...current, status: event.target.value }))}>
                    <option value="available">available</option>
                    <option value="occupied">occupied</option>
                  </select>
                  <button type="button" className="small-button" onClick={saveTable}>Save</button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel inside-panel">
          <div className="panel-header compact">
            <h3>Employee list</h3>
            <span className="mini-tag">{staffMembers.length}</span>
          </div>

          <div className="staff-list">
            {staffMembers.map((member) => (
              <div className="staff-row" key={`employee-${member.id ?? member.name}`}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
                <span className={`team-status ${member.status}`}>{member.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )

  const renderAdminStaff = () => {
    if (!canManageRestaurantOperations) {
      return (
        <div className="panel section-panel">
          <div className="panel-header">
            <h2>Staff access</h2>
            <span className="mini-tag">Restricted</span>
          </div>
          <p className="message info">Only the manager, branch admin, restaurant owner, or super admin can manage staff.</p>
        </div>
      )
    }

    return (
      <>
      <div className="panel-header">
        <h2>Add staff</h2>
        <span className="mini-tag">Permissions</span>
      </div>

      <form className="join-form" onSubmit={handleAssignBranchAdmin}>
        <label>
          Full name
          <input
            type="text"
            value={branchAdminName}
            onChange={(event) => setBranchAdminName(event.target.value)}
            placeholder="Aditi Verma"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={branchAdminEmail}
            onChange={(event) => setBranchAdminEmail(event.target.value)}
            placeholder="branchadmin@example.com"
          />
        </label>

        <label>
          Role
          <select
            value={branchAdminRole}
            onChange={(event) => setBranchAdminRole(event.target.value)}
          >
            <option value="Waiter">Waiter</option>
            <option value="Chef">Chef</option>
            <option value="Manager">Manager</option>
            <option value="Branch Admin">Branch Admin</option>
          </select>
        </label>

        <label>
          Password
          <input
            type="password"
            value={branchAdminPassword}
            onChange={(event) => setBranchAdminPassword(event.target.value)}
            placeholder="Create password"
          />
        </label>

        <button type="submit" className="primary-button" disabled={isAssigningBranchAdmin}>
          {isAssigningBranchAdmin ? 'Assigning...' : 'Create staff account'}
        </button>
      </form>

      {branchAdminMessage && <p className="message success" style={{ marginTop: '1rem' }}>{branchAdminMessage}</p>}

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Current employees</h3>
          <span className="mini-tag">{staffMembers.length}</span>
        </div>

        <div className="staff-list">
          {staffMembers.map((member) => (
            <div className="staff-row" key={`staff-list-${member.id ?? member.name}`}>
              <div>
                <strong>{member.name}</strong>
                <span>{member.role}</span>
              </div>
              <div className="row-actions">
                <span className={`team-status ${member.status}`}>{member.status}</span>
                <button type="button" className="small-button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); startEditingStaff(member) }}>Edit</button>
                <button type="button" className="small-button accent" onClick={() => deleteStaffMember(member.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
    )
  }

  const renderAdminTables = () => {
    if (!canManageRestaurantOperations) {
      return (
        <div className="panel section-panel">
          <div className="panel-header">
            <h2>Table access</h2>
            <span className="mini-tag">Restricted</span>
          </div>
          <p className="message info">Only the manager, branch admin, restaurant owner, or super admin can add or delete tables.</p>
        </div>
      )
    }

    return (
      <>
      <div className="panel-header">
        <h2>Create table & QR</h2>
        <span className="mini-tag">Dining setup</span>
      </div>

      <form className="join-form" onSubmit={handleCreateTable}>
        <label>
          Table number
          <input
            type="text"
            value={tableNumber}
            onChange={(event) => setTableNumber(event.target.value)}
            placeholder="T-20"
          />
        </label>

        <label>
          Table name
          <input
            type="text"
            value={tableName}
            onChange={(event) => setTableName(event.target.value)}
            placeholder="Window table"
          />
        </label>

        <label>
          Capacity
          <input
            type="number"
            min="1"
            value={tableCapacity}
            onChange={(event) => setTableCapacity(event.target.value)}
            placeholder="4"
          />
        </label>

        <label>
          Section
          <input
            type="text"
            value={tableSection}
            onChange={(event) => setTableSection(event.target.value)}
            placeholder="Main hall"
          />
        </label>

        <button type="submit" className="primary-button" disabled={isCreatingTable}>
          {isCreatingTable ? 'Creating...' : 'Create table'}
        </button>
      </form>

      {tableMessage && <p className="message success" style={{ marginTop: '1rem' }}>{tableMessage}</p>}

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Restaurant tables</h3>
          <span className="mini-tag">{restaurantTables.length}</span>
        </div>

        <div className="staff-list">
          {restaurantTables.map((table) => (
            <div className="staff-row" key={`table-list-${table.id ?? `${table.table_number}-${table.section}`}`}>
              <div>
                <strong>{table.table_number}</strong>
                <span>
                  {table.name} • {table.section}
                </span>
                <small style={{ display: 'block', marginTop: '0.25rem', color: '#5b6475' }}>Table ID: {table.id ?? table.table_number}</small>
              </div>
              <div className="row-actions">
                <span className={`team-status ${table.status === 'occupied' ? 'busy' : 'online'}`}>
                  {table.status}
                </span>
                <button type="button" className="small-button" onClick={() => startEditingTable(table)}>Edit</button>
                <button type="button" className="small-button accent" onClick={() => deleteTable(table.id)}>Delete</button>
                <button type="button" className="small-button" onClick={() => { setQrTableId(String(table.id)); handleDownloadQrImage(table.id) }} disabled={!table.id || !qrImageUrl}>
                  Download QR
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form className="join-form" onSubmit={handleGenerateQr} style={{ marginTop: '1rem' }}>
        <label>
          Table ID for QR
          <input
            type="text"
            value={qrTableId}
            onChange={(event) => setQrTableId(event.target.value)}
            placeholder="Auto-filled from created table"
            readOnly={Boolean(qrTableId)}
          />
        </label>

        <button type="submit" className="primary-button" disabled={isGeneratingQr || !qrTableId}>
          {isGeneratingQr ? 'Generating...' : 'Generate QR token'}
        </button>
      </form>

      {qrImageUrl && (
        <div className="message" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <strong>QR code</strong>
          <img
            src={qrImageUrl}
            alt="Generated table QR code"
            style={{ width: '220px', height: '220px', background: '#ffffff', borderRadius: '12px', padding: '10px' }}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={() => handleDownloadQrImage(qrTableId)}
          >
            Download QR image
          </button>
          <div style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', wordBreak: 'break-all' }}>
            <strong>Scanner URL:</strong><br />
            {qrToken ? decodeURIComponent(qrImageUrl.replace('https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=', '')) : 'URL unavailable'}
          </div>
        </div>
      )}

      {qrToken && (
        <div className="message" style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
          <strong>QR token:</strong>
          <div>{qrToken}</div>
        </div>
      )}
    </>
    )
  }

  const renderAdminOrders = () => {
    const visibleOrders = orders.filter((order) => (order.status || 'submitted') === activeOrderTab)

    return (
      <>
        <div className="panel-header">
          <h2>Orders board</h2>
          <span className="mini-tag">KDS</span>
        </div>

        {opsLoadError && <p className="message error">{opsLoadError}</p>}

        <div className="view-switcher" style={{ marginBottom: '1rem' }}>
          {orderStatusTabs.map((status) => (
            <button
              key={status}
              type="button"
              className={activeOrderTab === status ? 'tab active' : 'tab'}
              onClick={() => setActiveOrderTab(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="stack-list">
          {visibleOrders.length === 0 && (
            <p className="empty-state">No {activeOrderTab} orders yet.</p>
          )}

          {visibleOrders.map((order) => (
            <div className="order-card" key={order.id}>
              <div className="order-head">
                <strong>{order.customer || `Table ${order.table}`}</strong>
                <span>{order.time} • Table {order.table}</span>
              </div>
              <p>{Array.isArray(order.items) ? order.items.join(', ') : (order.items || 'No item names')}</p>
              <div className="order-actions">
                <span>₹{order.total}</span>
                <select
                  value={order.status}
                  onChange={(event) => advanceOrderStatus(order.id, event.target.value)}
                >
                  {Object.keys(statusFlow).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  const getBillingPage = (visibleBills) => {
    const totalPages = Math.max(1, Math.ceil(visibleBills.length / billsPerPage))
    const currentPage = Math.min(billingPage, totalPages)
    const startIndex = (currentPage - 1) * billsPerPage

    return {
      pageBills: visibleBills.slice(startIndex, startIndex + billsPerPage),
      totalPages,
      currentPage,
      firstBill: visibleBills.length === 0 ? 0 : startIndex + 1,
      lastBill: Math.min(startIndex + billsPerPage, visibleBills.length),
    }
  }

  const renderBillingPagination = ({ total, firstBill, lastBill, currentPage, totalPages }) => (
    <div className="billing-pagination" aria-label="Billing pagination">
      <span>Showing {firstBill}–{lastBill} of {total} guest groups</span>
      <div>
        <button type="button" className="small-button" disabled={currentPage <= 1} onClick={() => setBillingPage(currentPage - 1)}>
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button type="button" className="small-button" disabled={currentPage >= totalPages} onClick={() => setBillingPage(currentPage + 1)}>
          Next
        </button>
      </div>
    </div>
  )

  const groupBillsByGuestDevice = (billList) => {
    const groups = new Map()

    billList.forEach((bill) => {
      const guestSessionId = bill.guestSessionId ? String(bill.guestSessionId) : ''
      const key = guestSessionId ? `guest-${guestSessionId}` : `order-${bill.orderId || bill.id}`

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          guestSessionId,
          guestName: bill.guestName || '',
          guestContactNumber: bill.guestContactNumber || '',
          table: bill.table,
          bills: [],
          total: 0,
          paid: 0,
          due: 0,
        })
      }

      const group = groups.get(key)
      group.bills.push(bill)
      group.total += Number(bill.total || 0)
      group.paid += Number(bill.paid || 0)
      if (bill.orderStatus !== 'cancelled' && bill.status !== 'cancelled') {
        group.due += Math.max(Number(bill.total || 0) - Number(bill.paid || 0), 0)
      }
    })

    return [...groups.values()]
  }

  const getBillsForBillingTab = () => {
    const billsWithCancelledOrders = billingTab === 'cancelled'
      ? [
          ...bills,
          ...orders
            .filter((order) => order.status === 'cancelled' && !bills.some((bill) => Number(bill.orderId) === Number(order.id)))
            .map((order) => ({
              id: `cancelled-order-${order.id}`,
              orderId: order.id,
              orderStatus: 'cancelled',
              guestSessionId: order.guestSessionId,
              guestName: order.guestName || order.customer,
              guestContactNumber: order.guestContactNumber,
              table: order.table,
              total: Number(order.total || 0),
              paid: 0,
              status: 'cancelled',
              isOrderOnly: true,
            })),
        ]
      : bills

    return billsWithCancelledOrders.filter((bill) => {
      const isCancelled = bill.status === 'cancelled' || bill.orderStatus === 'cancelled'
      if (billingTab === 'paid') return bill.status === 'paid' && !isCancelled
      if (billingTab === 'cancelled') return isCancelled
      return ['pending', 'partial'].includes(bill.status) && !isCancelled
    })
  }

  const renderAdminBilling = () => {
    const visibleBills = getBillsForBillingTab()
    const visibleBillGroups = groupBillsByGuestDevice(visibleBills)
    const pagination = getBillingPage(visibleBillGroups)

    return (
      <>
        <div className="panel-header">
          <h2>Billing</h2>
          <span className="mini-tag">Payments</span>
        </div>

        {opsLoadError && <p className="message error">{opsLoadError}</p>}

        <div className="view-switcher" style={{ marginBottom: '1rem' }}>
          {['pending', 'paid', 'cancelled'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={billingTab === tab ? 'tab active' : 'tab'}
              onClick={() => { setBillingTab(tab); setBillingPage(1) }}
            >
              {tab === 'paid' ? 'Paid orders' : tab === 'cancelled' ? 'Cancelled orders' : 'Pending orders'}
            </button>
          ))}
        </div>

        <div className="stack-list">
          {visibleBills.length === 0 && (
            <p className="empty-state">No {billingTab === 'paid' ? 'paid' : billingTab === 'cancelled' ? 'cancelled' : 'pending'} bills yet.</p>
          )}

          {pagination.pageBills.map((group) => (
            <div className="bill-device-group" key={group.key}>
              <div className="bill-device-header">
                <div>
                  <strong>{group.guestName || (group.guestSessionId ? `Guest device #${group.guestSessionId}` : 'Table guest')}</strong>
                  {group.guestContactNumber && <span>{group.guestContactNumber}</span>}
                  <span>{group.table} · {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}</span>
                </div>
                <div>
                  <span>Device amount due</span>
                  <strong>{currency.format(group.due)}</strong>
                </div>
              </div>
              {group.bills.map((bill) => (
                <div className="bill-device-line" key={bill.id}>
                  <span>{bill.isOrderOnly ? `Cancelled order #${bill.orderId}` : `Bill #${bill.id} · Order #${bill.orderId}`}</span>
                  <span>{bill.isOrderOnly ? `Order total ${currency.format(bill.total)}` : `${currency.format(bill.paid)} paid of ${currency.format(bill.total)}`}</span>
                  <span className="status-badge">{bill.orderStatus === 'cancelled' ? 'cancelled' : bill.status}</span>
                  {billingTab === 'pending' && !bill.isOrderOnly && (
                    <button type="button" className="small-button" onClick={() => void payBill(bill.id, bill.total - bill.paid, 'cash')}>
                      Mark paid
                    </button>
                  )}
                  {canReverseBillPayment && bill.provider === 'cash' && bill.paid > 0 && (
                    <button type="button" className="small-button" onClick={() => void reverseCashBillPayment(bill)}>
                      Undo payment
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        {visibleBillGroups.length > billsPerPage && renderBillingPagination({ ...pagination, total: visibleBillGroups.length })}
      </>
    )
  }

  const renderRestaurantPageEditor = () => {
    if (!canEditRestaurantPage) {
      return (
        <div className="panel section-panel">
          <div className="panel-header">
            <h2>Hotel page builder</h2>
            <span className="mini-tag">Restricted</span>
          </div>
          <p className="message info">Only the restaurant owner can edit the hotel page.</p>
        </div>
      )
    }

    return (
      <>
      <div className="panel-header">
        <h2>Hotel page builder</h2>
        <span className="mini-tag">Public profile</span>
      </div>

      <div className="restaurant-builder-grid">
        <form className="join-form" onSubmit={handleRestaurantProfileSave}>
          <label>
            Hotel name
            <input
              type="text"
              value={restaurantPageForm.name}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label>
            Tagline
            <input
              type="text"
              value={restaurantPageForm.tagline}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, tagline: event.target.value }))}
            />
          </label>

          <label>
            Hotel logo URL
            <input
              type="url"
              value={restaurantPageForm.logoUrl}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, logoUrl: event.target.value }))}
            />
          </label>

          <label>
            Phone number
            <input
              type="tel"
              value={restaurantPageForm.phone}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label>
            Address
            <input
              type="text"
              value={restaurantPageForm.address}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, address: event.target.value }))}
            />
          </label>

          <label>
            Accent color
            <input
              type="color"
              value={restaurantPageForm.accentColor}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, accentColor: event.target.value }))}
            />
          </label>

          <label>
            Hotel description
            <textarea
              rows="4"
              value={restaurantPageForm.description}
              onChange={(event) => setRestaurantPageForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <button type="submit" className="primary-button">Save hotel page</button>
        </form>

        <div className="panel section-panel">
          <div className="panel-header compact">
            <h3>Preview</h3>
            <span className="mini-tag">Live</span>
          </div>

          <div className="restaurant-preview" style={{ '--brand-accent': restaurantProfile.accentColor }}>
            <img src={restaurantProfile.logoUrl} alt={restaurantProfile.name} />
            <div>
              <h3>{restaurantProfile.name}</h3>
              <p>{restaurantProfile.tagline}</p>
            </div>
          </div>

          <div className="share-box">
            <strong>Share page</strong>
            <p>{restaurantShareUrl || 'Create a public share link for guests.'}</p>
            <button type="button" className="secondary-button" onClick={handleGenerateRestaurantShareLink}>
              Generate share link
            </button>
          </div>
        </div>
      </div>

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Add menu item</h3>
          <span className="mini-tag">Menu</span>
        </div>

        <form className="join-form" onSubmit={handleAddMenuItem}>
          <div className="menu-item-form-grid">
            <label>
              Item name
              <input
                type="text"
                value={newMenuItem.name}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              Category
              <input
                type="text"
                list="menu-category-suggestions"
                value={newMenuItem.category}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, category: event.target.value }))}
              />
              <datalist id="menu-category-suggestions">
                {menuCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label>
              Price (₹)
              <input
                type="number"
                min="0"
                value={newMenuItem.price}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, price: event.target.value }))}
              />
            </label>

            <label>
              Badge
              <input
                type="text"
                value={newMenuItem.badge}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, badge: event.target.value }))}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              rows="3"
              value={newMenuItem.description}
              onChange={(event) => setNewMenuItem((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <button type="submit" className="primary-button">Add menu item</button>
        </form>
      </div>

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Menu categories</h3>
          <span className="mini-tag">{menuCategories.length}</span>
        </div>

        <form className="category-form" onSubmit={handleAddMenuCategory}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Add a new category"
          />
          <button type="submit" className="secondary-button">Add category</button>
        </form>

        <div className="category-pills">
          {menuCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={newMenuItem.category === category ? 'category-pill active' : 'category-pill'}
              onClick={() => setNewMenuItem((current) => ({ ...current, category }))}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Current menu</h3>
          <span className="mini-tag">{restaurantMenu.length}</span>
        </div>

        <div className="restaurant-menu-list">
          {restaurantMenu.map((item) => (
            <div className="restaurant-menu-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category}</span>
              </div>
              <div className="restaurant-menu-meta">
                <span className="mini-tag accent-tag">{item.badge}</span>
                <strong>{currency.format(item.price)}</strong>
                <div className="row-actions">
                  <button type="button" className="small-button" onClick={() => startEditingMenuItem(item)}>Edit</button>
                  <button type="button" className="small-button accent" onClick={() => deleteMenuItem(item.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingMenuItemId && (
        <div className="modal-backdrop" onClick={() => setEditingMenuItemId(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header compact">
              <h3>Edit menu item</h3>
              <button type="button" className="small-button" onClick={() => setEditingMenuItemId(null)}>Close</button>
            </div>

            <div className="inline-editor">
              <input
                type="text"
                value={menuItemDraft.name}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Item name"
              />
              <input
                type="text"
                list="menu-category-suggestions"
                value={menuItemDraft.category}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="Category"
              />
              <input
                type="number"
                min="0"
                value={menuItemDraft.price}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, price: event.target.value }))}
                placeholder="Price"
              />
              <input
                type="text"
                value={menuItemDraft.badge}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, badge: event.target.value }))}
                placeholder="Badge"
              />
              <textarea
                rows="3"
                value={menuItemDraft.description}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
              />
              <button type="button" className="small-button" onClick={saveMenuItem}>Save</button>
            </div>
          </div>
        </div>
      )}

      {restaurantPageMessage && <p className="message success" style={{ marginTop: '1rem' }}>{restaurantPageMessage}</p>}
    </>
    )
  }

  const renderMenuManager = () => {
    if (!canManageRestaurantOperations) {
      return (
        <div className="panel section-panel">
          <div className="panel-header">
            <h2>Menu access</h2>
            <span className="mini-tag">Restricted</span>
          </div>
          <p className="message info">Only the manager, branch admin, restaurant owner, or super admin can manage menu items.</p>
        </div>
      )
    }

    return (
      <>
      <div className="panel-header">
        <h2>Menu manager</h2>
        <span className="mini-tag">Add & list</span>
      </div>

      <div className="panel section-panel">
        <div className="panel-header compact">
          <h3>Add menu item</h3>
          <span className="mini-tag">Menu</span>
        </div>

        <form className="join-form" onSubmit={handleAddMenuItem}>
          <div className="menu-item-form-grid">
            <label>
              Item name
              <input
                type="text"
                value={newMenuItem.name}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label>
              Category
              <input
                type="text"
                list="menu-category-suggestions"
                value={newMenuItem.category}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, category: event.target.value }))}
              />
              <datalist id="menu-category-suggestions">
                {menuCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label>
              Price (₹)
              <input
                type="number"
                min="0"
                value={newMenuItem.price}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, price: event.target.value }))}
              />
            </label>

            <label>
              Badge
              <input
                type="text"
                value={newMenuItem.badge}
                onChange={(event) => setNewMenuItem((current) => ({ ...current, badge: event.target.value }))}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              rows="3"
              value={newMenuItem.description}
              onChange={(event) => setNewMenuItem((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <button type="submit" className="primary-button">Add menu item</button>
        </form>
      </div>

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Current menu items</h3>
          <span className="mini-tag">{restaurantMenu.length}</span>
        </div>

        <div className="restaurant-menu-list">
          {restaurantMenu.map((item) => (
            <div className="restaurant-menu-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category}</span>
              </div>
              <div className="restaurant-menu-meta">
                <span className="mini-tag accent-tag">{item.badge}</span>
                <strong>{currency.format(item.price)}</strong>
                <div className="row-actions">
                  <button type="button" className="small-button" onClick={() => startEditingMenuItem(item)}>Edit</button>
                  <button type="button" className="small-button accent" onClick={() => deleteMenuItem(item.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingMenuItemId && (
        <div className="modal-backdrop" onClick={() => setEditingMenuItemId(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header compact">
              <h3>Edit menu item</h3>
              <button type="button" className="small-button" onClick={() => setEditingMenuItemId(null)}>Close</button>
            </div>

            <div className="inline-editor">
              <input
                type="text"
                value={menuItemDraft.name}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Item name"
              />
              <input
                type="text"
                list="menu-category-suggestions"
                value={menuItemDraft.category}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, category: event.target.value }))}
                placeholder="Category"
              />
              <input
                type="number"
                min="0"
                value={menuItemDraft.price}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, price: event.target.value }))}
                placeholder="Price"
              />
              <input
                type="text"
                value={menuItemDraft.badge}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, badge: event.target.value }))}
                placeholder="Badge"
              />
              <textarea
                rows="3"
                value={menuItemDraft.description}
                onChange={(event) => setMenuItemDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
              />
              <button type="button" className="small-button" onClick={saveMenuItem}>Save</button>
            </div>
          </div>
        </div>
      )}

      {restaurantPageMessage && <p className="message success" style={{ marginTop: '1rem' }}>{restaurantPageMessage}</p>}
    </>
    )
  }

  const renderCategoryManager = () => {
    if (!canManageRestaurantOperations) {
      return (
        <div className="panel section-panel">
          <div className="panel-header">
            <h2>Category access</h2>
            <span className="mini-tag">Restricted</span>
          </div>
          <p className="message info">Only the manager, branch admin, restaurant owner, or super admin can manage categories.</p>
        </div>
      )
    }

    return (
      <>
      <div className="panel-header">
        <h2>Category manager</h2>
        <span className="mini-tag">Manage groups</span>
      </div>

      <div className="panel section-panel">
        <div className="panel-header compact">
          <h3>Add category</h3>
          <span className="mini-tag">Categories</span>
        </div>

        <form className="category-form" onSubmit={handleAddMenuCategory}>
          <input
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Add a new category"
          />
          <button type="submit" className="secondary-button">Add category</button>
        </form>

        <div className="category-pills">
          {menuCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={newMenuItem.category === category ? 'category-pill active' : 'category-pill'}
              onClick={() => setNewMenuItem((current) => ({ ...current, category }))}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="panel section-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header compact">
          <h3>Category list</h3>
          <span className="mini-tag">{menuCategories.length}</span>
        </div>

        <div className="restaurant-menu-list">
          {menuCategories.map((category) => (
            <div className="restaurant-menu-item" key={category}>
              <div>
                <strong>{category}</strong>
                <span>{restaurantMenu.filter((item) => item.category === category).length} items</span>
              </div>
              <div className="row-actions">
                <button type="button" className="small-button" onClick={() => startEditingCategory(category)}>Edit</button>
                <button type="button" className="small-button accent" onClick={() => deleteCategory(category)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingCategoryName && (
        <div className="modal-backdrop" onClick={() => setEditingCategoryName('')}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header compact">
              <h3>Edit category</h3>
              <button type="button" className="small-button" onClick={() => setEditingCategoryName('')}>Close</button>
            </div>

            <div className="inline-editor">
              <input
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                placeholder="Category name"
              />
              <button type="button" className="small-button" onClick={saveCategory}>Save</button>
            </div>
          </div>
        </div>
      )}

      {restaurantPageMessage && <p className="message success" style={{ marginTop: '1rem' }}>{restaurantPageMessage}</p>}
    </>
    )
  }

  const renderAdminFlow = () => {
    const platformMenu = isSuperAdmin
      ? [{ id: 'restaurants', label: 'Restaurants' }]
      : []

    const sections = {
      overview: renderAdminOverview,
      ...(isSuperAdmin ? { restaurants: renderPlatformRestaurants } : {}),
      staff: renderAdminStaff,
      tables: renderAdminTables,
      restaurant: renderRestaurantPageEditor,
      menu: renderMenuManager,
      categories: renderCategoryManager,
      orders: renderAdminOrders,
      billing: renderAdminBilling,
    }

    const CurrentSection = sections[activeAdminSection] || renderAdminOverview

    return (
      <main className="admin-shell">
        <aside className="admin-sidebar panel">
          <div className="brand-block">
            <span className="eyebrow">Control center</span>
            <h3>{isSuperAdmin ? 'Platform Admin' : 'Bluebird Admin'}</h3>
          </div>

          <nav className="sidebar-nav">
            {[...platformMenu, { id: 'overview', label: 'Overview' }, { id: 'staff', label: 'Staff' }, { id: 'tables', label: 'Tables & QR' }, { id: 'restaurant', label: 'Hotel page' }, { id: 'menu', label: 'Menu' }, { id: 'categories', label: 'Categories' }, { id: 'orders', label: 'Orders' }, { id: 'billing', label: 'Billing' }].map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeAdminSection === item.id ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setActiveAdminSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button type="button" className="secondary-button full-width" onClick={handleStaffLogout}>
              Log out
            </button>
          </div>
        </aside>

        <section className="admin-content panel">
          {staffUser && (
            <div className="panel-header compact" style={{ marginBottom: '1rem' }}>
              <strong>{staffUser.name || 'User'}</strong>
              <span className="mini-tag">{staffUser.email}</span>
            </div>
          )}
          {CurrentSection()}
        </section>
      </main>
    )
  }

  const renderGuestFlow = () => (
    <main className="layout">
      <section className="panel join-panel">
        <div className="panel-header">
          <h2>Join table</h2>
          <span className="mini-tag">Guest flow</span>
        </div>

        <form className="join-form" onSubmit={handleJoin}>
          <label>
            Table ID
            <input
              type="number"
              min="1"
              value={tableId}
              onChange={(event) => setTableId(event.target.value)}
              placeholder="1"
            />
          </label>

          <label>
            Your name *
            <input
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Enter your name"
              maxLength={120}
              autoComplete="name"
              required
            />
          </label>

          <label>
            Contact number
            <input
              type="tel"
              value={guestContactNumber}
              onChange={(event) => setGuestContactNumber(event.target.value)}
              placeholder="Enter your phone number"
              maxLength={30}
              autoComplete="tel"
            />
          </label>

          <label>
            Guest PIN
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter PIN"
              maxLength={6}
            />
          </label>

          <button type="submit" className="primary-button" disabled={isJoining}>
            {isJoining ? 'Joining...' : joined ? 'Reconnect table' : 'Join table'}
          </button>
        </form>

        {error && <p className="message error">{error}</p>}
        {confirmation && <p className="message success">{confirmation}</p>}
      </section>

      <section className="panel menu-panel">
        <div className="panel-header">
          <h2>Menu</h2>
          <span className="mini-tag">Ready in 15 min</span>
        </div>

        <div className="menu-grid">
          {guestMenuItems.map((menuItem) => (
            <article className="menu-card" key={menuItem.id}>
              <div className="menu-head">
                <span className="badge">{menuItem.badge}</span>
                <strong>{currency.format(menuItem.price)}</strong>
              </div>

              <h3>{menuItem.name}</h3>
              <p>{menuItem.description}</p>

              <button type="button" onClick={() => addItem(menuItem)}>
                Add to order
              </button>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel cart-panel">
        <div className="panel-header">
          <h2>Your order</h2>
          <span className="mini-tag">{cartItems.length} items</span>
        </div>

        {cartItems.length === 0 ? (
          <p className="empty-state">No products selected yet.</p>
        ) : (
          <div className="cart-list">
            {cartItems.map(({ menuItem, quantity }) => (
              <div className="cart-item" key={menuItem.id}>
                <div>
                  <strong>{menuItem.name}</strong>
                  <span>{currency.format(menuItem.price)} each</span>
                </div>

                <div className="quantity-control">
                  <button type="button" onClick={() => updateQuantity(menuItem.id, quantity - 1)}>
                    −
                  </button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => updateQuantity(menuItem.id, quantity + 1)}>
                    +
                  </button>
                </div>

                <button type="button" className="remove-item-button" onClick={() => removeItem(menuItem.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="summary">
          <div>
            <span>Subtotal</span>
            <strong>{currency.format(total)}</strong>
          </div>
        </div>

        <button
          type="button"
          className="primary-button full-width"
          onClick={submitOrder}
          disabled={isSubmitting || !joined}
        >
          {isSubmitting ? 'Submitting...' : 'Submit order'}
        </button>
      </aside>

      <section className="panel guest-orders-panel">
        <div className="panel-header">
          <h2>Table orders</h2>
          <span className="mini-tag">{guestOrders.length} orders</span>
        </div>

        {guestOrders.length === 0 ? (
          <p className="empty-state">No order history yet. Your latest table orders will appear here.</p>
        ) : (
          <div className="guest-order-list">
            <div className="guest-order-summary">
              <div>
                <span>All orders total</span>
                <strong>{currency.format(guestOrdersTotal)}</strong>
              </div>
              <div>
                <span>Final amount to pay</span>
                <strong>{currency.format(guestAmountDue)}</strong>
              </div>
            </div>

            {guestOrders.map((order) => (
              <article className="guest-order-card" key={order.id}>
                <div className="guest-order-top">
                  <div>
                    <strong>Order #{order.id}</strong>
                    <span>{order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                  </div>
                  <span className={`guest-status status-chip ${order.status}`}>{order.status}</span>
                </div>

                <ul className="guest-order-items">
                  {(order.items || []).map((item) => (
                    <li key={`${order.id}-${item.menu_item_id}`}>
                      <div className="guest-order-item-main">
                        <span>{item.quantity}x {item.name}</span>
                        <strong>{currency.format(item.unit_price * item.quantity)}</strong>
                      </div>

                      {order.status === 'submitted' && (
                        <div className="guest-inline-quantity-control">
                          <button type="button" onClick={() => void changeGuestOrderItemQuantity(order.id, item.menu_item_id, -1)}>
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => void changeGuestOrderItemQuantity(order.id, item.menu_item_id, 1)}>
                            +
                          </button>
                          <button type="button" className="guest-item-remove-button" onClick={() => void removeGuestOrderItem(order.id, item.menu_item_id)}>
                            Remove
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="guest-order-settlement">
                  <div>
                    <span>Order total</span>
                    <strong>{currency.format(order.total || 0)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong>{currency.format(order.paid_amount || 0)}</strong>
                  </div>
                  <div>
                    <span>Amount due</span>
                    <strong>{currency.format(order.amount_due ?? order.total ?? 0)}</strong>
                  </div>
                  <span className={`status-badge ${order.payment_status || 'unpaid'}`}>
                    {order.payment_status || 'unpaid'}
                  </span>
                </div>

                {order.status === 'submitted' && (
                  <div className="guest-order-actions">
                    <button type="button" className="secondary-button guest-cancel-button" onClick={() => void cancelGuestOrder(order.id)}>
                      Cancel order
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )

  const renderStaffFlow = () => {
    const billsForActiveOrderStatus = bills.filter((bill) =>
      orders.some((order) => Number(order.id) === Number(bill.orderId)
        && (order.status || 'submitted') === activeOrderTab),
    )
    const billGroupsForActiveOrderStatus = groupBillsByGuestDevice(billsForActiveOrderStatus)

    return (
    <main className="staff-layout">
      <section className="panel wide-panel">
        <div className="panel-header">
          <h2>Kitchen / Waiter view</h2>
          <span className="mini-tag">
            {staffUser ? `Logged in as ${staffUser.name || 'User'} (${staffUser.email})` : 'Live operations'}
          </span>
        </div>

        {!staffToken ? (
          <div className="join-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <form onSubmit={handleOwnerSignup}>
              <h3 style={{ marginBottom: '0.75rem' }}>Create hotel owner account</h3>

              <label>
                Owner name
                <input
                  type="text"
                  value={ownerName}
                  onChange={(event) => setOwnerName(event.target.value)}
                  placeholder="Hotel Owner"
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  placeholder="owner@example.com"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </label>

              <label>
                Confirm password
                <input
                  type="password"
                  value={ownerConfirmPassword}
                  onChange={(event) => setOwnerConfirmPassword(event.target.value)}
                  placeholder="Repeat password"
                />
              </label>

              <button type="submit" className="primary-button" disabled={isRegistering}>
                {isRegistering ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <form onSubmit={handleStaffLogin}>
              <h3 style={{ marginBottom: '0.75rem' }}>Login as staff</h3>

              <label>
                Staff email
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(event) => setStaffEmail(event.target.value)}
                  placeholder="manager@example.com"
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(event) => setStaffPassword(event.target.value)}
                  placeholder="Password"
                />
              </label>

              <button type="submit" className="primary-button" disabled={isLoggingIn}>
                {isLoggingIn ? 'Logging in...' : 'Login as staff'}
              </button>
            </form>

            {staffAuthError && <p className="message error" style={{ gridColumn: '1 / -1' }}>{staffAuthError}</p>}
          </div>
        ) : (
          <>
            <div className="staff-toolbar">
              <strong>{staffUser?.name || 'Staff member'}</strong>
              <button type="button" className="small-button" onClick={handleStaffLogout}>
                Logout
              </button>
            </div>

            <div className="view-switcher" style={{ marginBottom: '1rem' }}>
              {orderStatusTabs.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={activeOrderTab === status ? 'tab active' : 'tab'}
                  onClick={() => setActiveOrderTab(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            {opsLoadError && <p className="message error">{opsLoadError}</p>}

            <div className="order-board">
              {isLoadingOps && <p className="empty-state">Loading live operations...</p>}
              {!isLoadingOps && orders.filter((order) => (order.status || 'submitted') === activeOrderTab).length === 0 && (
                <p className="empty-state">No {activeOrderTab} orders yet.</p>
              )}
              {orders
                .filter((order) => (order.status || 'submitted') === activeOrderTab)
                .map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-topline">
                      <div>
                        <strong>{order.customer || `Table ${order.table}`}</strong>
                        <span>{order.time} • Table {order.table}</span>
                      {order.guestContactNumber && <span>Contact: {order.guestContactNumber}</span>}
                      </div>
                      <span className={`status-chip ${order.status}`}>{order.status}</span>
                    </div>

                    <ul>
                      {(Array.isArray(order.items) ? order.items : []).map((item) => (
                        <li key={`${order.id}-${item}`}>{item}</li>
                      ))}
                    </ul>

                    <div className="order-footer">
                      <strong>{currency.format(order.total)}</strong>
                      <div className="status-actions">
                        {statusFlow[order.status]?.map((nextStatus) => (
                          <button
                            type="button"
                            key={nextStatus}
                            className="small-button"
                            onClick={() => advanceOrderStatus(order.id, nextStatus)}
                          >
                            Mark {nextStatus}
                          </button>
                        ))}
                        {order.status === 'ready' && (
                          <button
                            type="button"
                            className="small-button accent"
                            onClick={() => createBillForOrder(order.id)}
                          >
                            Create bill
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
            </div>

            <section className="panel section-panel" style={{ marginTop: '1.5rem' }}>
              <div className="panel-header">
                <h2>Branch bills</h2>
                <span className="mini-tag">{billGroupsForActiveOrderStatus.length} devices</span>
              </div>
              {billGroupsForActiveOrderStatus.length === 0 ? (
                <p className="empty-state">No bills for {activeOrderTab} orders.</p>
              ) : (
                <div className="bill-device-list">
                  {billGroupsForActiveOrderStatus.map((group) => (
                    <article className="bill-device-group" key={group.key}>
                      <div className="bill-device-header">
                        <div>
                          <strong>{group.guestName || (group.guestSessionId ? `Guest device #${group.guestSessionId}` : 'Table guest')}</strong>
                          {group.guestContactNumber && <span>{group.guestContactNumber}</span>}
                          <span>{group.table} · {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}</span>
                        </div>
                        <div>
                          <span>Device amount due</span>
                          <strong>{currency.format(group.due)}</strong>
                        </div>
                      </div>
                      {group.bills.map((bill) => (
                        <div className="bill-device-line" key={bill.id}>
                          <span>Bill #{bill.id} · Order #{bill.orderId}</span>
                          <span>{currency.format(bill.paid)} paid of {currency.format(bill.total)}</span>
                          <span className="status-badge">{bill.status}</span>
                          {bill.status !== 'paid' && (
                            <button
                              type="button"
                              className="small-button accent"
                              onClick={() => void payBill(bill.id, bill.total - bill.paid, 'cash')}
                            >
                              Mark paid
                            </button>
                          )}
                          {canReverseBillPayment && bill.provider === 'cash' && bill.paid > 0 && (
                            <button type="button" className="small-button" onClick={() => void reverseCashBillPayment(bill)}>
                              Undo payment
                            </button>
                          )}
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
    )
  }

  const renderRestaurantPublicPage = () => (
    <main className="restaurant-public-page" style={{ '--brand-accent': restaurantProfile.accentColor }}>
      <section className="restaurant-hero panel">
        <div className="restaurant-brand">
          <img src={restaurantProfile.logoUrl} alt={restaurantProfile.name} />
          <div>
            <span className="eyebrow">Featured restaurant</span>
            <h2>{restaurantProfile.name}</h2>
            <p>{restaurantProfile.tagline}</p>
          </div>
        </div>

        <div className="restaurant-meta">
          <span>{restaurantProfile.address}</span>
          <span>{restaurantProfile.phone}</span>
        </div>
      </section>

      <section className="restaurant-content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>About us</h2>
            <span className="mini-tag">Story</span>
          </div>
          <p className="restaurant-description">{restaurantProfile.description}</p>

          <div className="live-order-box">
            <div className="panel-header compact">
              <h3>Live orders</h3>
              <span className="mini-tag">{orders.length}</span>
            </div>

            {orders.slice(0, 3).map((order) => (
              <div key={order.id} className="restaurant-live-order">
                <strong>Table {order.table}</strong>
                <span>{order.items.join(', ')}</span>
                <small>{order.status}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Our menu</h2>
            <span className="mini-tag">{restaurantMenu.length} items</span>
          </div>

          <div className="restaurant-menu-list public-menu">
            {restaurantMenu.map((item) => (
              <div className="restaurant-menu-item public-item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.description}</span>
                </div>
                <div className="restaurant-menu-meta">
                  <span className="mini-tag accent-tag">{item.badge}</span>
                  <strong>{currency.format(item.price)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )

  const renderBillingFlow = () => {
    const visibleBills = getBillsForBillingTab()
    const visibleBillGroups = groupBillsByGuestDevice(visibleBills)
    const pagination = getBillingPage(visibleBillGroups)

    return (
      <main className="billing-layout">
        <section className="panel wide-panel">
          <div className="panel-header">
            <h2>Billing and payment</h2>
            <span className="mini-tag">Settlement</span>
          </div>

          <div className="view-switcher" style={{ marginBottom: '1rem' }}>
            {['pending', 'paid', 'cancelled'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={billingTab === tab ? 'tab active' : 'tab'}
                onClick={() => { setBillingTab(tab); setBillingPage(1) }}
              >
                {tab === 'paid' ? 'Paid orders' : tab === 'cancelled' ? 'Cancelled orders' : 'Pending orders'}
              </button>
            ))}
          </div>

          <div className="billing-list">
            {isLoadingOps && <p className="empty-state">Loading billing data...</p>}
            {visibleBills.length === 0 && !isLoadingOps && (
              <p className="empty-state">No {billingTab === 'paid' ? 'paid' : billingTab === 'cancelled' ? 'cancelled' : 'pending'} bills yet.</p>
            )}
            {pagination.pageBills.map((group) => (
                <article className="bill-card bill-row bill-device-row" key={group.key}>
                  <div className="bill-topline">
                    <div>
                      <strong>{group.guestName || (group.guestSessionId ? `Guest device #${group.guestSessionId}` : 'Table guest')}</strong>
                      {group.guestContactNumber && <span>{group.guestContactNumber}</span>}
                      <span>{group.table} · {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'}</span>
                    </div>
                    <span className="status-chip">{billingTab}</span>
                  </div>

                  <div className="bill-metrics">
                    <div>
                      <label>Total</label>
                      <strong>{currency.format(group.total)}</strong>
                    </div>
                    <div>
                      <label>Paid</label>
                      <strong>{currency.format(group.paid)}</strong>
                    </div>
                    <div>
                      <label>Device amount due</label>
                      <strong>{currency.format(group.due)}</strong>
                    </div>
                  </div>

                  <div className="bill-device-invoices">
                    {group.bills.map((bill) => {
                      const remaining = Math.max(bill.total - bill.paid, 0)

                      return (
                        <div className="bill-device-line" key={bill.id}>
                          <span>{bill.isOrderOnly ? `Cancelled order #${bill.orderId}` : `Bill #${bill.id} · Order #${bill.orderId}`}</span>
                          <span>{bill.isOrderOnly ? `Order total ${currency.format(bill.total)}` : `${currency.format(bill.paid)} paid of ${currency.format(bill.total)}`}</span>
                          {billingTab === 'pending' && !bill.isOrderOnly && (
                            <div className="payment-actions">
                              <button type="button" className="small-button" onClick={() => void payBill(bill.id, remaining, 'cash', 'cash')}>
                                Pay cash
                              </button>
                              <button type="button" className="small-button" onClick={() => void payBill(bill.id, remaining, 'upi', 'mock')}>
                                Pay UPI
                              </button>
                              <button type="button" className="small-button" onClick={() => void payBill(bill.id, remaining, 'card', 'mock')}>
                                Pay card
                              </button>
                              <button type="button" className="small-button accent" onClick={() => void payBill(bill.id, remaining, 'card', 'razorpay')}>
                                Pay online
                              </button>
                            </div>
                          )}
                          {canReverseBillPayment && bill.provider === 'cash' && bill.paid > 0 && (
                            <button type="button" className="small-button" onClick={() => void reverseCashBillPayment(bill)}>
                              Undo payment
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </article>
            ))}
          </div>
          {visibleBillGroups.length > billsPerPage && renderBillingPagination({ ...pagination, total: visibleBillGroups.length })}
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Restaurant QR Ordering</p>
          <h1>Bluebird Table Service</h1>
        </div>
        <div className="header-actions">
          <div className="status-pill">{joined ? 'Session active' : 'Waiting for table join'}</div>
          <div className="view-switcher">
            <button
              type="button"
              className={view === 'home' ? 'tab active' : 'tab'}
              onClick={() => setView('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={view === 'contact' ? 'tab active' : 'tab'}
              onClick={() => setView('contact')}
            >
              Contact us
            </button>
            <button
              type="button"
              className={view === 'guest' ? 'tab active' : 'tab'}
              onClick={() => setView('guest')}
            >
              Guest flow
            </button>
            <button
              type="button"
              className={view === 'restaurant' ? 'tab active' : 'tab'}
              onClick={() => setView('restaurant')}
            >
              Hotel page
            </button>
            <button
              type="button"
              className={view === 'staff' ? 'tab active' : 'tab'}
              onClick={() => setView('staff')}
            >
              Staff KDS
            </button>
            <button
              type="button"
              className={view === 'billing' ? 'tab active' : 'tab'}
              onClick={() => setView('billing')}
            >
              Billing
            </button>
            <button
              type="button"
              className={view === 'admin' ? 'tab active' : 'tab'}
              onClick={() => setView('admin')}
            >
              Admin
            </button>
          </div>
        </div>
      </header>

      {(() => {
        if (view === 'admin' && !staffToken) {
          return renderStaffFlow()
        }

        if (view === 'home') return renderLandingPage()
        if (view === 'contact') return renderContactPage()
        if (view === 'guest') return renderGuestFlow()
        if (view === 'restaurant') return renderRestaurantPublicPage()
        if (view === 'staff') return renderStaffFlow()
        if (view === 'billing') return renderBillingFlow()
        return renderAdminFlow()
      })()}

      {editingStaffId !== null && typeof document !== 'undefined' && createPortal((
        <div className="modal-backdrop" onClick={() => setEditingStaffId(null)}>
          <section
            className="modal-card staff-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-staff-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header compact">
              <div>
                <h2 id="edit-staff-title">Edit employee</h2>
                <p>Update this employee’s account and restaurant access.</p>
              </div>
              <button type="button" className="small-button" onClick={() => setEditingStaffId(null)}>Close</button>
            </div>

            <form className="staff-edit-form" onSubmit={(event) => { event.preventDefault(); void saveStaffMember() }}>
              <label>
                Full name
                <input
                  type="text"
                  value={staffDraft.name}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))}
                  autoFocus
                  required
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  value={staffDraft.email}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Role
                <select value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
                  {!['Waiter', 'Chef', 'Manager', 'Branch Admin'].includes(staffDraft.role) && <option value={staffDraft.role}>{staffDraft.role}</option>}
                  <option value="Waiter">Waiter</option>
                  <option value="Chef">Chef</option>
                  <option value="Manager">Manager</option>
                  <option value="Branch Admin">Branch Admin</option>
                </select>
              </label>
              <label>
                Branch access
                <select value={staffDraft.branchId} onChange={(event) => setStaffDraft((current) => ({ ...current, branchId: event.target.value }))}>
                  <option value="">All branches</option>
                  {availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label>
                Account status
                <select value={staffDraft.status} onChange={(event) => setStaffDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                New password <span className="form-hint">Leave blank to keep the current password</span>
                <input
                  type="password"
                  value={staffDraft.password}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, password: event.target.value }))}
                  minLength="8"
                  autoComplete="new-password"
                />
              </label>
              {staffEditError && <p className="message error staff-edit-error">{staffEditError}</p>}
              <div className="staff-edit-actions">
                <button type="button" className="small-button secondary-button" onClick={() => setEditingStaffId(null)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSavingStaff}>
                  {isSavingStaff ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ), document.body)}
    </div>
  )
}

export default App
