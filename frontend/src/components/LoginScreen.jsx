import React, { useState, useEffect } from 'react';
import { Activity, Shield, Zap, Lock, Eye, EyeOff, ChevronRight, Radio } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'SUPER_ADMIN', email: 'admin@seplatenergy.com', label: 'Super Admin', color: '#f43f5e', desc: 'Engr. Chukwuemeka Obi' },
  { role: 'MAINTENANCE_MANAGER', email: 'maint.mgr@seplatenergy.com', label: 'Maintenance Mgr', color: '#f59e0b', desc: 'Dr. Fatima Aliyu' },
  { role: 'OPERATIONS_MANAGER', email: 'ops.mgr@seplatenergy.com', label: 'Operations Mgr', color: '#10b981', desc: 'Chief Dayo Adeyemi' },
  { role: 'TECHNICIAN', email: 'tech.field@seplatenergy.com', label: 'Field Technician', color: '#06b6d4', desc: 'Emeka Okafor' }
];

// Animated live telemetry ticker data — Seplat Energy assets
const LIVE_FEEDS = [
  { tag: 'CPX-03A', metric: 'Vibration', value: '7.8 mm/s', status: 'WARNING' },
  { tag: 'COMP-GT-01', metric: 'Temp', value: '104.2°C', status: 'CRITICAL' },
  { tag: 'INJ-104B', metric: 'Health', value: '92.1%', status: 'NORMAL' },
  { tag: 'OBL-PUMP-01', metric: 'Pressure', value: '1100 PSI', status: 'NORMAL' },
  { tag: 'HPV-SEP-201', metric: 'Flow Rate', value: '31,000 BPD', status: 'NORMAL' }
];

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@seplatenergy.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [pulseNodes, setPulseNodes] = useState([]);
  const [loginError, setLoginError] = useState('');

  // Animate ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % LIVE_FEEDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Generate random pulsing IoT nodes on background
  useEffect(() => {
    const nodes = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 6 + 4,
      color: ['#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#6366f1'][Math.floor(Math.random() * 5)]
    }));
    setPulseNodes(nodes);
  }, []);

  const performLogin = async (targetEmail, targetPassword) => {
    setIsLoading(true);
    setLoginError('');

    const cleanEmail = (targetEmail || email || '').trim().toLowerCase();
    const pass = targetPassword !== undefined ? targetPassword : password;

    if (!cleanEmail || !pass) {
      setLoginError('Please enter both corporate email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pass })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        onLogin(data.user, data.token);
        setIsLoading(false);
        return;
      } else {
        setLoginError(data.error || 'Authentication failed. Invalid email address or password.');
      }
    } catch (err) {
      console.error('Backend login request error:', err);
      setLoginError('Cannot connect to authentication server. Please check your connection or backend status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (account) => {
    setEmail(account.email);
    setPassword('password123');
    setSelectedRole(account.role);
    performLogin(account.email, 'password123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const feed = LIVE_FEEDS[tickerIndex] || LIVE_FEEDS[0];
  const feedStatusColor = feed?.status === 'CRITICAL' ? '#ef4444' : feed?.status === 'WARNING' ? '#f59e0b' : '#10b981';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Animated Background Nodes */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        {pulseNodes.map(node => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: `${node.size}px`,
              height: `${node.size}px`,
              borderRadius: '50%',
              background: node.color,
              opacity: 0.35,
              animation: `iot-pulse 3s ${node.delay}s infinite ease-in-out`
            }}
          />
        ))}

        {/* Background gradient orbs */}
        <div style={{
          position: 'absolute', top: '-200px', right: '-200px',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', left: '-150px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)'
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '40%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)'
        }} />
      </div>

      {/* Left Side — Branding Panel */}
      <div style={{
        flex: '1',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        zIndex: 1,
        display: window.innerWidth < 900 ? 'none' : 'flex'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981, #0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(16,185,129,0.4)'
          }}>
            <Activity size={30} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Seplat Energy Plc
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Predictive Maintenance
            </h1>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginBottom: '48px', maxWidth: '480px' }}>
          <h2 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '16px' }}>
            Intelligent Asset Reliability for
            <span style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Seplat Energy Plc</span>
          </h2>
          <p style={{ fontSize: '1rem', color: '#9ca3af', lineHeight: 1.7 }}>
            Real-time IoT telemetry ingestion, AI-driven anomaly detection, and automated preventive work orders — protecting Seplat's OML 4, 38 & 41 rotating equipment across the Niger Delta.
          </p>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '420px' }}>
          {[
            { icon: '⚡', label: 'Serverless AWS Lambda Ingestion', desc: 'Sub-100ms telemetry processing' },
            { icon: '🧠', label: 'Predictive Analytics Engine', desc: '3-sigma anomaly detection + RUL estimation' },
            { icon: '🛡️', label: 'ISO 55001 & AWS KMS Compliance', desc: 'AES-256 encryption + immutable audit logs' },
            { icon: '📱', label: 'Mobile PWA for Field Technicians', desc: 'Offline-capable for swamp environments' }
          ].map((feat, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px',
              background: 'rgba(31,41,61,0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '1.3rem' }}>{feat.icon}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>{feat.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Live feed ticker */}
        <div style={{
          marginTop: '36px', padding: '12px 18px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', gap: '10px',
          maxWidth: '420px',
          transition: 'all 0.4s ease'
        }}>
          <Radio size={14} color={feedStatusColor} style={{ animation: 'iot-pulse 1.5s infinite' }} />
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>LIVE:</span>
          <span style={{ fontSize: '0.78rem', color: '#f3f4f6', fontWeight: 600 }}>{feed.tag}</span>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{feed.metric}</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: feedStatusColor, marginLeft: 'auto' }}>{feed.value}</span>
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700,
            background: feed.status === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : feed.status === 'WARNING' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
            color: feedStatusColor
          }}>{feed.status}</span>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 40px',
        background: 'rgba(17,24,39,0.95)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Mobile logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16,185,129,0.35)'
          }}>
            <Activity size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Seplat PredMaint</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Seplat Energy Plc — Asset Reliability Platform</div>
          </div>
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
          Welcome back
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '28px' }}>
          Sign in to your operational portal
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Corporate Email
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@seplatenergy.com"
              required
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                style={{ fontSize: '0.9rem', paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {loginError && (
            <div style={{
              padding: '10px 14px', background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px',
              fontSize: '0.8rem', color: '#f43f5e'
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-emerald"
            style={{ padding: '13px', fontSize: '0.95rem', marginTop: '4px', position: 'relative' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Authenticating...
              </span>
            ) : (
              <>
                <Lock size={16} /> Sign In to Portal
                <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>DEMO ACCOUNTS</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.role}
                onClick={() => handleQuickLogin(acc)}
                style={{
                  padding: '10px 12px',
                  background: selectedRole === acc.role ? `${acc.color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedRole === acc.role ? acc.color + '50' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: acc.color, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {acc.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{acc.desc}</div>
              </button>
            ))}
          </div>

          <p style={{ fontSize: '0.72rem', color: '#6b7280', textAlign: 'center', marginTop: '12px' }}>
            Click any demo account to pre-fill credentials. Password: <code style={{ color: '#9ca3af' }}>password123</code>
          </p>
        </div>

        {/* Security badges */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { icon: '🔐', text: 'AES-256 KMS' },
            { icon: '🛡️', text: 'RBAC Enforced' },
            { icon: '📋', text: 'ISO 55001 Compliant' }
          ].map((badge, i) => (
            <span key={i} style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {badge.icon} {badge.text}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes iot-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
