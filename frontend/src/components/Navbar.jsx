import React, { useState } from 'react';
import { Activity, BarChart3, Wrench, Key, Database, Cpu, Wifi, WifiOff, LogOut, Bell, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function Navbar({ currentUser, onSelectRole, onLogout, onOpenChangePassword, activeTab, setActiveTab, backendOnline, notifications = [] }) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const roleBadges = {
    SUPER_ADMIN: { label: 'Super Admin', class: 'badge-rose', icon: Key },
    MAINTENANCE_MANAGER: { label: 'Maintenance Mgr', class: 'badge-amber', icon: Wrench },
    OPERATIONS_MANAGER: { label: 'Operations Mgr', class: 'badge-emerald', icon: BarChart3 },
    TECHNICIAN: { label: 'Field Technician', class: 'badge-cyan', icon: Cpu }
  };

  const roleInfo = roleBadges[currentUser?.role] || roleBadges.SUPER_ADMIN;
  const RoleIcon = roleInfo.icon;

  const roleColors = {
    SUPER_ADMIN: '#f43f5e',
    MAINTENANCE_MANAGER: '#f59e0b',
    OPERATIONS_MANAGER: '#10b981',
    TECHNICIAN: '#06b6d4'
  };
  const activeRoleColor = roleColors[currentUser?.role] || '#60a5fa';

  const safeNotifs = Array.isArray(notifications) ? notifications : [];

  return (
    <header style={{
      background: 'rgba(9, 13, 22, 0.96)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Top accent line colored by role */}
      <div style={{
        height: '2px',
        background: `linear-gradient(90deg, ${activeRoleColor}80, transparent 60%)`,
        transition: 'background 0.5s ease'
      }} />

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: 'linear-gradient(135deg, #10b981, #0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.35)'
          }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Seplat PredMaint
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '0.6rem', padding: '2px 7px' }}>Cloud SaaS</span>
              {/* Backend status indicator */}
              <span title={backendOnline ? 'Backend API connected' : 'Offline mode (client simulation)'} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '0.65rem', color: backendOnline ? '#10b981' : '#6b7280',
                fontWeight: 600
              }}>
                {backendOnline
                  ? <Wifi size={11} color="#10b981" />
                  : <WifiOff size={11} color="#6b7280" />}
                <span style={{ display: window.innerWidth < 1100 ? 'none' : 'inline' }}>
                  {backendOnline ? 'API Live' : 'Offline'}
                </span>
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: '#6b7280', display: window.innerWidth < 1000 ? 'none' : 'block' }}>
              Seplat Energy Plc — OML 4, 38 & 41 Asset Reliability
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          <button
            id="nav-dashboard"
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dashboard')}
            style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
          >
            <BarChart3 size={14} /> Portal
          </button>

          <button
            id="nav-simulator"
            className={`btn ${activeTab === 'simulator' ? 'btn-emerald' : 'btn-secondary'}`}
            onClick={() => setActiveTab('simulator')}
            style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
          >
            <Activity size={14} /> Telemetry Sim
          </button>

          {currentUser?.role === 'SUPER_ADMIN' && (
            <button
              id="nav-audit"
              className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('audit')}
              style={{ padding: '7px 14px', fontSize: '0.78rem', gap: '6px' }}
            >
              <Database size={14} /> Audit Trail
            </button>
          )}
        </div>

        {/* User Profile + Notification Bell + Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* Demo Role Switcher (Super Admin Demo Only) */}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(255,255,255,0.04)', padding: '4px 8px',
              borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)'
            }}>
              <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginRight: '2px' }}>DEMO:</span>
              {[
                { role: 'SUPER_ADMIN', short: 'Admin', color: '#f43f5e' },
                { role: 'MAINTENANCE_MANAGER', short: 'Maint', color: '#f59e0b' },
                { role: 'OPERATIONS_MANAGER', short: 'Ops', color: '#10b981' },
                { role: 'TECHNICIAN', short: 'Tech', color: '#06b6d4' }
              ].map(r => (
                <button
                  key={r.role}
                  id={`role-${r.role.toLowerCase()}`}
                  onClick={() => onSelectRole(r.role)}
                  title={`Simulate switching to ${r.short}`}
                  style={{
                    padding: '3px 9px', borderRadius: '5px', border: 'none',
                    fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                    background: currentUser?.role === r.role ? `${r.color}25` : 'transparent',
                    color: currentUser?.role === r.role ? r.color : '#6b7280',
                    transition: 'all 0.15s ease',
                    outline: currentUser?.role === r.role ? `1px solid ${r.color}40` : 'none'
                  }}
                >
                  {r.short}
                </button>
              ))}
            </div>
          )}

          {/* Notification Bell Icon */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="btn btn-secondary"
              style={{ padding: '7px 10px', borderRadius: '8px', position: 'relative' }}
              title="AWS SNS/SES Notification Logs"
            >
              <Bell size={16} color={safeNotifs.length > 0 ? '#f59e0b' : '#9ca3af'} />
              {safeNotifs.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#f43f5e', color: '#fff', fontSize: '0.6rem',
                  fontWeight: 800, padding: '1px 5px', borderRadius: '9999px',
                  boxShadow: '0 0 6px rgba(244,63,94,0.6)'
                }}>
                  {safeNotifs.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {isNotifOpen && (
              <div className="glass-card" style={{
                position: 'absolute', right: 0, top: '44px', width: '360px',
                maxHeight: '420px', overflowY: 'auto', padding: '16px',
                background: '#0d1526', zIndex: 200, boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={14} color="#f59e0b" /> Automated Alerts Log
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>AWS SNS / SES Live</span>
                </div>

                {safeNotifs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '0.75rem', color: '#6b7280' }}>
                    No notifications sent yet. Use Telemetry Simulator to trigger alerts.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {safeNotifs.map(n => (
                      <div key={n.id} style={{
                        padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                            background: n.channel === 'SMS' ? 'rgba(6,182,212,0.2)' : 'rgba(245,158,11,0.2)',
                            color: n.channel === 'SMS' ? '#06b6d4' : '#f59e0b',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            {n.channel === 'SMS' ? <MessageSquare size={10} /> : <Mail size={10} />}
                            {n.channel}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{n.timestamp || 'Just now'}</span>
                        </div>
                        <div style={{ fontWeight: 600, color: '#f3f4f6', marginBottom: '2px' }}>
                          To: {n.recipient_name} ({n.recipient_contact})
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.7rem', lineHeight: 1.4 }}>
                          {n.message_body || n.subject}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap' }}>
                {currentUser?.full_name || 'Engr. Chukwuemeka Obi'}
              </div>
              <span className={`badge ${roleInfo.class}`} style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                <RoleIcon size={10} /> {roleInfo.label}
              </span>
            </div>

            {/* Avatar circle */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${activeRoleColor}60, ${activeRoleColor}30)`,
              border: `2px solid ${activeRoleColor}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 800, color: '#fff',
              flexShrink: 0
            }}>
              {(currentUser?.full_name || 'E').charAt(0)}
            </div>

            <button
              id="btn-change-password"
              onClick={onOpenChangePassword}
              className="btn btn-secondary"
              title="Change Password"
              style={{ padding: '7px 10px', borderRadius: '8px', gap: '0' }}
            >
              <Key size={15} color="#9ca3af" />
            </button>

            <button
              id="btn-logout"
              onClick={onLogout}
              className="btn btn-secondary"
              title="Sign Out"
              style={{ padding: '7px 10px', borderRadius: '8px', gap: '0' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
