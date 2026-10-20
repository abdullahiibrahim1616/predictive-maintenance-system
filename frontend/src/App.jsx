import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginScreen from './components/LoginScreen';
import SuperAdminView from './components/SuperAdminView';
import MaintenanceManagerView from './components/MaintenanceManagerView';
import OperationsManagerView from './components/OperationsManagerView';
import TechnicianView from './components/TechnicianView';
import TelemetrySimulatorModal from './components/TelemetrySimulatorModal';
import ChangePasswordModal from './components/ChangePasswordModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(localStorage.getItem('auth_token') || null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Core Data States
  const [equipmentList, setEquipmentList] = useState([
    { id: 'eq-101', facility_id: 'fac-1', facility_name: 'Ovhor Processing Facility', tag_name: 'CPX-03A', equipment_type: 'Crude Processing Train Centrifugal Pump', serial_number: 'SN-CPX-8849', criticality_rating: 'CRITICAL', status: 'WARNING', health_index: 58.4 },
    { id: 'eq-102', facility_id: 'fac-1', facility_name: 'Ovhor Processing Facility', tag_name: 'INJ-104B', equipment_type: 'Water Injection Pump 104B', serial_number: 'SN-INJ-3392', criticality_rating: 'HIGH', status: 'OPERATIONAL', health_index: 92.1 },
    { id: 'eq-103', facility_id: 'fac-2', facility_name: 'Oben Gas Processing Plant', tag_name: 'COMP-GT-01', equipment_type: 'Gas Turbine Generator Unit 1', serial_number: 'SN-GT-1102', criticality_rating: 'CRITICAL', status: 'DEGRADED', health_index: 42.0 },
    { id: 'eq-104', facility_id: 'fac-2', facility_name: 'Oben Gas Processing Plant', tag_name: 'HPV-SEP-201', equipment_type: 'High-Pressure 3-Phase Separator Train 2', serial_number: 'SN-HPV-7711', criticality_rating: 'MEDIUM', status: 'OPERATIONAL', health_index: 96.5 },
    { id: 'eq-105', facility_id: 'fac-3', facility_name: 'Amukpe Crude Terminal', tag_name: 'OBL-PUMP-01', equipment_type: 'Main Oil Buffer Loading Pump', serial_number: 'SN-OBL-9901', criticality_rating: 'CRITICAL', status: 'OPERATIONAL', health_index: 88.0 }
  ]);

  const [workOrders, setWorkOrders] = useState([
    {
      id: 'wo-101',
      equipment_id: 'eq-101',
      tag_name: 'CPX-03A',
      title: 'Crude Pump CPX-03A Bearing & Seal Inspection',
      description: 'Elevated vibration RMS detected (7.8 mm/s). Inspect mechanical seals and thrust bearings.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      predicted_failure_mode: 'Bearing Wear & Seal Degradation',
      estimated_rul_hours: 148.0,
      assigned_technician_name: 'Emeka Okafor (Field Tech)',
      net_savings_usd: 565000.0
    },
    {
      id: 'wo-102',
      equipment_id: 'eq-103',
      tag_name: 'COMP-GT-01',
      title: 'URGENT: Gas Turbine COMP-GT-01 Hot Section Inspection',
      description: 'Critical vibration threshold reached (11.4 mm/s). Immediate shutdown recommended.',
      priority: 'CRITICAL',
      status: 'OPEN',
      predicted_failure_mode: 'Turbine Blade Fatigue & Dynamic Unbalance',
      estimated_rul_hours: 36.5,
      assigned_technician_name: 'Emeka Okafor (Field Tech)',
      net_savings_usd: 2219000.0
    }
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { id: 'aud-101', user_email: 'admin@seplatenergy.com', user_role: 'SUPER_ADMIN', action: 'KMS_KEY_ROTATION', target_entity: 'AWS_KMS_KEYS', ip_address: '197.210.64.12', timestamp: '2026-07-22 21:15:00' },
    { id: 'aud-102', user_email: 'maint.mgr@seplatenergy.com', user_role: 'MAINTENANCE_MANAGER', action: 'CREATE_WORK_ORDER', target_entity: 'work_orders', ip_address: '197.210.64.44', timestamp: '2026-07-22 22:04:12' }
  ]);

  const [analyticsData, setAnalyticsData] = useState({
    kpis: {
      totalCostAvoidedUsd: 2784000,
      fleetHealthScore: 84.5,
      activeWorkOrdersCount: 2,
      totalEquipmentCount: 5
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [toastAlert, setToastAlert] = useState(null);

  const [costAvoidanceReports] = useState([
    {
      id: 'car-101',
      work_order_title: 'Crude Pump CPX-03A Bearing & Seal Replacement',
      tag_name: 'CPX-03A',
      facility_name: 'Ovhor Processing Facility',
      predicted_failure_mode: 'Bearing Wear & Seal Degradation',
      estimated_downtime_hours_avoided: 48.0,
      production_loss_rate_usd_per_hr: 12500.0,
      estimated_repair_cost_usd: 35000.0,
      net_savings_usd: 565000.0
    },
    {
      id: 'car-102',
      work_order_title: 'Gas Turbine COMP-GT-01 Hot Section Overhaul',
      tag_name: 'COMP-GT-01',
      facility_name: 'Oben Gas Processing Plant',
      predicted_failure_mode: 'Turbine Blade Fatigue',
      estimated_downtime_hours_avoided: 96.0,
      production_loss_rate_usd_per_hr: 24000.0,
      estimated_repair_cost_usd: 85000.0,
      net_savings_usd: 2219000.0
    }
  ]);

  // Helper for auth headers
  const getAuthHeaders = (tokenOverride) => {
    const token = tokenOverride || authToken || localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Restore authenticated session via /api/v1/auth/me on initial app load
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          setCurrentUser(data.user);
          setAuthToken(storedToken);
          setBackendOnline(true);
        } else {
          // Stored token is invalid or expired
          console.warn('Session restoration failed:', data.error);
          localStorage.removeItem('auth_token');
          setAuthToken(null);
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Backend offline during session validation:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // Try to load live data from backend on mount or user/token update
  useEffect(() => {
    const syncFromBackend = async () => {
      try {
        const health = await fetch('/api/v1/health');
        if (!health.ok) return;
        setBackendOnline(true);

        const authHeaders = getAuthHeaders();

        // Load equipment
        const eqRes = await fetch('/api/v1/equipment', { headers: authHeaders });
        if (eqRes.ok) {
          const eqData = await eqRes.json();
          if (eqData.success && eqData.equipment?.length > 0) {
            setEquipmentList(eqData.equipment);
          }
        }

        // Load work orders
        const woRes = await fetch('/api/v1/work-orders', { headers: authHeaders });
        if (woRes.ok) {
          const woData = await woRes.json();
          if (woData.success && woData.workOrders?.length > 0) {
            setWorkOrders(prev => {
              const backendIds = new Set(woData.workOrders.map(w => w.id));
              const backendEnriched = woData.workOrders.map(wo => ({
                ...wo,
                tag_name: wo.tag_name || equipmentList.find(e => e.id === wo.equipment_id)?.tag_name || 'ASSET',
                assigned_technician_name: wo.assigned_technician_name || 'Emeka Okafor (Field Tech)',
                net_savings_usd: wo.net_savings_usd || 125000.0
              }));
              const frontendOnly = prev.filter(w => !backendIds.has(w.id));
              return [...backendEnriched, ...frontendOnly];
            });
          }
        }

        // Load audit logs
        const auditRes = await fetch('/api/v1/audit-logs', { headers: authHeaders });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.success && auditData.logs?.length > 0) {
            setAuditLogs(auditData.logs.map(l => ({
              id: l.id,
              user_email: l.user_email || 'system',
              user_role: l.user_role || 'SYSTEM',
              action: l.action,
              target_entity: l.target_entity,
              ip_address: l.ip_address || '127.0.0.1',
              timestamp: l.timestamp
            })));
          }
        }

        // Load notifications
        const notifRes = await fetch('/api/v1/notifications', { headers: authHeaders });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          if (notifData.success && notifData.notifications?.length > 0) {
            setNotifications(notifData.notifications);
          }
        }
      } catch (_) {
        console.info('Backend API not reachable — using client-side simulation mode.');
      }
    };

    syncFromBackend();
  }, [currentUser, authToken]);

  // Login handler
  const handleLogin = (user, token = null) => {
    if (token) {
      setAuthToken(token);
      localStorage.setItem('auth_token', token);
    }
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setNotifications([]);
  };

  // Demo Role Switching Handler (Super Admin only, strictly via server authentication)
  const handleSelectRole = async (role) => {
    const roleProfiles = {
      SUPER_ADMIN: { email: 'admin@seplatenergy.com', password: 'password123' },
      MAINTENANCE_MANAGER: { email: 'maint.mgr@seplatenergy.com', password: 'password123' },
      OPERATIONS_MANAGER: { email: 'ops.mgr@seplatenergy.com', password: 'password123' },
      TECHNICIAN: { email: 'tech.field@seplatenergy.com', password: 'password123' }
    };
    const target = roleProfiles[role];
    if (!target) return;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, password: target.password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setAuthToken(data.token);
        localStorage.setItem('auth_token', data.token);
        setCurrentUser(data.user);
      } else {
        alert(`Failed to switch role to ${role}: ${data.error || 'Server rejected credentials.'}`);
      }
    } catch (err) {
      alert(`Cannot switch role: Backend server unreachable.`);
    }
  };

  // Telemetry Ingestion Handler
  const handleIngestTelemetry = async (payload) => {
    try {
      const res = await fetch('/api/v1/telemetry/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        setEquipmentList(prev => prev.map(eq => {
          if (eq.id === payload.equipment_id) {
            return { ...eq, health_index: data.telemetry.health_index, status: data.telemetry.new_status };
          }
          return eq;
        }));

        if (data.autoWorkOrderCreated) {
          const eq = equipmentList.find(e => e.id === payload.equipment_id);
          const newWO = {
            id: data.autoWorkOrderCreated.work_order_id,
            equipment_id: payload.equipment_id,
            tag_name: eq?.tag_name || 'EQUIPMENT',
            title: `[AUTO-ALERT] Predictive Maint: ${eq?.tag_name || 'Asset'} (${data.telemetry.failure_prediction})`,
            description: `Automated trigger: Health Index dropped to ${data.telemetry.health_index}%. Vibration: ${payload.vibration_rms_mms}mm/s, Temp: ${payload.temperature_c}°C.`,
            priority: data.autoWorkOrderCreated.priority,
            status: 'OPEN',
            predicted_failure_mode: data.telemetry.failure_prediction,
            estimated_rul_hours: data.telemetry.estimated_rul_hours,
            assigned_technician_name: 'Emeka Okafor (Field Tech)',
            net_savings_usd: data.autoWorkOrderCreated.netSavingsUsd
          };
          setWorkOrders(prev => [newWO, ...prev]);

          // Fetch updated notifications
          const notifRes = await fetch('/api/v1/notifications', { headers: getAuthHeaders() });
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            if (notifData.success) setNotifications(notifData.notifications);
          }

          // Trigger UI Toast Alert
          setToastAlert({
            tag: eq?.tag_name || 'ASSET',
            health: data.telemetry.health_index,
            failure: data.telemetry.failure_prediction
          });
          setTimeout(() => setToastAlert(null), 6000);
        }
        return data;
      }
    } catch (err) {
      console.warn('Backend API offline, using client-side prediction engine:', err);
    }

    // Client-side fallback computation
    const vib = payload.vibration_rms_mms;
    const temp = payload.temperature_c;
    let penalty = 0;
    let failPred = 'NORMAL';
    if (vib >= 8.0) { penalty += 45; failPred = 'Critical Dynamic Unbalance'; }
    else if (vib >= 4.5) { penalty += 20; failPred = 'Bearing Wear'; }
    if (temp >= 90) { penalty += 40; failPred = failPred === 'NORMAL' ? 'Overheating Risk' : failPred; }
    else if (temp >= 75) { penalty += 15; }

    if (payload.flow_rate_bpd < 10000 && payload.pressure_psi > 1500) {
      penalty += 25;
      if (failPred === 'NORMAL') failPred = 'Impeller Cavitation & Flow Restriction';
    }

    const healthIndex = Math.max(0, parseFloat((100 - penalty).toFixed(1)));
    let newStatus = healthIndex < 45 ? 'DEGRADED' : healthIndex < 70 ? 'WARNING' : 'OPERATIONAL';

    setEquipmentList(prev => prev.map(eq => {
      if (eq.id === payload.equipment_id) return { ...eq, health_index: healthIndex, status: newStatus };
      return eq;
    }));

    let autoWO = null;
    if (healthIndex < 65) {
      const eq = equipmentList.find(e => e.id === payload.equipment_id);
      const woId = 'wo-auto-' + Date.now();
      autoWO = { work_order_id: woId, priority: healthIndex < 45 ? 'CRITICAL' : 'HIGH', netSavingsUsd: 420000.0 };
      setWorkOrders(prev => [{
        id: woId,
        equipment_id: payload.equipment_id,
        tag_name: eq?.tag_name || 'EQUIPMENT',
        title: `[AUTO-ALERT] Predictive Maint: ${eq?.tag_name} (${failPred})`,
        description: `Automated trigger: Health Index dropped to ${healthIndex}%. Vibration=${vib}mm/s, Temp=${temp}°C.`,
        priority: autoWO.priority,
        status: 'OPEN',
        predicted_failure_mode: failPred,
        estimated_rul_hours: parseFloat((healthIndex * 2.5).toFixed(1)),
        assigned_technician_name: 'Tunde Adeleke (Field Tech)',
        net_savings_usd: 420000.0
      }, ...prev]);
    }

    return {
      success: true,
      telemetry: {
        health_index: healthIndex,
        new_status: newStatus,
        failure_prediction: failPred,
        estimated_rul_hours: parseFloat((healthIndex * 2.5).toFixed(1))
      },
      autoWorkOrderCreated: autoWO
    };
  };

  const handleCreateWorkOrder = (woData) => {
    const eq = equipmentList.find(e => e.id === woData.equipment_id);
    const newWO = {
      id: 'wo-' + Date.now(),
      equipment_id: woData.equipment_id,
      tag_name: eq?.tag_name || 'EQUIPMENT',
      title: woData.title,
      description: woData.description || 'Manual predictive work order generated by Maintenance Manager',
      priority: woData.priority || 'HIGH',
      status: 'OPEN',
      predicted_failure_mode: 'Preventive Bearing Inspection',
      estimated_rul_hours: 168.0,
      assigned_technician_name: 'Tunde Adeleke (Field Tech)',
      net_savings_usd: 125000.0
    };
    setWorkOrders([newWO, ...workOrders]);
  };

  const handleUpdateWOStatus = (woId, newStatus) => {
    setWorkOrders(prev => prev.map(wo => {
      if (wo.id === woId) {
        if (newStatus === 'COMPLETED') {
          setEquipmentList(eqPrev => eqPrev.map(eq => {
            if (eq.id === wo.equipment_id) return { ...eq, health_index: 95.0, status: 'OPERATIONAL' };
            return eq;
          }));
        }
        return { ...wo, status: newStatus };
      }
      return wo;
    }));
  };

  // Show loading screen while validating session
  if (isInitializing) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#090d16',
        color: '#f3f4f6', fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          width: '44px', height: '44px', border: '3px solid rgba(16,185,129,0.2)',
          borderTop: '3px solid #10b981', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', marginBottom: '16px'
        }} />
        <div style={{ fontSize: '1rem', fontWeight: 600 }}>Validating Secure Session...</div>
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px' }}>Seplat Energy Asset Reliability Platform</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show login screen if not logged in
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar
        currentUser={currentUser}
        onSelectRole={handleSelectRole}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        notifications={notifications}
      />

      {/* Floating Toast Alert Banner */}
      {toastAlert && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1100,
          background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(153,27,27,0.95))',
          backdropFilter: 'blur(12px)', border: '1px solid #f43f5e',
          borderRadius: '12px', padding: '16px 20px', color: '#fff',
          boxShadow: '0 10px 30px rgba(239,68,68,0.4)', maxWidth: '380px',
          animation: 'slide-in-up 0.3s ease forwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>📲</span>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>AWS SNS / SES Alerts Dispatched!</div>
            <button onClick={() => setToastAlert(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.95, lineHeight: 1.4 }}>
            Critical alert sent to <strong>Emeka Okafor (SMS)</strong> and <strong>Dr. Fatima Aliyu (Email)</strong> for asset <strong>{toastAlert.tag}</strong> (Health: {toastAlert.health}%).
          </div>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px' }}>
        {/* Tab View Routing */}
        {activeTab === 'simulator' ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <TelemetrySimulatorModal
              equipmentList={equipmentList}
              onIngestTelemetry={handleIngestTelemetry}
              onClose={() => setActiveTab('dashboard')}
            />
          </div>
        ) : activeTab === 'audit' ? (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={22} color="#f59e0b" /> Seplat Energy Regulatory Compliance Audit Trail
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px' }}>User Email</th>
                    <th style={{ padding: '12px 16px' }}>Role</th>
                    <th style={{ padding: '12px 16px' }}>Action Executed</th>
                    <th style={{ padding: '12px 16px' }}>Target Entity</th>
                    <th style={{ padding: '12px 16px' }}>Client IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                      <td style={{ padding: '14px 16px', color: '#ffffff', fontWeight: 600 }}>{log.user_email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-amber">{log.user_role}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#60a5fa', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{log.target_entity}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Portal View Based on Selected Role */
          currentUser.role === 'SUPER_ADMIN' ? (
            <SuperAdminView
              auditLogs={auditLogs}
              usersList={[
                { id: 'usr-admin', full_name: 'Engr. Chukwuemeka Obi', email: 'admin@seplatenergy.com', role: 'SUPER_ADMIN', facility_name: 'Ovhor Processing Facility' },
                { id: 'usr-maint', full_name: 'Dr. Fatima Aliyu', email: 'maint.mgr@seplatenergy.com', role: 'MAINTENANCE_MANAGER', facility_name: 'Oben Gas Processing Plant' },
                { id: 'usr-ops', full_name: 'Chief Dayo Adeyemi', email: 'ops.mgr@seplatenergy.com', role: 'OPERATIONS_MANAGER', facility_name: 'Ovhor Processing Facility' },
                { id: 'usr-tech', full_name: 'Emeka Okafor (Field Tech)', email: 'tech.field@seplatenergy.com', role: 'TECHNICIAN', facility_name: 'Oben Gas Processing Plant' }
              ]}
              onRefreshData={() => {}}
            />
          ) : currentUser.role === 'MAINTENANCE_MANAGER' ? (
            <MaintenanceManagerView
              equipmentList={equipmentList}
              workOrders={workOrders}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
              onCreateWorkOrder={handleCreateWorkOrder}
              onUpdateWOStatus={handleUpdateWOStatus}
            />
          ) : currentUser.role === 'OPERATIONS_MANAGER' ? (
            <OperationsManagerView
              analyticsData={analyticsData}
              costAvoidanceReports={costAvoidanceReports}
              equipmentList={equipmentList}
            />
          ) : (
            <TechnicianView
              workOrders={workOrders}
              onUpdateWOStatus={handleUpdateWOStatus}
            />
          )
        )}
      </main>

      {/* Simulator Modal Popup */}
      {isSimulatorOpen && (
        <TelemetrySimulatorModal
          equipmentList={equipmentList}
          onIngestTelemetry={handleIngestTelemetry}
          onClose={() => setIsSimulatorOpen(false)}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          authToken={authToken}
          onPasswordChanged={(newToken) => {
            setAuthToken(newToken);
          }}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        background: 'rgba(11, 15, 25, 0.95)'
      }}>
        Seplat Energy Plc Capstone • Cloud Predictive Maintenance Platform for Nigerian Oil & Gas Operations • Powered by AWS & React
        {backendOnline && (
          <span style={{ marginLeft: '12px', color: '#10b981' }}>
            ● Backend API Active
          </span>
        )}
      </footer>
    </div>
  );
}
