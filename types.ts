
export interface Lamp {
  id: number;
  name: string;
  ip: string;
  secretKey: string;
  pin: number; // ESP32 GPIO Pin
  status: boolean;
  isLocked: boolean;
  totalHours: number;
  lastTurnedOn: string | null;
  brightness?: number; 
  isOnline?: boolean; 
  ownerId?: number; 
}

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  allowedLamps: number[]; // Array of Lamp IDs
  createdAt: string;
  role: 'super_admin' | 'admin' | 'user'; 
  createdBy?: number; 
}

export interface WifiConfig {
  ssid: string;
  password: string;
  device: 'router' | 'phone' | 'direct';
}

export type ViewState = 'dashboard' | 'users' | 'settings' | 'wifi' | 'admins';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
