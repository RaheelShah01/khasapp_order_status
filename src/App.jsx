import { useState, useEffect, useCallback } from 'react'
import {
  Package,
  Clock,
  MapPin,
  Truck,
  Navigation,
  AlertCircle,
  Filter,
  ShoppingCart,
  CalendarCheck,
  CheckCircle,
  XCircle,
  User,
  ShoppingBag,
  CircleDollarSign,
  Menu
} from 'lucide-react'
import { subDays, startOfDay, format } from 'date-fns'
import './App.css'
import logo from './assets/app_logo.jpg'

const TABS = [
  { id: 'created', label: 'New', status: ['pending', 'on-hold'], icon: ShoppingBag },
  { id: 'processed', label: 'Processed', status: ['processing'], icon: ShoppingCart },
  { id: 'dispersed', label: 'Dispersed', status: ['dispatched'], icon: Truck },
  { id: 'completed', label: 'Completed', status: ['completed'], icon: CheckCircle },
  { id: 'canceled', label: 'Canceled', status: ['cancelled'], icon: XCircle },
]

const DATE_FILTERS = [
  { id: 'daily', label: 'Daily', days: 0 },
  { id: '3day', label: '3 Days', days: 3 },
  { id: 'weekly', label: 'Weekly', days: 7 },
  { id: 'monthly', label: 'Monthly', days: 30 },
]

const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN
const API_URL = import.meta.env.VITE_API_URL

