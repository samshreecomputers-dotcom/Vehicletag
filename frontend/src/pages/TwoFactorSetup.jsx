import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .tfa-root { min-height: 100vh; background: #030712; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; color: #f9fafb; }
  .grid-bg { position: fixed; inset: 0; background-image: linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none; }
  .card { position: relative; z-index: 1; background: #0f172a; border: 1px solid rgba(245,158,11,0.15); border-radius: 24px; padding: 40px; width: 100%; max-width: 440px; margin: 20px; animation: fadeUp 0.6s ease; }
  @keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
  .icon { width: 56px; height: 56px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(245,158,11,0.3); }
  h2 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
  h2 span { color: #f59e0b; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 28px; line-height: 1.6; }
  .qr-wrap { background: white; border-radius: 16px; padding: 16px; display: flex; justify-content: center; margin-bottom: 20px; }
  .qr-wrap img { width: 180px; height: 180px; }
  .secret-box { background: #1f2937; border: 1px solid rgba(245,158,11,0.1); border-radius: 10px; padding: 12px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #f59e0b; text-align: center; margin-bottom: 24px; word-break: break-all; }
  .label { font-size: 12px; color: #6b7280; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .otp-input { width: 100%; background: #1f2937; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 16px; color: #f9fafb; font-size: 22px; font-family: 'JetBrains Mono', monospace; text-align: center; letter-spacing: 8px; outline: none; transition: border-color 0.2s; margin-bottom: 16px; }
  .otp-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
  .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 700; font-size: 15px; border: none; border-radius: 12px; cursor: pointer; font-family: 'Syne', sans-serif; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
  .success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #6ee7b7; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
  .steps { display: flex; gap: 8px; margin-bottom: 24px; }
  .step { flex: 1; height: 3px; border-radius: 999px; background: #1f2937; transition: background 0.3s; }
  .step.active { background: #f59e0b; }
`;

export default function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.post('/auth/2fa/setup').then(r => {
      setQrCode(r.data.qrCode);
      setSecret(r.data.secret);
    });
  }, []);

  const verify = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/2fa/verify', { token });
      setSuccess('2FA enabled successfully! Redirecting...');
      setStep(3);
      setTimeout(() => navigate('/admin'), 2000);
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
          <div className="icon">🔐</div>
          <h2>Two-Factor <span>Auth</span></h2>
          <p className="sub">Secure your admin account with Google Authenticator for an extra layer of protection.</p>

          <div className="steps">
            {[1,2,3].map(s => <div key={s} className={`step ${step >= s ? 'active' : ''}`} />)}
          </div>

          {step === 1 && (
            <>
              <p className="label">Step 1 — Scan QR Code</p>
              {qrCode ? <div className="qr-wrap"><img src={qrCode} alt="QR" /></div> : <div style={{textAlign:'center',padding:'40px',color:'#6b7280'}}>Loading...</div>}
              <p className="label">Or enter manually</p>
              <div className="secret-box">{secret}</div>
              <button className="btn" onClick={() => setStep(2)}>Next →</button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="label">Step 2 — Enter 6-digit code</p>
              {error && <div className="error">{error}</div>}
              <input className="otp-input" type="number" placeholder="000000" maxLength={6}
                value={token} onChange={e => setToken(e.target.value.slice(0,6))} />
              <button className="btn" onClick={verify} disabled={loading || token.length !== 6}>
                {loading ? 'Verifying...' : 'Enable 2FA ✓'}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="success">✅ {success}</div>
          )}
        </div>
      </div>
    </>
  );
}
