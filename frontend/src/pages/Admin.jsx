import { useState, useEffect } from 'react';
import api from '../api';

export default function Admin() {
  const [stats, setStats] = useState({ users: 0, vehicles: 0, logs: 0 });
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab] = useState('users');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setStats(r.data))
      .catch(e => setError('Access denied: ' + (e.response?.data?.error || e.message)));
    api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    api.get('/admin/vehicles').then(r => setVehicles(r.data)).catch(() => {});
  }, []);

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/admin/users/${id}`);
    setUsers(users.filter(u => u.id !== id));
  };

  if (error) return <div style={{color:'red',padding:20}}>Error: {error}</div>;

  return (
    <div style={{padding:20,maxWidth:900,margin:'0 auto',color:'#fff',background:'#030712',minHeight:'100vh',fontFamily:'sans-serif'}}>
      <h1 style={{color:'#f59e0b',marginBottom:24}}>⚙️ Admin Panel</h1>

      <div style={{display:'flex',gap:12,marginBottom:24}}>
        {[['Users',stats.users,'👥'],['Vehicles',stats.vehicles,'🚗'],['Logs',stats.logs,'📋']].map(([l,v,i]) => (
          <div key={l} style={{flex:1,background:'#1f2937',padding:16,borderRadius:12,textAlign:'center'}}>
            <div style={{fontSize:32,fontWeight:800,color:'#f59e0b'}}>{v ?? 0}</div>
            <div style={{color:'#9ca3af',fontSize:13}}>{i} {l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {['users','vehicles'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',background:tab===t?'#f59e0b':'#374151',color:tab===t?'#000':'#fff',fontWeight:600}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{background:'#0f172a',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#1f2937'}}>
              {tab==='users'
                ? ['Name','Email','Phone','Joined','Action'].map(h => <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#f59e0b',fontSize:12}}>{h}</th>)
                : ['Vehicle','Owner','Tag ID','Status'].map(h => <th key={h} style={{padding:'10px 14px',textAlign:'left',color:'#f59e0b',fontSize:12}}>{h}</th>)
              }
            </tr>
          </thead>
          <tbody>
            {tab==='users' && users.map(u => (
              <tr key={u.id} style={{borderBottom:'1px solid #1f2937'}}>
                <td style={{padding:'10px 14px'}}>{u.name}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{u.email}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{u.phone}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{padding:'10px 14px'}}>
                  {u.id==='01'
                    ? <span style={{background:'#065f46',color:'#6ee7b7',padding:'2px 8px',borderRadius:999,fontSize:12}}>Admin</span>
                    : <button onClick={() => deleteUser(u.id)} style={{background:'#ef4444',color:'#fff',border:'none',padding:'4px 12px',borderRadius:6,cursor:'pointer',fontSize:12}}>Delete</button>
                  }
                </td>
              </tr>
            ))}
            {tab==='vehicles' && vehicles.map(v => (
              <tr key={v.id} style={{borderBottom:'1px solid #1f2937'}}>
                <td style={{padding:'10px 14px',fontWeight:600}}>{v.vehicle_number}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af'}}>{v.owner_name}</td>
                <td style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>{v.tag_id}</td>
                <td style={{padding:'10px 14px'}}>
                  <span style={{background:v.is_active?'#065f46':'#7f1d1d',color:v.is_active?'#6ee7b7':'#fca5a5',padding:'2px 8px',borderRadius:999,fontSize:12}}>
                    {v.is_active?'Active':'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
