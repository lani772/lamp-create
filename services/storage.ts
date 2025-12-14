
import { Lamp, User, ActivityLog, SystemRequest, Controller } from '../types';

const LAMPS_KEY = 'lumina_lamps';
const CONTROLLERS_KEY = 'lumina_controllers';
const USERS_KEY = 'lumina_users';
const ADMIN_KEY = 'lumina_admin_pass';
const API_KEY = 'lumina_api_endpoint';
const LOGS_KEY = 'lumina_activity_logs';
const REQUESTS_KEY = 'lumina_system_requests';

export const storageService = {
  getLamps: (): Lamp[] => {
    try {
      const stored = localStorage.getItem(LAMPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load lamps", e);
      return [];
    }
  },

  saveLamps: (lamps: Lamp[]) => {
    localStorage.setItem(LAMPS_KEY, JSON.stringify(lamps));
  },

  getControllers: (): Controller[] => {
    try {
      const stored = localStorage.getItem(CONTROLLERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load controllers", e);
      return [];
    }
  },

  saveControllers: (controllers: Controller[]) => {
    localStorage.setItem(CONTROLLERS_KEY, JSON.stringify(controllers));
  },

  getUsers: (): User[] => {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load users", e);
      return [];
    }
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getApiEndpoint: (): string => {
    return localStorage.getItem(API_KEY) || 'http://localhost:3000/api';
  },

  saveApiEndpoint: (endpoint: string) => {
    localStorage.setItem(API_KEY, endpoint);
  },

  getAdminPassword: (): string => {
    return localStorage.getItem(ADMIN_KEY) || 'admin123';
  },

  saveAdminPassword: (password: string) => {
    localStorage.setItem(ADMIN_KEY, password);
  },

  getLogs: (): ActivityLog[] => {
    try {
      const stored = localStorage.getItem(LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveLogs: (logs: ActivityLog[]) => {
    // Keep only last 100 logs
    const trimmed = logs.slice(0, 100);
    localStorage.setItem(LOGS_KEY, JSON.stringify(trimmed));
  },

  getRequests: (): SystemRequest[] => {
    try {
      const stored = localStorage.getItem(REQUESTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveRequests: (requests: SystemRequest[]) => {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
  }
};
