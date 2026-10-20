import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function ChangePasswordModal({ authToken, onPasswordChanged, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Complexity Criteria
  const hasMinLen = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const isMatching = newPassword && newPassword === confirmPassword;
  const isFormValid = hasMinLen && hasUpper && hasLower && hasDigit && isMatching && currentPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Password changed successfully! Session re-authenticated.');
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          if (onPasswordChanged) onPasswordChanged(data.token);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setErrorMsg('Network error connecting to authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '480px', width: '100%', background: '#0e1626',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
        padding: '28px', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', right: '16px', top: '16px',
            background: 'none', border: 'none', color: '#9ca3af',
            cursor: 'pointer', padding: '6px'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Lock size={20} color="#ffffff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
              Change Account Password
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Enforce ISO 27001 credential security policy
            </p>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px', background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
            fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            padding: '10px 14px', background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px',
            fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current Password */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input-field"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                required
                style={{ fontSize: '0.88rem', paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px'
                }}
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                style={{ fontSize: '0.88rem', paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px'
                }}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              className="input-field"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              style={{ fontSize: '0.88rem' }}
            />
          </div>

          {/* Password Complexity Checklist */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', padding: '12px 14px',
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem'
          }}>
            <div style={{ color: hasMinLen ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasMinLen ? '✓' : '○'} Min 8 characters
            </div>
            <div style={{ color: hasUpper ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasUpper ? '✓' : '○'} Uppercase letter
            </div>
            <div style={{ color: hasLower ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasLower ? '✓' : '○'} Lowercase letter
            </div>
            <div style={{ color: hasDigit ? '#10b981' : '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {hasDigit ? '✓' : '○'} Numeric digit
            </div>
            <div style={{ color: isMatching ? '#10b981' : '#6b7280', gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isMatching ? '✓' : '○'} Passwords match
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1, padding: '10px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-emerald"
              disabled={!isFormValid || isLoading}
              style={{ flex: 2, padding: '10px' }}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
