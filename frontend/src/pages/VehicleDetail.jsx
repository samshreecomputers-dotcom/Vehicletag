import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import styles from './VehicleDetail.module.css';
import { jsPDF } from 'jspdf';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('qr');
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [addingContact, setAddingContact] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [vRes, ecRes, logRes] = await Promise.all([
        api.get('/vehicles'),
        api.get(`/vehicles/${id}/emergency-contacts`),
        api.get(`/vehicles/${id}/logs`)
      ]);
      const v = vRes.data.find(x => x.id === id);
      if (!v) { navigate('/dashboard'); return; }
      setVehicle(v);
      setEmergencyContacts(ecRes.data);
      setLogs(logRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async e => {
    e.preventDefault();
    setAddingContact(true);
    try {
      const { data } = await api.post(`/vehicles/${id}/emergency-contacts`, newContact);
      setEmergencyContacts(c => [...c, data]);
      setNewContact({ name: '', phone: '', relation: '' });
      setShowContactForm(false);
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Remove this emergency contact?')) return;
    await api.delete(`/emergency-contacts/${contactId}`);
    setEmergencyContacts(c => c.filter(x => x.id !== contactId));
  };

  const downloadQRPDF = () => {
    if (!vehicle?.qr_data) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 120] });

    // Yellow background
    doc.setFillColor(255, 200, 0);
    doc.rect(0, 0, 100, 120, 'F');

    // White card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, 8, 84, 84, 4, 4, 'F');

    // QR Code
    doc.addImage(vehicle.qr_data, 'PNG', 13, 13, 74, 74);

    // App name
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('VehicleTag', 50, 97, { align: 'center' });

    // Instruction text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text('Wrong Parking, Emergency Contact,', 50, 104, { align: 'center' });
    doc.text('any issue with the vehicle — Scan the QR.', 50, 109, { align: 'center' });

    // Vehicle number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(vehicle.vehicle_number, 50, 116, { align: 'center' });

    doc.save(`VehicleTag-${vehicle.vehicle_number}.pdf`);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40, color: 'var(--accent)' }} />
    </div>
  );

  const contactUrl = `${window.location.origin}/contact/${vehicle.tag_id}`;

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{vehicle.vehicle_number}</h1>
          <p className={styles.sub}>Tag ID: <span className="tag">{vehicle.tag_id}</span></p>
        </div>
        <span className="badge badge-green">Active</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {['qr', 'emergency', 'logs'].map(t => (
          <button key={t} className={styles.tab + (tab === t ? ' ' + styles.tabActive : '')} onClick={() => setTab(t)}>
            {t === 'qr' ? '📱 QR Sticker' : t === 'emergency' ? '🚨 Emergency' : '📋 Logs'}
          </button>
        ))}
      </div>

      {/* QR Tab */}
      {tab === 'qr' && (
        <div className={styles.content + ' fade-in'}>
          <div className={styles.qrSection}>
            <div className={styles.qrCard}>
              <img src={vehicle.qr_data} alt="QR Code" className={styles.qrImage} />
              <div className={styles.qrLabel}>Scan to contact vehicle owner</div>
            </div>
            <div className={styles.qrInfo}>
              <h2>Your QR Sticker</h2>
              <p className={styles.qrDesc}>
                Print this sticker and place it on your windshield or rear window. Anyone who needs to reach you can scan this QR code.
              </p>
              <div className={styles.qrUrl}>
                <span className="label">Public Link</span>
                <div className={styles.urlBox}>
                  <span>{contactUrl}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => navigator.clipboard.writeText(contactUrl)}>Copy</button>
                </div>
              </div>
              <div className={styles.qrFeatures}>
                <div className={styles.qrFeature}>✅ Anonymous calls — your number stays hidden</div>
                <div className={styles.qrFeature}>✅ Direct WhatsApp messages</div>
                <div className={styles.qrFeature}>✅ Emergency contact alerts</div>
                <div className={styles.qrFeature}>✅ Contact logs in your dashboard</div>
              </div>
              <button className="btn btn-primary" onClick={downloadQRPDF} style={{ marginTop: 8 }}>
                🖨️ Download Sticker PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Tab */}
      {tab === 'emergency' && (
        <div className={styles.content + ' fade-in'}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Emergency Contacts</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>These contacts get a WhatsApp alert when someone triggers an emergency via your QR tag.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowContactForm(!showContactForm)}>
              {showContactForm ? 'Cancel' : '+ Add Contact'}
            </button>
          </div>

          {showContactForm && (
            <form className={styles.contactForm + ' card fade-in'} onSubmit={handleAddContact}>
              <h3 style={{ marginBottom: 16 }}>Add Emergency Contact</h3>
              <div className={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Priya Sharma" value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="label">Relation</label>
                  <select className="input" value={newContact.relation} onChange={e => setNewContact(c => ({ ...c, relation: e.target.value }))} required>
                    <option value="">Select...</option>
                    <option>Spouse</option><option>Parent</option><option>Sibling</option>
                    <option>Child</option><option>Friend</option><option>Colleague</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Phone (with country code)</label>
                <input className="input" placeholder="+919876543210" value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingContact}>
                {addingContact ? <span className="spinner" /> : 'Save Contact'}
              </button>
            </form>
          )}

          {emergencyContacts.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚨</div>
              <p>No emergency contacts added yet</p>
            </div>
          ) : (
            <div className={styles.contactsList}>
              {emergencyContacts.map(c => (
                <div key={c.id} className={styles.contactItem}>
                  <div className={styles.contactAvatar}>{c.name[0]}</div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactName}>{c.name}</div>
                    <div className={styles.contactMeta}>{c.relation} • {c.phone}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContact(c.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        <div className={styles.content + ' fade-in'}>
          <h2 style={{ marginBottom: 20 }}>Contact Logs</h2>
          {logs.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
              <p>No contacts recorded yet</p>
            </div>
          ) : (
            <div className={styles.logsList}>
              {logs.map(log => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logIcon}>
                    {log.contact_type === 'emergency' ? '🚨' : log.contact_type === 'whatsapp' ? '💬' : '📞'}
                  </div>
                  <div className={styles.logInfo}>
                    <div className={styles.logType}>
                      <span className={`badge ${log.contact_type === 'emergency' ? 'badge-red' : 'badge-green'}`}>
                        {log.contact_type}
                      </span>
                    </div>
                    <div className={styles.logMeta}>
                      {log.caller_info && log.caller_info !== 'anonymous' && <span>From: {log.caller_info}</span>}
                      {log.message && <span> • {log.message.slice(0, 60)}{log.message.length > 60 ? '...' : ''}</span>}
                    </div>
                  </div>
                  <div className={styles.logTime}>{new Date(log.created_at).toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
