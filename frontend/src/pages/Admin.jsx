import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .admin-root {
    min-height: 100vh;
    background: #030712;
    color: #f9fafb;
    font-family: 'Syne', sans-serif;
    overflow-x: hidden;
  }

  .grid-bg {
    position: fixed; inset: 0; z-index: 0;
    background-image: 
      linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .glow {
    position: fixed; top: -200px; left: 50%;
    transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
    animation: pulseGlow 4s ease-in-out infinite;
  }

  @keyframes pulseGlow {
    0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
    50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
  }

  .content { position: relative; z-index: 1; padding: 40px 24px; max-width: 1100px; margin: 0 auto; }

  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 40px; animation: slideDown 0.6s ease; }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .header-icon {
    width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706);
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    font-size: 22px; box-shadow: 0 0 24px rgba(245,158,11,0.4);
  }

  .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .header h1 span { color: #f59e0b; }
  .header p { color: #6b7280; font-size: 13px; font-family: 'JetBrains Mono', monospace; }

  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }

  .stat-card {
    background: linear-gradient(135deg, #111827, #1f2937);
    border: 1px solid rgba(245,158,11,0.1);
    border-radius: 16px; padding: 24px;
    position: relative; overflow: hidden;
    animation: fadeUp 0.6s ease both;
    transition: transform 0.2s, border-color 0.2s;
  }

  .stat-card:hover { transform: translateY(-4px); border-color: rgba(245,158,11,0.3); }

  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #f59e0b, transparent);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stat-card:nth-child(1) { animation-delay: 0.1s; }
  .stat-card:nth-child(2) { animation-delay: 0.2s; }
  .stat-card:nth-child(3) { animation-delay: 0.3s; }

  .stat-label { font-size: 12px; color: #6b7280; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .stat-value { font-size: 40px; font-weight: 800; color: #f59e0b; line-height: 1; }
  .stat-icon { position: absolute; right: 20px; top: 20px; font-size: 28px; opacity: 0.2; }

  .tabs { display: flex; gap: 8px; margin-bottom: 20px; }

  .tab-btn {
    padding: 10px 24px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
    background: transparent; color: #6b7280; cursor: pointer;
    font-family: 'Syne', sans-serif; font-weight: 600; font-size: 14px;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: #f59e0b; color: #000; border-color: #f59e0b;
    box-shadow: 0 0 20px rgba(245,158,11,0.3);
  }

  .tab-btn:hover:not(.active) { border-color: rgba(245,158,11,0.3); color: #f9fafb; }

  .table-wrap {
    background: #0f172a; border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px; overflow: hidden;
    animation: fadeUp 0.4s ease;
  }

  table { width: 100%; border-collapse: collapse; }

  thead tr { background: rgba(245,158,11,0.05); border-bottom: 1px solid rgba(245,158,11,0.1); }

  th { padding: 14px 16px; text-align: left; font-size: 11px; color: #f59e0b;
    font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; }

  td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }

  tr:last-child td { border-bottom: none; }

  tbody tr { transition: background 0.15s; }
  tbody tr:hover { background: rgba(245,158,11,0.03); }

  .badge {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace;
  }

  .badge-active { background: rgba(16,185,129,0.15); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2); }
  .badge-inactive { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }

  .btn-delete {
    background: rgba(239,68,68,0.1); color: #f87171;
    border: 1px solid rgba(239,68,68,0.2); padding: 5px 14px;
    border-radius: 8px; cursor: pointer; font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    transition: all 0.2s;
  }

  .btn-delete:hover { background: rgba(239,68,68,0.25); border-color: rgba(239,68,68,0.4); }

  .mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #9ca3af; }
  .empty { text-align: center; padding: 40px; color: #4b5563; font-family: 'JetBrains Mono', monospace; }

  .counter {
    display: inline-block;
    animation: countUp 1s ease both;
  }

  @keyframes countUp {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
`;

export default function Admin() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/vehicles'),
    ]).then(([s, u, v]) => {
      setStats(s.data);
      setUsers(u.data);
      setVehicles(v.data);
      setLoading(false);
    }).catch((e) => console.error('Admin error:', e));
  }, []);

  const deleteUser = async (id) => {
    if (!confirm('Delete this user and all their data?')) return;
    await api.delete(`/admin/users/${id}`);
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <>
      <style>{styles}</style>
      <div className="admin-root">
        <div className="grid-bg" />
        <div className="glow" />
        <div className="content">
          <div className="header">
            <div className="header-icon">⚙️</div>
            <div>
              <h1>Admin <span>Panel</span></h1>
              <p>// vehicletag.shreecomp.in/admin</p>
            </div>
          </div>

          <div className="stats-grid">
            {[
              { label: 'Total Users', value: stats.users, icon: '👥' },
              { label: 'Total Vehicles', value: stats.vehicles, icon: '🚗' },
              { label: 'Contact Logs', value: stats.logs, icon: '📋' },
            ].map(({ label, value, icon }) => (
              <div className="stat-card" key={label}>
                <div className="stat-label">{label}</div>
                <div className="stat-value">
                  <span className="counter">{loading ? '...' : (value ?? 0)}</span>
                </div>
                <div className="stat-icon">{icon}</div>
              </div>
            ))}
          </div>

          <div className="tabs">
            <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 Users</button>
            <button className={`tab-btn ${tab === 'vehicles' ? 'active' : ''}`} onClick={() => setTab('vehicles')}>🚗 Vehicles</button>
          </div>

          <div className="table-wrap">
            {tab === 'users' && (
              <table>
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="5" className="empty">No users found</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id}>
                      <td style={{fontWeight:600}}>{u.name}</td>
                      <td className="mono">{u.email}</td>
                      <td className="mono">{u.phone}</td>
                      <td className="mono">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        {u.id !== '01'
                          ? <button className="btn-delete" onClick={() => deleteUser(u.id)}>Delete</button>
                          : <span className="badge badge-active">Admin</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'vehicles' && (
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th><th>Owner</th><th>Tag ID</th><th>Type</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.length === 0 ? (
                    <tr><td colSpan="5" className="empty">No vehicles found</td></tr>
                  ) : vehicles.map(v => (
                    <tr key={v.id}>
                      <td style={{fontWeight:600}}>{v.vehicle_number}</td>
                      <td>{v.owner_name}<br/><span className="mono">{v.owner_email}</span></td>
                      <td className="mono">{v.tag_id}</td>
                      <td className="mono">{v.vehicle_type}</td>
                      <td>
                        <span className={`badge ${v.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
