import { useState, useEffect } from 'react';
import api from '../api';

export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(r => setData(r.data))
      .catch(e => setError(JSON.stringify(e.response?.data || e.message)));
  }, []);

  if (error) return (
    <div style={{padding:40,color:'#fff',background:'#000',minHeight:'100vh'}}>
      <h2 style={{color:'red'}}>Admin Error</h2>
      <pre style={{color:'#ff9',marginTop:16,fontSize:12,whiteSpace:'pre-wrap'}}>{error}</pre>
    </div>
  );

  if (!data) return (
    <div style={{padding:40,color:'#fff',background:'#000',minHeight:'100vh'}}>
      <p>Loading admin...</p>
    </div>
  );

  return (
    <div style={{padding:40,color:'#fff',background:'#000',minHeight:'100vh'}}>
      <h1 style={{color:'#f59e0b'}}>Admin Panel</h1>
      <p>Users: {data.users}</p>
      <p>Vehicles: {data.vehicles}</p>
      <p>Logs: {data.logs}</p>
    </div>
  );
}
