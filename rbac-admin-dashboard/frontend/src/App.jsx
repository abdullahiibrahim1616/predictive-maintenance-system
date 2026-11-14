import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import AuditLogs from './pages/AuditLogs';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AccessDenied from './pages/AccessDenied';

// Protected route wrapper
function ProtectedRoute({ permission, children }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <AccessDenied permission={permission} />;
  return children;
}

// Topbar
function Topbar() {
  const { user } = useAuth();
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  return (
    <div style={{
      position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0,
      height: 'var(--topbar-height)', background: 'rgba(7,11,20,0.9)',
      backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px', zIndex: 50,
    }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>RBAC Corp</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span style={{ color: user?.roleColor, fontWeight: 500 }}>{user?.roleName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{user?.fullName}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.department}</div>
        </div>
        <div className="avatar" style={{ background: user?.avatarColor, width: '34px', height: '34px', fontSize: '0.78rem' }}>{initials}</div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-body">
          <Routes>
            <Route path="/dashboard" element={<ProtectedRoute permission="dashboard.view"><Dashboard /></ProtectedRoute>} />
            <Route path="/users"     element={<ProtectedRoute permission="users.edit"><UserManagement /></ProtectedRoute>} />
            <Route path="/roles"     element={<ProtectedRoute permission="roles.create"><RoleManagement /></ProtectedRoute>} />
            <Route path="/reports"   element={<ProtectedRoute permission="reports.view"><Reports /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute permission="audit.view"><AuditLogs /></ProtectedRoute>} />
            <Route path="/settings"  element={<ProtectedRoute permission="settings.view"><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPageWrapper />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginPageWrapper() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LoginPage />;
}