function App() {
  const [activeTab, setActiveTab] = useState('created')
  const [dateFilter, setDateFilter] = useState('daily')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [areaNames, setAreaNames] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filter = DATE_FILTERS.find(f => f.id === dateFilter)
      const afterDate = format(startOfDay(subDays(new Date(), filter.days)), "yyyy-MM-dd'T'HH:mm:ss")

      const response = await fetch(`${API_URL}?after=${afterDate}&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const resolveAreaName = async (orderId, coords) => {
    if (areaNames[orderId] || !coords || coords === 'N/A') return

    try {
      const [lat, lon] = coords.split(',').map(c => c.trim())
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
      const data = await response.json()
      const area = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || 'Get Directions'
      setAreaNames(prev => ({ ...prev, [orderId]: area }))
    } catch (err) {
      console.error('Geocoding error:', err)
    }
  }

  useEffect(() => {
    orders.forEach(order => {
      const coords = order.meta_data?.find(m => m.key === 'map_coordinates')?.value
      if (coords) {
        setTimeout(() => resolveAreaName(order.id, coords), 1000)
      }
    })
  }, [orders])

  const getMetadataValue = (order, key) => {
    const item = order.meta_data?.find(m => m.key === key)
    return item ? item.value : 'N/A'
  }

  const getTimePeriod = (date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 16) return 'Morning';
    if (hour >= 16 && hour < 20) return 'Evening';
    return 'Night';
  }

  const handleGetDirections = (order) => {
    const deliveryCoords = getMetadataValue(order, 'map_coordinates')
    if (deliveryCoords === 'N/A') return
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${deliveryCoords}`, '_blank')
  }

  const filteredOrders = orders.filter(order => {
    const currentTab = TABS.find(t => t.id === activeTab)
    return currentTab.status.includes(order.status)
  })

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="brand-section">
            <Menu className="mobile-menu-icon" size={24} style={{ marginRight: '1rem', color: 'white', display: 'none' }} />
            <img src={logo} alt="KhasApp Logo" className="app-logo" />
            <h1>{window.innerWidth <= 640 ? 'Active Orders' : 'KhasApp'}</h1>
          </div>

          <div className="header-info">
            <div className="filter-container">
              <button
                className={`filter-trigger-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} />
              </button>

              {showFilters && (
                <div className="filter-dropdown">
                  {DATE_FILTERS.map(f => (
                    <button
                      key={f.id}
                      className={`filter-option ${dateFilter === f.id ? 'selected' : ''}`}
                      onClick={() => {
                        setDateFilter(f.id);
                        setShowFilters(false);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="badge">
              <Clock size={12} /> {filteredOrders.length} Orders
            </span>
          </div>
        </div>
      </header>

      <nav className="tabs-nav">
        <h2 className="order-tracker-title">Order Tracker</h2>
        <div className="tabs-options">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = orders.filter(o => tab.status.includes(o.status)).length;

            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
              >
                <div className="tab-icon-wrapper">
                  {window.innerWidth <= 640 ? <Icon size={24} /> : tab.label}
                  {window.innerWidth <= 640 && count > 0 && (
                    <span className="tab-badge">{count}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="orders-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Scanning Orders for {dateFilter === 'daily' ? 'today' : dateFilter === '3day' ? 'last 3 days' : dateFilter === 'weekly' ? 'last week' : 'last month'}...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <AlertCircle size={48} color="#990099" />
            <p>{error}</p>
            <button className="direction-btn" onClick={fetchOrders}>Retry</button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <img src={logo} alt="Empty" className="empty-logo" />
            <p>No orders found for this period</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              className="order-card"
              onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
            >
              <div className="card-header">
                <div className="order-id">
                  {window.innerWidth <= 640 ? (
                    <span className="value">#{order.number}</span>
                  ) : (
                    <>
                      <span className="label">Order Number</span>
                      <span className="value">#{order.number}</span>
                    </>
                  )}
                </div>
                <div className="order-time">
                  <span>
                    {(() => {
                      const d = new Date(order.date_created);
                      d.setHours(d.getHours() + 1);
                      const timeStr = format(d, 'hh:mm a');
                      const period = getTimePeriod(d);
                      return window.innerWidth <= 640
                        ? `${timeStr} ${period}`
                        : timeStr;
                    })()}
                  </span>
                  {window.innerWidth > 640 && (
                    <span style={{ fontSize: '0.65rem' }}>
                      {(() => {
                        const d = new Date(order.date_created);
                        d.setHours(d.getHours() + 1);
                        return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
                      })()}
                    </span>
                  )}
                </div>
                {window.innerWidth <= 640 && <ShoppingCart size={20} />}
              </div>

              <div className="card-body-flex">
                <div className="main-column">
                  <div className="info-item">
                    <div className="label">Delivery Time :</div>
                    <div className="value">
                      {(() => {
                        const d = new Date(order.date_created);
                        d.setHours(d.getHours() + 2); // 1 hour ahead of order time (+2 from server)
                        return `${format(d, 'hh:mm a')} ${getTimePeriod(d)}`;
                      })()}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="label">Distance :</div>
                    <div className="value">{getMetadataValue(order, 'customer_store_distance')} KM</div>
                  </div>
                  <div className="info-item">
                    <div className="label">Rider Name :</div>
                    <div className="value">{order.rider_name || 'Not Assigned'}</div>
                  </div>
                  <div className="info-item">
                    <div className="label">Payment Mode :</div>
                    <div className="value">{order.payment_method_title}</div>
                  </div>
                </div>

                <div className="side-column">
                  <div className="side-item">
                    <User size={18} />
                    <div className="value">{order.customer_id}</div>
                  </div>
                  <div className="side-item">
                    <ShoppingBag size={18} />
                    <div className="value">{order.line_items.length}</div>
                  </div>
                  <div className="side-item">
                    <div className="rs-badge">Rs.</div>
                    <div className="value">{order.total}</div>
                  </div>
                </div>
              </div>

              {window.innerWidth > 640 && (
                <div className="location-bar">
                  <MapPin size={14} />
                  <span>{areaNames[order.id] || 'Locating...'}</span>
                </div>
              )}

              {selectedOrder === order.id && (
                <div className="order-details">
                  <h4>Product Breakdown</h4>
                  <ul>
                    {order.line_items.map(item => (
                      <li key={item.id}>
                        <span>{item.name} x {item.quantity}</span>
                        <span style={{ fontWeight: 800 }}>{order.currency} {item.total}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card-footer-actions">
                <button
                  className="direction-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetDirections(order);
                  }}
                >
                  <Navigation size={16} />
                  {window.innerWidth <= 640
                    ? (areaNames[order.id] || 'Map View')
                    : 'Get Directions'}
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

export default App
