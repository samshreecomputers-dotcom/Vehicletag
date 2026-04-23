import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

const styles = `
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .tfa-root { min-height: 100vh; background: #030712; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; color: #f9fafb; }
  .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; }
  .card { position: relative; z-index: 1; background: #0f172a; border: 1px solid rgba(245,158,11,0.15); border-radius: 24px; padding: 40px; width: 100%; max-width: 400px; margin: 20px; animation: fadeUp 0.6s ease; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
  .icon { width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(245,158,11,0.3); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 30px rgba(245,158,11,0.3); } 50% { box-shadow: 0 0 50px rgba(245,158,11,0.6); } }
  h2 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  h2 span { color: #f59e0b; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
  .label { font-size: 12px; color: #6b7280; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .otp-input { width: 100%; background: #1f2937; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; color: #f9fafb; font-size: 28px; font-family: 'JetBrains Mono', monospace; text-align: center; letter-spacing: 10px; outline: none; transition: border-color 0.2s; margin-bottom: 16px; }
  .otp-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
  .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 700; font-size: 15px; border: none; border-radius: 12px; cursor: pointer; font-family: 'Syne', sans-serif; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
`;

export default function TwoFactorValidate() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/admin';

  const validate = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/2fa/validate', { token });
      sessionStorage.setItem('2fa_verified', 'true');
      navigate(from);
    } catch {
      setError('Invalid code. Try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="tfa-root">
        <div className="grid-bg" />
        <div className="card">
          <div className="icon">🔑</div>
          <h2>Admin <span>Verify</span></h2>
          <p className="sub">Enter the 6-digit code from Google Authenticator to continue.</p>
          {error && <div className="error">{error}</div>}
          <p className="label">Authentication Code</p>
          <input className="otp-input" type="number" placeholder="000000" maxLength={6}
            value={token} onChange={e => setToken(e.target.value.slice(0,6))}
            onKeyDown={e => e.key === 'Enter' && validate()} />
          <button className="btn" onClick={validate} disabled={loading || token.length !== 6}>
            {loading ? 'Verifying...' : 'Verify & Enter →'}
          </button>
        </div>
      </div>
    </>
  );
}
