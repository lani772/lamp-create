
// Added 'user' to UserRole to resolve type overlap error in App.tsx
export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer' | 'user';

export interface Schedule {
  id: string;
  time: string; // HH:MM 24h format
  action: 'on' | 'off';
  enabled: boolean;
}

export interface Controller {
  id: string;
  name: string;
  ip: string;
  secretKey: string;
  model: 'ESP32' | 'ESP8266';
  isOnline: boolean;
  ownerId: number;
  // Diagnostics
  lastError?: string;
  signalStrength?: number; // RSSI
  uptime?: number;
  lastSeen?: string;
}

export interface Lamp {
  id: number;
  name: string;
  // ip and secretKey are now optional/legacy, derived from controller
  ip?: string; 
  secretKey?: string;
  controllerId?: string; // Link to Controller
  pin: number; // ESP32 GPIO Pin
  status: boolean;
  isLocked: boolean;
  totalHours: number;
  lastTurnedOn: string | null;
  brightness?: number; 
  isOnline?: boolean; 
  ownerId?: number; 
  schedules?: Schedule[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  allowedLamps: number[]; // Array of Lamp IDs
  createdAt: string;
  role: UserRole; 
  createdBy?: number; 
  pendingUsername?: string; // For name change requests
  passwordResetRequired?: boolean; // For admin initiated resets
}

export interface SystemRequest {
  id: string;
  userId: number;
  username: string;
  adminId: number;
  type: 'access' | 'support' | 'username_change' | 'password_reset';
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  payload?: any; // To store extra data like the requested new username
}

export interface WifiConfig {
  ssid: string;
  password: string;
  device: 'router' | 'phone' | 'direct';
}

export type ViewState = 'dashboard' | 'users' | 'settings' | 'wifi' | 'admins' | 'requests' | 'profile' | 'diagnostics';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  type: 'info' | 'warning' | 'error' | 'success';
}
