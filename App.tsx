
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Wifi, UserPlus, Settings, LogOut, 
  Plus, Eye, EyeOff, LayoutDashboard, Users,
  Activity, Zap, CheckCircle, User as UserIcon, AlertCircle,
  FileCode, Copy, Terminal, Mail, Lock, Server, Globe, ArrowRight, Download, BookOpen, Bug
} from 'lucide-react';
import { Lamp, User, ViewState, ToastNotification, WifiConfig } from './types';
import { storageService } from './services/storage';
import { LampCard } from './components/LampCard';
import { StatsPanel } from './components/StatsPanel';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { Tabs } from './components/ui/Tabs';

// Super Admin Root Credentials (Hardcoded for this demo, in real app use DB)
const ROOT_USER: User = {
  id: 999999,
  username: 'root',
  email: 'root@lumina.network',
  role: 'super_admin',
  allowedLamps: [],
  createdAt: new Date().toISOString()
};

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register_user' | 'register_admin'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirm: '' });

  // App Data State (Global)
  const [allLamps, setAllLamps] = useState<Lamp[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Derived Data (Filtered for current view)
  const [myLamps, setMyLamps] = useState<Lamp[]>([]);
  const [myUsers, setMyUsers] = useState<User[]>([]);

  const [view, setView] = useState<ViewState>('dashboard');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Refs for Polling
  const lampsRef = useRef(allLamps);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  
  // Edit User Permissions Modal
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Selected lamp for generating code
  const [selectedLampForCode, setSelectedLampForCode] = useState<Lamp | null>(null);

  // Form State
  const [newLamp, setNewLamp] = useState({ name: '', ip: '', secretKey: '', pin: '2' });
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const [wifiConfig, setWifiConfig] = useState<WifiConfig>({ ssid: '', password: '', device: 'router' });
  const [newPass, setNewPass] = useState({ current: '', new: '', confirm: '' });

  // --- INITIALIZATION & MIGRATION ---
  useEffect(() => {
    const loadedLamps = storageService.getLamps();
    const loadedUsers = storageService.getUsers();
    
    // Legacy Migration logic
    let migratedUsers = [...loadedUsers];
    let migratedLamps = [...loadedLamps];
    let dataChanged = false;

    const adminExists = migratedUsers.some(u => u.role === 'admin' || u.role === 'super_admin');
    
    if (!adminExists) {
        const oldAdminPass = localStorage.getItem('lumina_admin_pass');
        const defaultAdmin: User = {
            id: 1,
            username: 'admin',
            email: 'admin@local.system',
            password: oldAdminPass || 'admin123',
            role: 'admin',
            allowedLamps: [],
            createdAt: new Date().toISOString()
        };
        migratedUsers.push(defaultAdmin);
        dataChanged = true;
    }

    const firstAdmin = migratedUsers.find(u => u.role === 'admin');
    if (firstAdmin) {
        migratedLamps = migratedLamps.map(l => {
            if (!l.ownerId) {
                dataChanged = true;
                return { ...l, ownerId: firstAdmin.id };
            }
            if (!l.pin) {
                dataChanged = true;
                return { ...l, pin: 2 };
            }
            return l;
        });
    }

    migratedUsers = migratedUsers.map(u => {
        if (u.role === 'user' && !u.createdBy && firstAdmin) {
            dataChanged = true;
            return { ...u, createdBy: firstAdmin.id };
        }
        return u;
    });

    if (dataChanged) {
        storageService.saveLamps(migratedLamps);
        storageService.saveUsers(migratedUsers);
    }

    setAllLamps(migratedLamps);
    setAllUsers(migratedUsers);
    setApiEndpoint(storageService.getApiEndpoint());
  }, []);

  // Filter Data based on Current User
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'super_admin') {
        setMyLamps(allLamps);
        setMyUsers(allUsers);
    } else if (currentUser.role === 'admin') {
        setMyLamps(allLamps.filter(l => l.ownerId === currentUser.id));
        setMyUsers(allUsers.filter(u => u.createdBy === currentUser.id));
    } else {
        setMyLamps(allLamps.filter(l => currentUser.allowedLamps.includes(l.id)));
        setMyUsers([]);
    }
    
    lampsRef.current = allLamps; 
  }, [currentUser, allLamps, allUsers]);

  // Polling for Status
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const lampsToPoll = lampsRef.current;
      lampsToPoll.forEach(lamp => {
        if (lamp.ip && lamp.ip !== '0.0.0.0' && !lamp.isLocked) {
           checkLampStatus(lamp);
        }
      });
    }, 3000); 

    return () => clearInterval(pollInterval);
  }, []);

  // Timer for Hours simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAllLamps(prevLamps => {
        let changed = false;
        const updated = prevLamps.map(lamp => {
          if (lamp.status) {
            changed = true;
            return { ...lamp, totalHours: lamp.totalHours + (1/60) };
          }
          return lamp;
        });
        if (changed) {
          storageService.saveLamps(updated);
        }
        return updated;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const safeFetch = async (url: string, options?: RequestInit, timeout = 5000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
  };

  const checkLampStatus = async (lamp: Lamp) => {
    if (!lamp.ip || lamp.ip === '0.0.0.0') return;

    try {
      // We are just checking connectivity, but ideally status should return per-pin status.
      // For now, if the ESP is reachable, we assume this lamp's last known status is roughly accurate or we sync
      const response = await safeFetch(`http://${lamp.ip}/status?key=${lamp.secretKey}`, {}, 2000);
      if (response.ok) {
        const data = await response.json();
        // If data returns per-pin status, update it. For now, simplistic check:
        // data.pins could be { "2": "on", "4": "off" }
        let isOn = lamp.status;
        if (data.pins && data.pins[lamp.pin]) {
           isOn = data.pins[lamp.pin] === 'on';
        } else if (data.status) {
           isOn = data.status === 'on';
        }
        
        setAllLamps(prev => prev.map(l => {
          if (l.id === lamp.id) {
             if (l.status !== isOn || !l.isOnline) {
                return { ...l, status: isOn, isOnline: true };
             }
             return { ...l, isOnline: true };
          }
          return l;
        }));
      } else {
        setAllLamps(prev => prev.map(l => l.id === lamp.id ? { ...l, isOnline: false } : l));
      }
    } catch (e) {
      setAllLamps(prev => prev.map(l => l.id === lamp.id ? { ...l, isOnline: false } : l));
    }
  };

  /**
   * Generates Robust Arduino/C++ code for the ESP32
   * Modified to support multiple lamps on one device if needed
   */
  const generateArduinoCode = (lamps: Lamp[]) => {
    if (!lamps || lamps.length === 0) return '';
    const mainLamp = lamps[0];
    const key = mainLamp.secretKey;
    const sanitizedName = mainLamp.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    // Generate pin configuration
    const pinConfig = lamps.map(l => `{ ${l.pin}, ${l.id}, false }`).join(',\n  ');
    
    return `/*
 * Lumina Control - Enterprise ESP32 Firmware
 * ----------------------------------------
 * System: ${mainLamp.name} (Master)
 * Total Devices: ${lamps.length}
 * Pins Used: ${lamps.map(l => l.pin).join(', ')}
 * Features: Multi-Relay Control, Secure Auth, OTA, mDNS
 * ----------------------------------------
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <ArduinoJson.h> // Make sure to install ArduinoJson via Library Manager

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* AUTH_TOKEN = "${key}";
const char* DEVICE_NAME = "lumina-sys-${Math.floor(Math.random()*1000)}";

// --- PIN MAPPING ---
struct LampConfig {
  int pin;
  int id;
  bool state;
};

LampConfig lamps[] = {
  ${pinConfig}
};
const int LAMP_COUNT = ${lamps.length};

WebServer server(80);

// --- SECURITY MIDDLEWARE ---
bool isAuthenticated() {
  if (server.arg("key") == AUTH_TOKEN) return true;
  server.send(401, "application/json", "{\"error\": \"Unauthorized\", \"message\": \"Invalid Secret Key\"}");
  return false;
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  
  // Initialize Pins
  for (int i = 0; i < LAMP_COUNT; i++) {
    pinMode(lamps[i].pin, OUTPUT);
    digitalWrite(lamps[i].pin, LOW); // Default Off
  }

  // 1. WiFi Connection
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\\nWiFi Failed. Continuing offline...");
  }

  // 2. mDNS
  if (MDNS.begin(DEVICE_NAME)) {
    Serial.println("mDNS responder started");
  }

  // 3. OTA
  ArduinoOTA.setHostname(DEVICE_NAME);
  ArduinoOTA.setPassword(AUTH_TOKEN);
  ArduinoOTA.begin();

  // 4. API Endpoints
  
  // GET /status
  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (!isAuthenticated()) return;
    
    // Create JSON response
    // Format: { "status": "ok", "pins": { "2": "on", "4": "off" } }
    String json = "{ \\"status\\": \\"ok\\", \\"rssi\\": " + String(WiFi.RSSI()) + ", \\"pins\\": {";
    for(int i=0; i<LAMP_COUNT; i++) {
       json += "\\"" + String(lamps[i].pin) + "\\": \\"" + (lamps[i].state ? "on" : "off") + "\\"";
       if(i < LAMP_COUNT - 1) json += ", ";
    }
    json += "}}";
    server.send(200, "application/json", json);
  });

  // GET /toggle?pin=X&state=on|off
  server.on("/toggle", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if (!isAuthenticated()) return;
    
    if (!server.hasArg("pin")) {
       server.send(400, "application/json", "{\"error\": \"Missing pin parameter\"}");
       return;
    }

    int targetPin = server.arg("pin").toInt();
    String state = server.arg("state");
    bool found = false;
    bool newState = false;

    for(int i=0; i<LAMP_COUNT; i++) {
       if(lamps[i].pin == targetPin) {
          found = true;
          if (state == "on") lamps[i].state = true;
          else if (state == "off") lamps[i].state = false;
          else lamps[i].state = !lamps[i].state;
          
          digitalWrite(lamps[i].pin, lamps[i].state ? HIGH : LOW);
          newState = lamps[i].state;
          break;
       }
    }

    if (!found) {
       server.send(404, "application/json", "{\"error\": \"Pin not configured\"}");
       return;
    }
    
    String json = "{\"pin\": " + String(targetPin) + ", \"status\": \"" + String(newState ? "on" : "off") + "\", \"success\": true}";
    server.send(200, "application/json", json);
  });

  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  ArduinoOTA.handle();
  server.handleClient();
}`;
  };

  const handleCopyCode = () => {
    // Generate code for ALL lamps owned by this user (or just the selected one if user prefers, but Multi-Relay is better)
    const lampsToGenerate = myLamps; // Generate for all lamps of the current admin
    const code = generateArduinoCode(lampsToGenerate);
    navigator.clipboard.writeText(code);
    addToast('System firmware copied', 'success');
  };

  const handleDownloadCode = () => {
    const lampsToGenerate = myLamps;
    const code = generateArduinoCode(lampsToGenerate);
    const element = document.createElement("a");
    const file = new Blob([code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Lumina_System_${currentUser?.id}.ino`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- AUTHENTICATION ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginIdentifier === 'root' && loginPassword === 'rootpassword') {
        setCurrentUser(ROOT_USER);
        addToast('Welcome, Super Admin', 'success');
        setLoginIdentifier('');
        setLoginPassword('');
        return;
    }
    const foundUser = allUsers.find(
      u => u.username.toLowerCase() === loginIdentifier.toLowerCase() || 
           u.email.toLowerCase() === loginIdentifier.toLowerCase()
    );
    if (foundUser && foundUser.password === loginPassword) {
      setCurrentUser(foundUser);
      addToast(`Welcome back, ${foundUser.username}`, 'success');
      setLoginIdentifier('');
      setLoginPassword('');
    } else {
      addToast('Invalid credentials', 'error');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.username || !regForm.email || !regForm.password) {
      addToast('All fields required', 'error');
      return;
    }
    if (regForm.password !== regForm.confirm) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (allUsers.some(u => u.username.toLowerCase() === regForm.username.toLowerCase())) {
      addToast('Username taken', 'error');
      return;
    }

    const isCreatingSystem = authMode === 'register_admin';
    const creatorId = currentUser ? currentUser.id : undefined;

    const newUserId = Date.now();
    const newUser: User = {
      id: newUserId,
      username: regForm.username,
      email: regForm.email,
      password: regForm.password,
      allowedLamps: [],
      createdAt: new Date().toISOString(),
      role: isCreatingSystem ? 'admin' : 'user',
      createdBy: creatorId
    };

    let updatedLamps = [...allLamps];

    // AUTOMATIC DEFAULT LAMPS FOR NEW ADMINS
    if (isCreatingSystem) {
       const defaultSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
       // Default Lamp 1
       updatedLamps.push({
          id: Date.now() + 1,
          name: 'Living Room',
          ip: '0.0.0.0', // User sets IP later
          secretKey: defaultSecret,
          pin: 2, // Default ESP32 LED/Relay
          status: false,
          isLocked: false,
          totalHours: 0,
          lastTurnedOn: null,
          isOnline: false,
          ownerId: newUserId
       });
       // Default Lamp 2
       updatedLamps.push({
          id: Date.now() + 2,
          name: 'Bedroom',
          ip: '0.0.0.0',
          secretKey: defaultSecret, // Same key for simplicity on one device
          pin: 4, // Secondary Relay
          status: false,
          isLocked: false,
          totalHours: 0,
          lastTurnedOn: null,
          isOnline: false,
          ownerId: newUserId
       });
    }

    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    setAllLamps(updatedLamps);
    storageService.saveUsers(updatedUsers);
    storageService.saveLamps(updatedLamps);
    
    addToast(isCreatingSystem ? 'System Created with Default Devices' : 'User Added', 'success');
    
    if (!currentUser) setCurrentUser(newUser);
    
    setAuthMode('login');
    setRegForm({ username: '', email: '', password: '', confirm: '' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
  };

  // --- ACTIONS ---

  const handleShowCode = (lamp: Lamp) => {
    setSelectedLampForCode(lamp);
    setShowCodeModal(true);
  };

  const handleAddLamp = () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    if (!newLamp.name) {
       addToast('Name required', 'error');
       return;
    }
    
    const lamp: Lamp = {
      id: Date.now(),
      name: newLamp.name,
      ip: newLamp.ip || '0.0.0.0',
      secretKey: newLamp.secretKey || Math.random().toString(36).substring(2, 12).toUpperCase(),
      pin: parseInt(newLamp.pin) || 2,
      status: false,
      isLocked: false,
      totalHours: 0,
      lastTurnedOn: null,
      isOnline: false,
      ownerId: currentUser.id
    };
    
    const updated = [...allLamps, lamp];
    setAllLamps(updated);
    storageService.saveLamps(updated);
    setShowAddModal(false);
    setNewLamp({ name: '', ip: '', secretKey: '', pin: '2' });
    
    addToast('Device Registered', 'success');
    handleShowCode(lamp);
  };

  const toggleLamp = async (lamp: Lamp) => {
    if (lamp.isLocked && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      addToast('Device locked by admin', 'error');
      return;
    }

    const previousLamps = [...allLamps];
    const newStatus = !lamp.status;
    const updatedLamps = allLamps.map(l => 
      l.id === lamp.id ? { ...l, status: newStatus, lastTurnedOn: newStatus ? new Date().toISOString() : l.lastTurnedOn } : l
    );
    setAllLamps(updatedLamps);

    try {
      if (lamp.ip && lamp.ip !== '0.0.0.0' && !lamp.ip.includes('localhost')) {
          // Send PIN in query params so firmware knows which relay to toggle
          await safeFetch(`http://${lamp.ip}/toggle?key=${lamp.secretKey}&state=${newStatus ? 'on' : 'off'}&pin=${lamp.pin}`, {
              mode: 'no-cors',
              method: 'GET'
          });
      } else {
         await new Promise((r) => setTimeout(r, 200));
      }
      storageService.saveLamps(updatedLamps);
    } catch (e) {
      setAllLamps(previousLamps);
      addToast('Connection failed', 'error');
    }
  };

  const toggleLock = (lamp: Lamp) => {
    const updated = allLamps.map(l => l.id === lamp.id ? { ...l, isLocked: !l.isLocked } : l);
    setAllLamps(updated);
    storageService.saveLamps(updated);
  };

  const deleteLamp = (id: number) => {
    if(!window.confirm("Delete device?")) return;
    const updated = allLamps.filter(l => l.id !== id);
    setAllLamps(updated);
    storageService.saveLamps(updated);
    const updatedUsers = allUsers.map(u => ({
      ...u,
      allowedLamps: u.allowedLamps.filter(lId => lId !== id)
    }));
    setAllUsers(updatedUsers);
    storageService.saveUsers(updatedUsers);
  };

  const handleAddUserFromDashboard = () => {
     if (!currentUser) return;
     if (!newUser.username || !newUser.email || !newUser.password) {
       addToast('All fields required', 'error');
       return;
    }
    if (allUsers.some(u => u.username === newUser.username)) { addToast('Username taken', 'error'); return; }

    const u: User = {
      id: Date.now(),
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      allowedLamps: [],
      createdAt: new Date().toISOString(),
      role: 'user',
      createdBy: currentUser.id
    };
    const updated = [...allUsers, u];
    setAllUsers(updated);
    storageService.saveUsers(updated);
    setNewUser({ username: '', email: '', password: '' });
    addToast('User created', 'success');
  };
  
  const handleAddAdminFromDashboard = () => {
     if (!newUser.username || !newUser.email || !newUser.password) {
       addToast('All fields required', 'error');
       return;
    }
    if (allUsers.some(u => u.username === newUser.username)) { addToast('Username taken', 'error'); return; }

    const newId = Date.now();
    const u: User = {
      id: newId,
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      allowedLamps: [],
      createdAt: new Date().toISOString(),
      role: 'admin',
      createdBy: currentUser?.id
    };

    // Default Lamps for this new admin too
    const defaultSecret = Math.random().toString(36).substring(2, 12).toUpperCase();
    const l1: Lamp = {
       id: Date.now() + 1, name: 'Default Link 1', ip: '0.0.0.0', secretKey: defaultSecret, pin: 2, status: false, isLocked: false, totalHours: 0, lastTurnedOn: null, isOnline: false, ownerId: newId
    };
    const l2: Lamp = {
       id: Date.now() + 2, name: 'Default Link 2', ip: '0.0.0.0', secretKey: defaultSecret, pin: 4, status: false, isLocked: false, totalHours: 0, lastTurnedOn: null, isOnline: false, ownerId: newId
    };

    const updatedUsers = [...allUsers, u];
    const updatedLamps = [...allLamps, l1, l2];

    setAllUsers(updatedUsers);
    setAllLamps(updatedLamps);
    storageService.saveUsers(updatedUsers);
    storageService.saveLamps(updatedLamps);

    setNewUser({ username: '', email: '', password: '' });
    addToast('System Admin created with defaults', 'success');
  };

  const deleteUser = (id: number) => {
    if(!window.confirm("Delete user?")) return;
    const updated = allUsers.filter(u => u.id !== id);
    const userToDelete = allUsers.find(u => u.id === id);
    let finalUsers = updated;
    let finalLamps = allLamps;

    if (userToDelete?.role === 'admin') {
        const subUsers = allUsers.filter(u => u.createdBy === id);
        finalUsers = updated.filter(u => u.createdBy !== id); 
        finalLamps = allLamps.filter(l => l.ownerId !== id); 
        addToast(`System deleted along with ${subUsers.length} users and owned devices.`, 'info');
    }

    setAllUsers(finalUsers);
    setAllLamps(finalLamps);
    storageService.saveUsers(finalUsers);
    storageService.saveLamps(finalLamps);
  };

  const openPermsModal = (user: User) => {
    setEditingUser(user);
    setShowPermsModal(true);
  };

  const toggleUserPerm = (lampId: number) => {
    if (!editingUser) return;
    const currentPerms = editingUser.allowedLamps;
    const newPerms = currentPerms.includes(lampId) ? currentPerms.filter(id => id !== lampId) : [...currentPerms, lampId];
    
    const updatedUser = { ...editingUser, allowedLamps: newPerms };
    setEditingUser(updatedUser);
    
    const updatedAll = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    setAllUsers(updatedAll);
    storageService.saveUsers(updatedAll);
  };

  // --- RENDER VIEWS ---

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        <div className="relative w-full max-w-md">
          <div className="flex justify-center mb-8">
             <div className="relative group">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative bg-slate-900 border border-slate-700 p-5 rounded-2xl shadow-2xl">
                   <Shield className="w-12 h-12 text-blue-500" />
                </div>
             </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Lumina Control</h1>
              <p className="text-slate-400">
                {authMode === 'login' && 'Secure Access Terminal'}
                {authMode === 'register_admin' && 'Create System Account'}
                {authMode === 'register_user' && 'User Registration'}
              </p>
            </div>
            
            {authMode !== 'login' ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Username</label>
                  <input
                      type="text"
                      required
                      value={regForm.username}
                      onChange={(e) => setRegForm({...regForm, username: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Email</label>
                  <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Password</label>
                  <input
                      type="password"
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({...regForm, password: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Confirm</label>
                  <input
                      type="password"
                      required
                      value={regForm.confirm}
                      onChange={(e) => setRegForm({...regForm, confirm: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <Button type="submit" className="w-full py-4 text-lg mt-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                  {authMode === 'register_admin' ? 'Launch New System' : 'Create User Account'}
                </Button>
                <div className="text-center pt-2">
                  <button type="button" onClick={() => setAuthMode('login')} className="text-sm text-slate-400 hover:text-white">
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Identity</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Username / Email"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Key</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-5 pr-12 py-4 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full py-4 text-lg mt-4 shadow-xl shadow-blue-900/20">
                  Authenticate
                </Button>
                
                <div className="flex flex-col gap-2 text-center pt-4 border-t border-slate-800 mt-4">
                   <p className="text-xs text-slate-500">New to Lumina?</p>
                   <div className="flex gap-3 justify-center">
                      <button type="button" onClick={() => setAuthMode('register_user')} className="text-sm text-slate-300 hover:text-white transition-colors">
                        Join as User
                      </button>
                      <span className="text-slate-600">|</span>
                      <button type="button" onClick={() => setAuthMode('register_admin')} className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                        Create System
                      </button>
                   </div>
                </div>
              </form>
            )}
          </div>
          {authMode === 'login' && (
             <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-400">System Operational • v3.6</span>
                </div>
             </div>
          )}
        </div>
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map(t => (
            <div key={t.id} className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg animate-in slide-in-from-right-full ${t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- USER VIEW ---
  if (currentUser.role === 'user') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>
        <nav className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-none">Lumina</h1>
              <span className="text-xs text-blue-400 font-medium">Personal Access</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">{currentUser.username}</span>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-slate-800/50 hover:bg-red-500/20 hover:text-red-400 transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </nav>
        <main className="relative z-0 container mx-auto p-6 max-w-6xl">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">My Devices</h2>
          </div>
          {myLamps.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myLamps.map(lamp => (
                <LampCard key={lamp.id} lamp={lamp} onToggle={toggleLamp} variant="user" />
              ))}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                <Shield className="w-12 h-12 text-slate-700 mb-4" />
                <h3 className="text-lg text-slate-300">No Access Granted</h3>
                <p className="text-slate-500">Contact your System Admin.</p>
             </div>
          )}
        </main>
      </div>
    );
  }

  // --- ADMIN & SUPER ADMIN VIEW ---
  
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full ${t.type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-100' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
             <span className="text-sm font-medium">{t.message}</span>
          </div>
        ))}
      </div>

      <aside className={`w-full md:w-72 border-r flex flex-col sticky top-0 h-auto md:h-screen z-40 ${isSuperAdmin ? 'bg-indigo-950/30 border-indigo-500/20' : 'bg-slate-900 border-slate-800'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${isSuperAdmin ? 'bg-indigo-500' : 'bg-blue-600'}`}>
            {isSuperAdmin ? <Globe className="w-5 h-5 text-white" /> : <Zap className="w-5 h-5 text-white" />}
          </div>
          <div>
              <span className="font-bold text-xl tracking-tight text-white block">Lumina</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                 {isSuperAdmin ? 'Super Admin' : 'System Admin'}
              </span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Overview</span>
          </button>
          
          <button onClick={() => setView('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'users' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            {isSuperAdmin ? <Server className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            <span className="font-medium">{isSuperAdmin ? 'Systems' : 'Users'}</span>
          </button>

          {!isSuperAdmin && (
             <button onClick={() => setShowWifiModal(true)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
                <Wifi className="w-5 h-5" />
                <span className="font-medium">Network</span>
             </button>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <div className="mb-4 px-2">
             <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Logged in as</div>
             <div className="text-sm text-white font-medium truncate">{currentUser.username}</div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        
        {view === 'dashboard' && (
          <div className="space-y-6">
            <header className="mb-8">
               <h2 className="text-3xl font-bold text-white mb-2">{isSuperAdmin ? 'Global Network Overview' : 'System Dashboard'}</h2>
               <p className="text-slate-400">
                  {isSuperAdmin 
                    ? `Monitoring ${myUsers.filter(u => u.role === 'admin').length} subsystems and ${allLamps.length} total devices.` 
                    : `Managing ${myLamps.length} devices and ${myUsers.length} users.`}
               </p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Activity className="w-5 h-5" /></div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full">Total</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{isSuperAdmin ? allLamps.length : myLamps.length}</div>
                <div className="text-sm text-slate-400">Devices</div>
              </div>
              
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Zap className="w-5 h-5" /></div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                    {isSuperAdmin 
                        ? allLamps.filter(l => l.status).length 
                        : myLamps.filter(l => l.status).length}
                </div>
                <div className="text-sm text-slate-400">Active Now</div>
              </div>

              {isSuperAdmin && (
                  <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400"><Server className="w-5 h-5" /></div>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{myUsers.filter(u => u.role === 'admin').length}</div>
                    <div className="text-sm text-slate-400">Systems Managed</div>
                  </div>
              )}

              <div className={`col-span-1 ${isSuperAdmin ? 'md:col-span-1' : 'md:col-span-2'}`}>
                 <StatsPanel lamps={isSuperAdmin ? allLamps : myLamps} />
              </div>
            </div>
            
            {!isSuperAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xl font-bold text-white">My Devices</h3>
                     <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Register
                     </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myLamps.map(lamp => (
                      <LampCard 
                        key={lamp.id} 
                        lamp={lamp}
                        onToggle={toggleLamp}
                        onLock={toggleLock}
                        onDelete={deleteLamp}
                        onShowCode={handleShowCode}
                        variant="admin"
                      />
                    ))}
                    {myLamps.length === 0 && (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                            <p className="text-slate-500">No devices registered in this system.</p>
                        </div>
                    )}
                  </div>
                </div>
            )}
            
            {isSuperAdmin && (
               <div>
                  <h3 className="text-xl font-bold text-white mb-4">Registered Systems</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {myUsers.filter(u => u.role === 'admin').map(admin => {
                        const adminLamps = allLamps.filter(l => l.ownerId === admin.id);
                        return (
                           <div key={admin.id} className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl flex items-center justify-between">
                              <div>
                                 <h4 className="font-bold text-white">{admin.username}</h4>
                                 <p className="text-sm text-slate-400">{admin.email}</p>
                                 <div className="flex gap-3 mt-2 text-xs font-mono text-slate-500">
                                    <span>Devices: {adminLamps.length}</span>
                                    <span>Users: {allUsers.filter(u => u.createdBy === admin.id).length}</span>
                                 </div>
                              </div>
                              <button onClick={() => deleteUser(admin.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20">
                                 <LogOut className="w-4 h-4" />
                              </button>
                           </div>
                        )
                     })}
                  </div>
               </div>
            )}
          </div>
        )}

        {view === 'users' && (
          <div className="space-y-6">
            <header className="flex justify-between items-center mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-white">{isSuperAdmin ? 'System Administration' : 'User Management'}</h2>
                 <p className="text-slate-400">
                    {isSuperAdmin ? 'Create and manage independent subsystem admins.' : 'Control access for users in your system.'}
                 </p>
               </div>
            </header>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm mb-6">
               <h3 className="text-lg font-bold text-white mb-4">{isSuperAdmin ? 'Create New System' : 'Register New User'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    type="text" placeholder="Username" className="bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                  />
                  <input 
                    type="email" placeholder="Email" className="bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                  <input 
                    type="password" placeholder="Password" className="bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                  />
                  <Button onClick={isSuperAdmin ? handleAddAdminFromDashboard : handleAddUserFromDashboard}>
                     {isSuperAdmin ? 'Launch System' : 'Create User'}
                  </Button>
               </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50 border-b border-slate-700/50">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-slate-400">Name</th>
                      <th className="p-4 text-sm font-semibold text-slate-400">Role</th>
                      <th className="p-4 text-sm font-semibold text-slate-400">Stats</th>
                      <th className="p-4 text-sm font-semibold text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {myUsers
                      .filter(u => isSuperAdmin ? u.role === 'admin' : u.role === 'user')
                      .map(user => (
                      <tr key={user.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="p-4">
                           <div className="font-medium text-white">{user.username}</div>
                           <div className="text-xs text-slate-500">{user.email}</div>
                        </td>
                        <td className="p-4">
                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {user.role === 'admin' ? 'SYSTEM ADMIN' : 'USER'}
                           </span>
                        </td>
                        <td className="p-4 text-sm text-slate-400">
                           {user.role === 'admin' ? (
                              <span>{allLamps.filter(l => l.ownerId === user.id).length} Devices</span>
                           ) : (
                              <span>{user.allowedLamps.length} Allowed</span>
                           )}
                        </td>
                        <td className="p-4 text-right">
                          {!isSuperAdmin && (
                             <button onClick={() => openPermsModal(user)} className="text-blue-400 hover:text-white mr-4 text-sm">Access</button>
                          )}
                          <button onClick={() => deleteUser(user.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {myUsers.filter(u => isSuperAdmin ? u.role === 'admin' : u.role === 'user').length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        )}

      </main>

      {/* --- MODALS --- */}
      
      {/* Enhanced Code Generation Modal with Tabs */}
      <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} title="Firmware Integration">
         <Tabs 
           tabs={[
             {
               id: 'code',
               label: 'Firmware',
               content: (
                 <div className="space-y-4">
                   <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-300">
                         <p className="font-semibold mb-1">Generated for System: {currentUser?.username}</p>
                         <ul className="list-disc pl-4 space-y-1">
                           <li>Multi-Relay Support (Pins: {myLamps.map(l => l.pin).join(', ')})</li>
                           <li>Authenticated API Endpoints with Pin Targeting</li>
                           <li>OTA & mDNS Enabled</li>
                         </ul>
                      </div>
                   </div>
                   <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                          <span className="text-xs text-slate-500 font-mono">lumina_firmware.ino</span>
                          <div className="flex gap-2">
                             <button onClick={handleCopyCode} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                                <Copy className="w-3 h-3" /> Copy
                             </button>
                             <button onClick={handleDownloadCode} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                                <Download className="w-3 h-3" /> Save .ino
                             </button>
                          </div>
                        </div>
                        <div className="p-4 overflow-x-auto max-h-[300px]">
                          <pre className="text-xs font-mono text-emerald-400 whitespace-pre">{generateArduinoCode(myLamps)}</pre>
                        </div>
                   </div>
                 </div>
               )
             },
             {
               id: 'guide',
               label: 'Setup Guide',
               content: (
                 <div className="space-y-4 text-slate-300">
                   <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                     <BookOpen className="w-6 h-6 text-blue-400" />
                     <div>
                       <h4 className="font-semibold text-white">Multi-Relay Setup</h4>
                       <p className="text-xs text-slate-400">Controls multiple devices from one ESP32.</p>
                     </div>
                   </div>
                   <ol className="list-decimal pl-5 space-y-3 text-sm">
                     <li>
                       <strong className="text-white">Configure WiFi:</strong> Update <code>ssid</code> and <code>password</code> variables.
                     </li>
                     <li>
                       <strong className="text-white">Pin Mapping:</strong> This sketch automatically maps the pins you defined in the dashboard:
                       <div className="flex gap-2 flex-wrap mt-2">
                          {myLamps.map(l => (
                            <span key={l.id} className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700">{l.name} → Pin {l.pin}</span>
                          ))}
                       </div>
                     </li>
                     <li>
                       <strong className="text-white">Upload:</strong> Flash the ESP32.
                     </li>
                     <li>
                       <strong className="text-white">IP Config:</strong> Once connected, enter the ESP32's IP address into the settings of <em>each</em> lamp card on the dashboard (or use the same IP for all if using one board).
                     </li>
                   </ol>
                 </div>
               )
             },
             {
               id: 'troubleshoot',
               label: 'Troubleshooting',
               content: (
                 <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2 font-medium text-white mb-1">
                           <Bug className="w-4 h-4 text-red-400" /> Device Offline?
                        </div>
                        <p className="text-sm text-slate-400 mb-2">Check Serial Monitor. If it says "WiFi Failed", verify SSID/Password.</p>
                      </div>
                      <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2 font-medium text-white mb-1">
                           <Lock className="w-4 h-4 text-amber-400" /> Pin Not Working?
                        </div>
                        <p className="text-sm text-slate-400">Ensure your relay is connected to the correct GPIO pin shown on the card. Some pins (like 34-39) are input-only on ESP32.</p>
                      </div>
                    </div>
                 </div>
               )
             }
           ]}
         />
         <div className="mt-6 pt-4 border-t border-slate-700/50">
           <Button variant="secondary" onClick={() => setShowCodeModal(false)} className="w-full">Done</Button>
         </div>
      </Modal>

      {/* Add Lamp Modal (Admin Only) */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Device">
        <div className="space-y-4">
          <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Device Name" value={newLamp.name} onChange={(e) => setNewLamp({...newLamp, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
             <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="IP Address (Optional)" value={newLamp.ip} onChange={(e) => setNewLamp({...newLamp, ip: e.target.value})} />
             <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="GPIO Pin (e.g. 2)" value={newLamp.pin} onChange={(e) => setNewLamp({...newLamp, pin: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
             <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
             <Button className="flex-1" onClick={handleAddLamp}>Register Device</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermsModal} onClose={() => setShowPermsModal(false)} title="Access Control">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Select devices allowed for <strong>{editingUser?.username}</strong>:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {myLamps.map(lamp => {
               const isAllowed = editingUser?.allowedLamps.includes(lamp.id);
               return (
                 <div key={lamp.id} onClick={() => toggleUserPerm(lamp.id)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isAllowed ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                   <span className={isAllowed ? 'text-white font-medium' : 'text-slate-400'}>{lamp.name}</span>
                   {isAllowed && <CheckCircle className="w-5 h-5 text-blue-400" />}
                 </div>
               );
            })}
          </div>
          <Button className="w-full" onClick={() => setShowPermsModal(false)}>Save Changes</Button>
        </div>
      </Modal>

      {/* Wifi Modal (Admin Only) */}
      <Modal isOpen={showWifiModal} onClose={() => setShowWifiModal(false)} title="Network Configuration">
         <div className="space-y-4">
            <p className="text-sm text-slate-400">Broadcast new credentials to local devices.</p>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="SSID" value={wifiConfig.ssid} onChange={e => setWifiConfig({...wifiConfig, ssid: e.target.value})} />
            <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="Password" value={wifiConfig.password} onChange={e => setWifiConfig({...wifiConfig, password: e.target.value})} />
            <Button onClick={async () => { await new Promise(r => setTimeout(r, 1000)); setShowWifiModal(false); addToast('Config Broadcasted', 'success'); }} className="w-full">Update Network</Button>
         </div>
      </Modal>

    </div>
  );
}
