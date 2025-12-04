import { Lamp, User } from '../types';

const LAMPS_KEY = 'lumina_lamps';
const USERS_KEY = 'lumina_users';
const ADMIN_KEY = 'lumina_admin_pass';
const API_KEY = 'lumina_api_endpoint';

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
  }
};