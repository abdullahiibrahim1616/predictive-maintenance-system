const env = import.meta.env;

export const DEMO_PASSWORD = (env.VITE_DEMO_PASSWORD || 'ChangeMe!2026').trim();

export const DEMO_ACCOUNTS = [
  {
    role: 'SUPER_ADMIN',
    email: (env.VITE_DEMO_ADMIN_EMAIL || 'admin@localhost.test').trim().toLowerCase(),
    label: 'Super Admin',
    color: '#f43f5e',
    desc: 'System Administrator'
  },
  {
    role: 'MAINTENANCE_MANAGER',
    email: (env.VITE_DEMO_MAINTENANCE_EMAIL || 'maint.mgr@localhost.test').trim().toLowerCase(),
    label: 'Maintenance Mgr',
    color: '#f59e0b',
    desc: 'Maintenance Manager'
  },
  {
    role: 'OPERATIONS_MANAGER',
    email: (env.VITE_DEMO_OPERATIONS_EMAIL || 'ops.mgr@localhost.test').trim().toLowerCase(),
    label: 'Operations Mgr',
    color: '#10b981',
    desc: 'Operations Manager'
  },
  {
    role: 'TECHNICIAN',
    email: (env.VITE_DEMO_TECHNICIAN_EMAIL || 'tech.field@localhost.test').trim().toLowerCase(),
    label: 'Field Technician',
    color: '#06b6d4',
    desc: 'Field Technician'
  }
];

export const getDemoAccount = (role) => DEMO_ACCOUNTS.find((account) => account.role === role) || DEMO_ACCOUNTS[0];
