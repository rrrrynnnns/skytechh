export type DemoRole = 'admin' | 'technician' | 'subscriber';

export type DemoAccount = {
  email: string;
  password: string;
  id: string;
  name: string;
  role: DemoRole;
  subscriberId?: string;
  technicianId?: string;
};

export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  admin: { email: 'admin@skytech.net', password: 'admin123', id: 'USR-ADMIN', name: 'Sky-Tech Admin', role: 'admin' },
  technician: { email: 'tech@skytech.net', password: 'tech123', id: 'USR-TECH', name: 'Luis Dela Cruz', role: 'technician', technicianId: '100001' },
  subscriber: { email: 'user1@skytech.net', password: 'user123', id: 'USR-SUB', name: 'Alex Rivera', role: 'subscriber', subscriberId: '100000001' },
};
