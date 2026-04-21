import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import styles from './ContactPage.module.css';

const STATES = { loading: 'loading', ready: 'ready', error: 'error', message: 'message', emergency: 'emergency', sent: 'sent' };

export default function ContactPage() {
  const { tagId } = useParams();
  const [state, setState] = useState(STATES.loading);
  const [vehicle, setVehicle] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [message, setMessage] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`/api/public/tag/${tagId}`)
      .then(r => { setVehicle(r.data); setState(STATES.ready); })
      .catch(err => {
        setErrorMsg(err.response?.data?.error || 'Tag not found');
        setState(STATES.error);
      });
  }, [tagId]);

  const handleWhatsApp = async () => {
    setSending(true);
    try {
      const { data } = await axios.post(`/api/public/contact/${tagId}`, {
        message,
        contact_type: 'whatsapp',
        caller_phone: callerPhone
      });
      window.open(data.whatsapp_url, '_blank');
      setState(STATES.sent);
    } finally {
      setSending(false);
    }
  };

  const handleCall = async () => {
    setSending(true);
    try {
      const { data } = await axios.post(`/api/public/contact/${tagId}`, {
        contact_type: 'call',
        caller_phone: callerPhone
      });
      // For masked call, redirect to call URL or show instructions
      // This would integrate with Twilio in production
      window.open(data.whatsapp_url, '_blank'); // Fallback to WhatsApp
      setState(STATES.sent);
    } finally {
      setSending(false);
    }
  };

  const handleEmergency = async () => {
    if (!confirm('This will alert all emergency contacts of the vehicle owner. Are you sure?')) return;
    setSending(true);
    try {
      const { data } = await axios.post(`/api/public/emergency/${tagId}`);
      setEmergencyContacts(data.contacts);
      setState(STATES.emergency);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      <div className={styles.card + ' fade-in'}>
        <div className={styles.appName}>◈ VehicleTag</div>

        {state === STATES.loading && (
          <div className={styles.center}>
            <div className="spinner" style={{ width: 32, height: 32, color: 'var(--accent)' }} />
            <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>Loading vehicle info…</p>
          </div>
        )}

        {state === STATES.error && (
          <div className={styles.center}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>Tag Not Found</h2>
            <p>{errorMsg}</p>
          </div>
        )}

        {(state === STATES.ready || state === STATES.message) && vehicle && (
          <>
            <div className={styles.vehicleInfo}>
              <div className={styles.contactLabel}>Contact vehicle owner</div>
              <div className={styles.plateNumber}>{vehicle.vehicle_number}</div>
              <div className={styles.ownerName}>Owner: {vehicle.owner_name}</div>
            </div>

            {state === STATES.ready && (
              <>
                <div className={styles.notice}>🔒 Your call will be masked. The owner won't see your number.</div>

                <div className={styles.mainActions}>
                  <button className={styles.actionBtn + ' ' + styles.callBtn}
                    onClick={() => { setState(STATES.message); }}>
                    <span className={styles.actionIcon}>📞</span>
                    <span className={styles.actionLabel}>Masked Call</span>
                    <span className={styles.actionSub}>Anonymous call</span>
                  </button>
                  <button className={styles.actionBtn + ' ' + styles.waBtn}
                    onClick={() => setState(STATES.message)}>
                    <span className={styles.actionIcon}>💬</span>
                    <span className={styles.actionLabel}>WhatsApp</span>
                    <span className={styles.actionSub}>Send message</span>
                  </button>
                </div>

                <div className={styles.emergency}>
                  <p>Vehicle involved in an accident or emergency?</p>
                  <button className="btn btn-danger btn-block" onClick={handleEmergency} disabled={sending} style={{ marginTop: 12 }}>
                    {sending ? <span className="spinner" /> : '🚨 Alert Emergency Contacts'}
                  </button>
                </div>

                <div className={styles.footer}>
                  <p>Powered by <strong>VehicleTag</strong></p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    You have 90 seconds to explain the issue. Spam may get you blocked.
                  </p>
                </div>
              </>
            )}

            {state === STATES.message && (
              <div className={'fade-in'}>
                <div className={styles.contactForm}>
                  <h3>Send a message</h3>
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="label">Your phone (optional)</label>
                    <input className="input" placeholder="+919876543210" value={callerPhone}
                      onChange={e => setCallerPhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="label">Message</label>
                    <textarea className="input" rows={3}
                      placeholder="Your vehicle is blocking my driveway..."
                      value={message} onChange={e => setMessage(e.target.value)}
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setState(STATES.ready)}>← Back</button>
                    <button className={styles.waFullBtn} onClick={handleWhatsApp} disabled={sending}>
                      {sending ? <span className="spinner" /> : '💬 Send via WhatsApp'}
                    </button>
                    <button className={styles.callFullBtn} onClick={handleCall} disabled={sending}>
                      {sending ? <span className="spinner" /> : '📞 Call Now'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {state === STATES.sent && (
          <div className={styles.center + ' fade-in'}>
            <div className={styles.successIcon}>✅</div>
            <h2>Message Sent!</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>The vehicle owner has been contacted. WhatsApp should open automatically.</p>
            <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setState(STATES.ready)}>Go Back</button>
          </div>
        )}

        {state === STATES.emergency && (
          <div className={styles.center + ' fade-in'}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚨</div>
            <h2>Emergency Alert Sent</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 20 }}>
              Opening WhatsApp for each emergency contact. Please send them the details.
            </p>
            {emergencyContacts.length > 0 ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {emergencyContacts.map((c, i) => (
                  <a key={i} href={c.whatsapp_url} target="_blank" rel="noreferrer"
                    className="btn btn-green btn-block" style={{ justifyContent: 'center' }}>
                    💬 Contact {c.name} ({c.relation})
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No emergency contacts were set up for this vehicle.</p>
            )}
            <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
              onClick={() => setState(STATES.ready)}>Go Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
