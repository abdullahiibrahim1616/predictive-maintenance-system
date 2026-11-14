import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99,102,241,0.15), transparent), #070b14',
    }}>
      {/* Left Panel — Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', background: 'rgba(99,102,241,0.04)',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '440px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', marginBottom: '28px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem', boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}>🔐</div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: '16px' }}>
            RBAC Admin<br />
            <span style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dashboard
            </span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '40px' }}>
            Enterprise-grade Role-Based Access Control with granular permission management, real-time audit logging, and secure JWT authentication.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { icon: '🛡️', title: '5 Built-in Roles', desc: 'Super Admin → Viewer permission hierarchy' },
              { icon: '🔑', title: '15 Granular Permissions', desc: 'Per-module access control with user overrides' },
              { icon: '📋', title: 'Full Audit Trail', desc: 'Every action logged with actor, target, and status' },
              { icon: '🔒', title: 'JWT + bcrypt Auth', desc: 'Secure token-based authentication' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{ width: '480px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 48px', overflowY: 'auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>Sign In</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>Enter your credentials to access the dashboard</p>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '20px', color: 'var(--danger)', fontSize: '0.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email" className="form-control"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} className="form-control"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}>
            {loading ? <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Signing in…</> : '→ Sign In to Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}
