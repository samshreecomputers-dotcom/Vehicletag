import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import styles from './Landing.module.css';

const Feature = ({ icon, title, desc }) => (
  <div className={styles.feature}>
    <div className={styles.featureIcon}>{icon}</div>
    <h3>{title}</h3>
    <p>{desc}</p>
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          VehicleTag
        </div>
        <div className={styles.navLinks}>
          {user
            ? <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
            : <>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Get Started</Link>
              </>
          }
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.pill}>🚗 Smart QR Vehicle Tags</div>
          <h1 className={styles.heroTitle}>
            Contact Any Vehicle<br />
            <span className={styles.accent}>Instantly & Safely</span>
          </h1>
          <p className={styles.heroSub}>
            Register your vehicle, get a QR sticker. Anyone who needs to reach you —
            for wrong parking, emergencies, or anything else — can do it without seeing your phone number.
          </p>
          <div className={styles.heroBtns}>
            <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
              Register Your Vehicle →
            </Link>
            <a href="#how" className="btn btn-secondary">See How It Works</a>
          </div>
          <div className={styles.heroStats}>
            <div><span>100%</span> Private</div>
            <div><span>Free</span> to Start</div>
            <div><span>Instant</span> Contact</div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.mockCard}>
            <div className={styles.mockHeader}>Contact Vehicle Owner</div>
            <div className={styles.mockPlate}>MH 05 BF ####</div>
            <div className={styles.mockBtns}>
              <div className={styles.mockBtn} style={{ borderColor: '#f5a623' }}>📞 Masked Call</div>
              <div className={styles.mockBtn} style={{ borderColor: '#25D366' }}>💬 WhatsApp</div>
            </div>
            <div className={styles.mockEmergency}>🚨 Emergency Alert</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features} id="how">
        <div className={styles.sectionTag}>FEATURES</div>
        <h2 className={styles.sectionTitle}>Everything you need, nothing you don't</h2>
        <div className={styles.featuresGrid}>
          <Feature icon="🔒" title="Masked Calls" desc="Callers reach you through an anonymous bridge — your real number stays private." />
          <Feature icon="💬" title="WhatsApp Contact" desc="Instant WhatsApp messages sent directly to your number with vehicle context." />
          <Feature icon="🚨" title="Emergency Contacts" desc="Add family members. One tap on the QR and all emergency contacts get alerted." />
          <Feature icon="🖨️" title="QR Sticker PDF" desc="Generate a printable QR sticker in seconds. Stick it on your windshield and you're done." />
          <Feature icon="📊" title="Contact Logs" desc="See who scanned your QR tag, when, and why. Full transparency." />
          <Feature icon="⚡" title="Instant Setup" desc="Register a vehicle in under 2 minutes. No hardware needed." />
        </div>
      </section>

      {/* Steps */}
      <section className={styles.steps}>
        <div className={styles.sectionTag}>HOW IT WORKS</div>
        <h2 className={styles.sectionTitle}>3 simple steps</h2>
        <div className={styles.stepsGrid}>
          {[
            { n: '01', title: 'Register', desc: 'Create an account and add your vehicle number.' },
            { n: '02', title: 'Print Sticker', desc: 'Download your QR sticker PDF and stick it on your car.' },
            { n: '03', title: 'Stay Connected', desc: 'Anyone who scans it can reach you safely and instantly.' },
          ].map(s => (
            <div key={s.n} className={styles.step}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2>Ready to tag your vehicle?</h2>
        <p>Join thousands of responsible vehicle owners across India.</p>
        <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
          Get Your Free QR Tag →
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.logo}><span className={styles.logoIcon}>◈</span> VehicleTag</div>
        <p>© 2026 VehicleTag. All rights reserved.</p>
      </footer>
    </div>
  );
}
