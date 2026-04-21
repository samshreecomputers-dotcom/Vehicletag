import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import styles from './Dashboard.module.css';

const VehicleTypeIcon = ({ type }) => {
  const icons = { car: '🚗', bike: '🏍️', truck: '🚚', auto: '🛺', other: '🚙' };
  return icons[type] || '🚗';
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({ vehicleCount: 0, totalContacts: 0, totalEmergencies: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ vehicle_number: '', vehicle_type: 'car' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vRes, sRes] = await Promise.all([api.get('/vehicles'), api.get('/dashboard/stats')]);
      setVehicles(vRes.data);
      setStats(sRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async e => {
    e.preventDefault();
    setAddError(''); setAdding(true);
    try {
      const { data } = await api.post('/vehicles', newVehicle);
      setVehicles(v => [...v, data]);
      setStats(s => ({ ...s, vehicleCount: s.vehicleCount + 1 }));
      setShowAddModal(false);
      setNewVehicle({ vehicle_number: '', vehicle_type: 'car' });
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add vehicle');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle and its QR tag?')) return;
    await api.delete(`/vehicles/${id}`);
    setVehicles(v => v.filter(x => x.id !== id));
    setStats(s => ({ ...s, vehicleCount: s.vehicleCount - 1 }));
  };

  const handleLogout = () => { logout(); navigate('/'); };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40, color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>◈ VehicleTag</div>
        <nav className={styles.sidebarNav}>
          <div className={styles.navItem + ' ' + styles.active}>🚗 My Vehicles</div>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userEmail}>{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>My Vehicles</h1>
            <p className={styles.pageSub}>Manage your vehicle QR tags</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Vehicle</button>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className="card">
            <div className={styles.statLabel}>Total Vehicles</div>
            <div className={styles.statValue}>{stats.vehicleCount}</div>
          </div>
          <div className="card">
            <div className={styles.statLabel}>Total Contacts</div>
            <div className={styles.statValue}>{stats.totalContacts}</div>
          </div>
          <div className="card">
            <div className={styles.statLabel}>Emergencies</div>
            <div className={styles.statValue} style={{ color: stats.totalEmergencies > 0 ? 'var(--red)' : 'inherit' }}>
              {stats.totalEmergencies}
            </div>
          </div>
        </div>

        {/* Vehicles */}
        {vehicles.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🚗</div>
            <h2>No vehicles yet</h2>
            <p>Add your first vehicle to get a QR tag</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Vehicle</button>
          </div>
        ) : (
          <div className={styles.vehiclesGrid}>
            {vehicles.map(v => (
              <div key={v.id} className={styles.vehicleCard + ' fade-in'}>
                <div className={styles.vehicleHeader}>
                  <div className={styles.vehicleType}><VehicleTypeIcon type={v.vehicle_type} /></div>
                  <span className="badge badge-green">Active</span>
                </div>
                <div className={styles.vehicleNumber}>{v.vehicle_number}</div>
                <div className={styles.vehicleTag}>TAG: {v.tag_id}</div>
                <div className={styles.vehicleMeta}>
                  <span>📞 {v.contact_count || 0} contacts</span>
                  <span>🚨 {v.emergency_count || 0} emergency contacts</span>
                </div>
                <div className={styles.vehicleActions}>
                  <Link to={`/vehicle/${v.id}`} className="btn btn-secondary btn-sm">Manage →</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className={styles.modal + ' fade-in'}>
            <div className={styles.modalHeader}>
              <h2>Add Vehicle</h2>
              <button className={styles.modalClose} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            {addError && <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)', color: '#ff8888', padding: '12px', borderRadius: 10, marginBottom: 16, fontSize: '0.9rem' }}>{addError}</div>}
            <form onSubmit={handleAddVehicle}>
              <div className="form-group">
                <label className="label">Vehicle Number</label>
                <input className="input" placeholder="MH05BF3491"
                  value={newVehicle.vehicle_number}
                  onChange={e => setNewVehicle(f => ({ ...f, vehicle_number: e.target.value.toUpperCase() }))}
                  required />
              </div>
              <div className="form-group">
                <label className="label">Vehicle Type</label>
                <select className="input" value={newVehicle.vehicle_type}
                  onChange={e => setNewVehicle(f => ({ ...f, vehicle_type: e.target.value }))}>
                  <option value="car">🚗 Car</option>
                  <option value="bike">🏍️ Bike</option>
                  <option value="truck">🚚 Truck</option>
                  <option value="auto">🛺 Auto</option>
                  <option value="other">🚙 Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={adding}>
                  {adding ? <span className="spinner" /> : 'Add & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
