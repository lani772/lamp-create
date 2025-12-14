
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Wifi, UserPlus, Settings, LogOut, 
  Plus, Eye, EyeOff, LayoutDashboard, Users,
  Activity, Zap, CheckCircle, User as UserIcon, AlertCircle,
  FileCode, Copy, Terminal, Mail, Lock, Server, Globe, ArrowRight, Download, BookOpen, Bug,
  Search, History, CheckSquare, Square, Power, CalendarClock, Trash, Save, Clock, Info, X, Trash2,
  MessageSquare, Inbox, Send, UserCheck, UserX, MonitorPlay, Filter, Network, UserCog, KeyRound, Edit3,
  Cpu, Settings2, Code, Share2
} from 'lucide-react';
import { Lamp, User, ViewState, ToastNotification, WifiConfig, UserRole, ActivityLog, Schedule, SystemRequest, Controller } from './types';
import { storageService } from './services/storage';
import { LampCard } from './components/LampCard';
import { StatsPanel } from './components/StatsPanel';
import { Modal } from './components/ui/Modal';
import { Button } from './components/ui/Button';
import { Tabs } from './components/ui/Tabs';

// Super Admin Root Credentials
const ROOT_USER: User = {
  id: 999999,
  username: 'root',
  email: 'root@lumina.network',
  password: 'admin123', 
  role: 'super_admin',
  allowedLamps: [],
  createdAt: new Date().toISOString()
};

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'join_system' | 'register_admin'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [resetRequiredNewPass, setResetRequiredNewPass] = useState('');
  
  // Registration Form State
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', confirm: '', targetAdmin: '' });

  // App Data State (Global)
  const [allLamps, setAllLamps] = useState<Lamp[]>([]);
  const [allControllers, setAllControllers] = useState<Controller[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [allRequests, setAllRequests] = useState<SystemRequest[]>([]);
  
  // Derived Data (Filtered for current view)
  const [myLamps, setMyLamps] = useState<Lamp[]>([]);
  const [myUsers, setMyUsers] = useState<User[]>([]);
  const [myRequests, setMyRequests] = useState<SystemRequest[]>([]);

  // UI State
  const [view, setView] = useState<ViewState>('dashboard');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [firmwareLang, setFirmwareLang] = useState<'arduino' | 'micropython'>('arduino');
  
  // Filters
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'access' | 'support' | 'username_change' | 'password_reset'>('all');

  // Refs for Polling
  const controllersRef = useRef(allControllers);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Edit Device Modal
  const [showEditDeviceModal, setShowEditDeviceModal] = useState(false);
  const [selectedControllerForEdit, setSelectedControllerForEdit] = useState<Controller | null>(null);
  const [editDeviceLamps, setEditDeviceLamps] = useState<Lamp[]>([]);

  // Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'support' | 'access' | 'password_reset'>('support');
  const [newRequestMessage, setNewRequestMessage] = useState('');
  const [targetAdminInput, setTargetAdminInput] = useState('');
  
  // Profile Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    email: '', 
    newPassword: '', 
    confirmPassword: '', 
    newUsername: '' 
  });
  
  // Edit User Permissions Modal
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Lamp Access Modal
  const [showLampAccessModal, setShowLampAccessModal] = useState(false);
  const [selectedLampForAccess, setSelectedLampForAccess] = useState<Lamp | null>(null);
  
  // Selected items
  const [selectedControllerForCode, setSelectedControllerForCode] = useState<Controller | null>(null);
  const [selectedLampForSchedule, setSelectedLampForSchedule] = useState<Lamp | null>(null);
  const [selectedLampForDetails, setSelectedLampForDetails] = useState<Lamp | null>(null);
  const [newSchedule, setNewSchedule] = useState({ time: '08:00', action: 'on' as 'on'|'off' });

  // Add Device Form State
  const [newController, setNewController] = useState({ name: '', ip: '', secretKey: '', model: 'ESP32' as const });
  const [newLampOutputs, setNewLampOutputs] = useState<{name: string, pin: string}[]>([{ name: 'Light 1', pin: '2' }]);
  
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'viewer' as UserRole });
  const [wifiConfig, setWifiConfig] = useState<WifiConfig>({ ssid: '', password: '', device: 'router' });
  
  // Centralized Error Handler
  const handleError = (error: any, contextMessage: string) => {
    console.error(`[Lumina Error] ${contextMessage}:`, error);
    const msg = error instanceof Error ? error.message : "Connection failed";
    addToast(`${contextMessage}`, 'error'); 
    logAction('Error', `${contextMessage}: ${msg}`, 'error');
  };

  const logAction = (action: string, details: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      user: currentUser?.username || 'System',
      action,
      details,
      type
    };
    const updatedLogs = [newLog, ...activityLogs].slice(0, 100);
    setActivityLogs(updatedLogs);
    storageService.saveLogs(updatedLogs);
  };

  // --- INITIALIZATION & MIGRATION ---
  useEffect(() => {
    const loadedLamps = storageService.getLamps();
    const loadedControllers = storageService.getControllers();
    const loadedUsers = storageService.getUsers();
    const loadedLogs = storageService.getLogs();
    const loadedRequests = storageService.getRequests();
    
    // Migration: Ensure all lamps have a controller
    let migratedLamps = [...loadedLamps];
    let migratedControllers = [...loadedControllers];
    let dataChanged = false;

    // 1. Create controllers for legacy lamps (orphan lamps)
    migratedLamps.forEach(lamp => {
        if (!lamp.controllerId) {
            // Check if a controller with this IP already exists
            let controller = migratedControllers.find(c => c.ip === lamp.ip && c.secretKey === lamp.secretKey);
            
            if (!controller && lamp.ip) {
                // Create new controller wrapper for this lamp
                controller = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: `${lamp.name} Controller`,
                    ip: lamp.ip,
                    secretKey: lamp.secretKey || 'admin',
                    model: 'ESP32',
                    isOnline: false,
                    ownerId: lamp.ownerId || 1
                };
                migratedControllers.push(controller);
            }

            if (controller) {
                lamp.controllerId = controller.id;
                dataChanged = true;
            }
        }
    });

    // 2. Default Admin Migration (Legacy)
    const adminExists = loadedUsers.some(u => u.role === 'admin' || u.role === 'super_admin');
    if (!adminExists) {
         const defaultAdmin: User = {
            id: 1,
            username: 'admin',
            email: 'admin@lumina.local',
            password: 'admin123',
            role: 'admin',
            allowedLamps: [],
            createdAt: new Date().toISOString()
        };
        loadedUsers.push(defaultAdmin);
        storageService.saveUsers(loadedUsers);
    }

    if (dataChanged) {
        storageService.saveLamps(migratedLamps);
        storageService.saveControllers(migratedControllers);
    }

    setAllLamps(migratedLamps);
    setAllControllers(migratedControllers);
    setAllUsers(loadedUsers);
    setActivityLogs(loadedLogs);
    setAllRequests(loadedRequests);
    setApiEndpoint(storageService.getApiEndpoint());
  }, []);

  // Filter Data based on Current User
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'super_admin') {
        setMyLamps(allLamps);
        setMyUsers(allUsers);
        setMyRequests(allRequests);
    } else if (currentUser.role === 'admin') {
        setMyLamps(allLamps.filter(l => l.ownerId === currentUser.id));
        setMyUsers(allUsers.filter(u => u.createdBy === currentUser.id || u.role !== 'super_admin')); 
        setMyRequests(allRequests.filter(r => r.adminId === currentUser.id));
    } else {
        setMyLamps(allLamps.filter(l => currentUser.allowedLamps.includes(l.id)));
        setMyUsers([]);
        setMyRequests([]);
    }
    
    controllersRef.current = allControllers; 
  }, [currentUser, allLamps, allControllers, allUsers, allRequests]);

  // Polling for Status (CONTROLLER BASED)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const controllersToPoll = controllersRef.current;
      controllersToPoll.forEach(controller => {
        if (controller.ip && controller.ip !== '0.0.0.0') {
           checkControllerStatus(controller);
        }
      });
    }, 4000); 

    return () => clearInterval(pollInterval);
  }, []);

  // Timer for Hours simulation and SCHEDULER
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setAllLamps(prevLamps => {
        let changed = false;
        const updated = prevLamps.map(lamp => {
          let modifiedLamp = { ...lamp };
          
          // 1. Simulate Hours
          if (lamp.status) {
            modifiedLamp.totalHours = lamp.totalHours + (1/60);
            changed = true;
          }

          // 2. Scheduler Logic
          if (lamp.schedules && lamp.schedules.length > 0 && !lamp.isLocked) {
             lamp.schedules.forEach(schedule => {
                if (schedule.enabled && schedule.time === currentTime) {
                   if ((schedule.action === 'on' && !lamp.status) || (schedule.action === 'off' && lamp.status)) {
                      const newStatus = schedule.action === 'on';
                      modifiedLamp.status = newStatus;
                      modifiedLamp.lastTurnedOn = newStatus ? now.toISOString() : lamp.lastTurnedOn;
                      changed = true;
                      
                      // Find controller for this lamp to execute command
                      const controller = allControllers.find(c => c.id === lamp.controllerId);
                      if (controller && controller.ip && controller.ip !== '0.0.0.0') {
                         fetch(`http://${controller.ip}/toggle?key=${controller.secretKey}&state=${schedule.action}&pin=${lamp.pin}`, {
                            mode: 'no-cors',
                            method: 'GET'
                         }).catch(e => console.error("Scheduler fetch failed", e));
                      }
                      console.log(`[Scheduler] ${lamp.name} turned ${schedule.action}`);
                   }
                }
             });
          }
          return modifiedLamp;
        });
        
        if (changed) {
          storageService.saveLamps(updated);
        }
        return updated;
      });
    }, 60000); 
    return () => clearInterval(interval);
  }, [allControllers]); // Add allControllers dependency

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

  const checkControllerStatus = async (controller: Controller) => {
    if (!controller.ip || controller.ip === '0.0.0.0') return;

    try {
      const response = await safeFetch(`http://${controller.ip}/status?key=${controller.secretKey}`, {}, 3000);
      
      if (response.ok) {
          // Optimization: Only update controller state if it changed to true
          setAllControllers(prev => prev.map(c => {
              if (c.id === controller.id && !c.isOnline) {
                  return { ...c, isOnline: true };
              }
              return c;
          }));
          
          const data = await response.json(); 

          setAllLamps(prevLamps => {
              let hasChanges = false;
              const newLamps = prevLamps.map(lamp => {
                  if (lamp.controllerId === controller.id) {
                      let isOn = lamp.status;
                      
                      if (data.relays && Array.isArray(data.relays)) {
                          const relay = data.relays.find((r: any) => r.pin === lamp.pin);
                          if (relay) isOn = relay.state;
                      } 
                      else if (data.pins && data.pins[lamp.pin]) {
                          isOn = data.pins[lamp.pin] === 'on';
                      }

                      if (lamp.status !== isOn || !lamp.isOnline) {
                          hasChanges = true;
                          return { ...lamp, status: isOn, isOnline: true };
                      }
                      return { ...lamp, isOnline: true };
                  }
                  return lamp;
              });
              return hasChanges ? newLamps : prevLamps;
          });

      } else {
          setAllControllers(prev => prev.map(c => c.id === controller.id && c.isOnline ? { ...c, isOnline: false } : c));
          setAllLamps(prev => prev.map(l => l.controllerId === controller.id && l.isOnline ? { ...l, isOnline: false } : l));
      }
    } catch (e) {
        setAllControllers(prev => prev.map(c => c.id === controller.id && c.isOnline ? { ...c, isOnline: false } : c));
        setAllLamps(prev => prev.map(l => l.controllerId === controller.id && l.isOnline ? { ...l, isOnline: false } : l));
    }
  };

  const generateFirmware = (controller: Controller, linkedLamps: Lamp[]) => {
      if (firmwareLang === 'micropython') {
          return generateMicroPythonCode(controller, linkedLamps);
      }
      return generateArduinoCode(controller, linkedLamps);
  };

  const generateArduinoCode = (controller: Controller, linkedLamps: Lamp[]) => {
    if (!controller) return '';
    
    const pinsDef = linkedLamps.map(l => `#define RELAY_${l.pin} ${l.pin} // ${l.name}`).join('\n');
    const pinsInit = linkedLamps.map(l => `  pinMode(RELAY_${l.pin}, OUTPUT);\n  digitalWrite(RELAY_${l.pin}, LOW);`).join('\n');
    const pinsStruct = linkedLamps.map(l => `    { ${l.pin}, false }`).join(',\n    ');

    return `/* Lumina Firmware for ${controller.model} (Arduino C++) */
/* Install: ArduinoJson Library */
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h> 

const char* ssid = "${wifiConfig.ssid || 'YOUR_SSID'}";
const char* password = "${wifiConfig.password || 'YOUR_PASSWORD'}";
const char* secretKey = "${controller.secretKey}";

WebServer server(80);

// Pin Definitions
${pinsDef}

struct Relay { int pin; bool state; };
Relay relays[] = { ${pinsStruct} };
const int relayCount = ${linkedLamps.length};

void setup() {
  Serial.begin(115200);
${pinsInit}
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(1000); Serial.println("Connecting..."); }
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/toggle", handleToggle);
  server.begin();
}

void loop() { server.handleClient(); }

void handleRoot() { server.send(200, "text/plain", "Lumina Online"); }

void handleStatus() {
  if (server.arg("key") != secretKey) { server.send(401, "json", "{}"); return; }
  String json = "{ \"status\": \"ok\", \"relays\": [";
  for(int i=0; i<relayCount; i++) {
    json += "{ \"pin\": " + String(relays[i].pin) + ", \"state\": " + (relays[i].state ? "true" : "false") + " }";
    if(i < relayCount - 1) json += ",";
  }
  json += "] }";
  server.send(200, "application/json", json);
}

void handleToggle() {
  if (server.arg("key") != secretKey) { server.send(401, "text/plain", "Unauthorized"); return; }
  int pin = server.arg("pin").toInt();
  String stateStr = server.arg("state");
  bool newState = (stateStr == "on");
  bool found = false;
  for(int i=0; i<relayCount; i++) {
    if(relays[i].pin == pin) {
      relays[i].state = newState;
      digitalWrite(relays[i].pin, newState ? HIGH : LOW);
      found = true;
      break;
    }
  }
  server.send(found ? 200 : 400, "text/plain", found ? (newState ? "ON" : "OFF") : "Invalid Pin");
}`;
  };

  const generateMicroPythonCode = (controller: Controller, linkedLamps: Lamp[]) => {
      if (!controller) return '';
      const pinsInit = linkedLamps.map(l => `p${l.pin} = machine.Pin(${l.pin}, machine.Pin.OUT)\np${l.pin}.value(0)`).join('\n');
      const pinsList = linkedLamps.map(l => `{ "pin": ${l.pin}, "obj": p${l.pin} }`).join(', ');

      return `# Lumina Firmware for ${controller.model} (MicroPython)
import network
import socket
import machine
import json
import time

ssid = '${wifiConfig.ssid || 'YOUR_SSID'}'
password = '${wifiConfig.password || 'YOUR_PASSWORD'}'
secret_key = '${controller.secretKey}'

# Initialize Pins
${pinsInit}
relays = [${pinsList}]

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(ssid, password)

while not wlan.isconnected():
    print('Connecting to WiFi...')
    time.sleep(1)

print('Connected:', wlan.ifconfig())

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(('', 80))
s.listen(5)

while True:
    conn, addr = s.accept()
    request = conn.recv(1024).decode()
    
    # Simple query parser
    params = {}
    if 'GET /toggle' in request or 'GET /status' in request:
        try:
            line = request.split('\\n')[0]
            url = line.split(' ')[1]
            if '?' in url:
                qs = url.split('?')[1]
                for pair in qs.split('&'):
                    k, v = pair.split('=')
                    params[k] = v
        except:
            pass

    key = params.get('key', '')
    
    if key != secret_key:
        conn.send('HTTP/1.1 401 Unauthorized\\n\\n')
        conn.close()
        continue

    if 'GET /status' in request:
        resp = { "status": "ok", "relays": [] }
        for r in relays:
            state = r['obj'].value() == 1
            resp['relays'].append({ "pin": r['pin'], "state": state })
        
        json_resp = json.dumps(resp)
        conn.send('HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + json_resp)

    elif 'GET /toggle' in request:
        pin = int(params.get('pin', -1))
        state = params.get('state', '')
        found = False
        
        for r in relays:
            if r['pin'] == pin:
                r['obj'].value(1 if state == 'on' else 0)
                found = True
                break
        
        if found:
            conn.send('HTTP/1.1 200 OK\\n\\n' + ('ON' if state == 'on' else 'OFF'))
        else:
            conn.send('HTTP/1.1 400 Bad Request\\n\\nInvalid Pin')
    
    else:
        conn.send('HTTP/1.1 200 OK\\n\\nLumina Device Online')

    conn.close()
`;
  };

  const handleCopyCode = () => {
    if(!selectedControllerForCode) return;
    const linkedLamps = allLamps.filter(l => l.controllerId === selectedControllerForCode.id);
    const code = generateFirmware(selectedControllerForCode, linkedLamps);
    navigator.clipboard.writeText(code);
    addToast('Firmware code copied', 'success');
  };

  const handleDownloadCode = () => {
    if(!selectedControllerForCode) return;
    const linkedLamps = allLamps.filter(l => l.controllerId === selectedControllerForCode.id);
    const code = generateFirmware(selectedControllerForCode, linkedLamps);
    const element = document.createElement("a");
    const ext = firmwareLang === 'micropython' ? 'py' : 'ino';
    const file = new Blob([code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Lumina_${selectedControllerForCode.name.replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // --- ACTIONS ---

  const handleRoleChange = (userId: number, newRole: UserRole) => {
      const updatedUsers = allUsers.map(u => u.id === userId ? { ...u, role: newRole } : u);
      setAllUsers(updatedUsers);
      storageService.saveUsers(updatedUsers);
      addToast('User role updated to ' + newRole, 'success');
  };

  const openPermsModal = (user: User) => {
    setEditingUser(user);
    setShowPermsModal(true);
  };

  const toggleUserPerm = (lampId: number) => {
    if (!editingUser) return;
    const hasAccess = editingUser.allowedLamps.includes(lampId);
    const newAllowed = hasAccess 
        ? editingUser.allowedLamps.filter(id => id !== lampId) 
        : [...editingUser.allowedLamps, lampId];
    
    const updatedUser = { ...editingUser, allowedLamps: newAllowed };
    setEditingUser(updatedUser);
    
    const updatedAllUsers = allUsers.map(u => u.id === editingUser.id ? updatedUser : u);
    setAllUsers(updatedAllUsers);
    storageService.saveUsers(updatedAllUsers);
  };

  const toggleUserAccessForLamp = (userId: number, lampId: number) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    const hasAccess = userToUpdate.allowedLamps.includes(lampId);
    const newAllowed = hasAccess 
       ? userToUpdate.allowedLamps.filter(id => id !== lampId) 
       : [...userToUpdate.allowedLamps, lampId];
       
    const updatedUser = { ...userToUpdate, allowedLamps: newAllowed };
    const updatedAllUsers = allUsers.map(u => u.id === userId ? updatedUser : u);
    
    setAllUsers(updatedAllUsers);
    storageService.saveUsers(updatedAllUsers);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginIdentifier === ROOT_USER.username && loginPassword === ROOT_USER.password) {
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
      setProfileForm({ 
        email: foundUser.email, 
        newPassword: '', 
        confirmPassword: '', 
        newUsername: foundUser.username 
      });
      addToast(`Welcome back, ${foundUser.username}`, 'success');
      setLoginIdentifier('');
      setLoginPassword('');
    } else {
      addToast('Invalid credentials', 'error');
    }
  };

  const handlePasswordResetRequired = () => {
     if (!currentUser) return;
     if (!resetRequiredNewPass) { addToast("Password required", 'error'); return; }
     
     const updatedUsers = allUsers.map(u => u.id === currentUser.id ? { ...u, password: resetRequiredNewPass, passwordResetRequired: false } : u);
     setAllUsers(updatedUsers);
     storageService.saveUsers(updatedUsers);
     
     setCurrentUser({ ...currentUser, password: resetRequiredNewPass, passwordResetRequired: false });
     setResetRequiredNewPass('');
     addToast("Password Updated Successfully", 'success');
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.username || !regForm.email || !regForm.password) { addToast('All fields required', 'error'); return; }
    if (regForm.password !== regForm.confirm) { addToast('Passwords do not match', 'error'); return; }
    if (allUsers.some(u => u.username.toLowerCase() === regForm.username.toLowerCase())) { addToast('Username taken', 'error'); return; }

    const isCreatingSystem = authMode === 'register_admin';
    const isJoiningSystem = authMode === 'join_system';
    
    let adminIdToRequest: number | undefined = undefined;

    if (isJoiningSystem) {
       if (!regForm.targetAdmin) {
           addToast('System Admin username/email required', 'error');
           return;
       }
       const targetAdmin = allUsers.find(u => 
           (u.role === 'admin' || u.role === 'super_admin') && 
           (u.username.toLowerCase() === regForm.targetAdmin.toLowerCase() || u.email.toLowerCase() === regForm.targetAdmin.toLowerCase())
       );
       
       if (!targetAdmin) {
           addToast('System Admin not found', 'error');
           return;
       }
       adminIdToRequest = targetAdmin.id;
    }

    const creatorId = currentUser ? currentUser.id : adminIdToRequest;

    const newUserId = Date.now();
    const newUser: User = {
      id: newUserId,
      username: regForm.username,
      email: regForm.email,
      password: regForm.password,
      allowedLamps: [],
      createdAt: new Date().toISOString(),
      role: isCreatingSystem ? 'admin' : 'viewer',
      createdBy: creatorId
    };

    let updatedControllers = [...allControllers];
    let updatedLamps = [...allLamps];

    const updatedUsers = [...allUsers, newUser];
    setAllUsers(updatedUsers);
    setAllLamps(updatedLamps);
    setAllControllers(updatedControllers);
    
    storageService.saveUsers(updatedUsers);
    
    if (isJoiningSystem && adminIdToRequest) {
        const req: SystemRequest = {
            id: Math.random().toString(36).substr(2,9),
            userId: newUserId,
            username: newUser.username,
            adminId: adminIdToRequest,
            type: 'access',
            message: `New user registration request for access to system.`,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        const updatedRequests = [req, ...allRequests];
        setAllRequests(updatedRequests);
        storageService.saveRequests(updatedRequests);
        addToast('Account created & access requested', 'success');
    } else {
        addToast(isCreatingSystem ? 'System Created' : 'User Created', 'success');
    }

    if (!currentUser) {
        setCurrentUser(newUser);
        setProfileForm({ 
            email: newUser.email, 
            newPassword: '', 
            confirmPassword: '', 
            newUsername: newUser.username 
        });
    }
    
    setAuthMode('login');
    setRegForm({ username: '', email: '', password: '', confirm: '', targetAdmin: '' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('dashboard');
  };

  const handleCardClick = (lamp: Lamp) => {
    if (lamp.isLocked && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
         addToast("Device is locked by Admin", 'error');
         return;
    }
    setSelectedLampForDetails(lamp);
    setShowDetailsModal(true);
  };

  const handleShowCode = () => {
    setShowCodeModal(true);
  };
  
  const handleManageSchedule = (lamp: Lamp) => {
    setSelectedLampForSchedule(lamp);
    setShowScheduleModal(true);
  };

  const handleManageAccess = (lamp: Lamp) => {
    setSelectedLampForAccess(lamp);
    setShowLampAccessModal(true);
  };
  
  const handleAddSchedule = () => {
     if (!selectedLampForSchedule) return;
     const schedule: Schedule = {
        id: Math.random().toString(36).substr(2,9),
        time: newSchedule.time,
        action: newSchedule.action,
        enabled: true
     };
     const updated = allLamps.map(l => l.id === selectedLampForSchedule.id ? { ...l, schedules: [...(l.schedules || []), schedule] } : l);
     setAllLamps(updated);
     storageService.saveLamps(updated);
     setSelectedLampForSchedule(updated.find(l => l.id === selectedLampForSchedule.id) || null);
     addToast('Schedule added', 'success');
  };
  
  const handleDeleteSchedule = (scheduleId: string) => {
      if (!selectedLampForSchedule) return;
      const updated = allLamps.map(l => l.id === selectedLampForSchedule.id ? { ...l, schedules: (l.schedules || []).filter(s => s.id !== scheduleId) } : l);
      setAllLamps(updated);
      storageService.saveLamps(updated);
      setSelectedLampForSchedule(updated.find(l => l.id === selectedLampForSchedule.id) || null);
  };

  const handleOpenEditDevice = (controller: Controller) => {
      setSelectedControllerForEdit(controller);
      const lamps = allLamps.filter(l => l.controllerId === controller.id);
      setEditDeviceLamps(JSON.parse(JSON.stringify(lamps))); // Deep copy
      setShowEditDeviceModal(true);
  };

  const handleSaveDeviceConfig = () => {
      if (!selectedControllerForEdit) return;
      
      // Remove deleted lamps from global state
      const existingLampIds = editDeviceLamps.map(l => l.id);
      const lampsToKeep = allLamps.filter(l => l.controllerId !== selectedControllerForEdit.id || existingLampIds.includes(l.id));
      
      // Update or Add lamps
      const finalLamps = [...lampsToKeep];
      editDeviceLamps.forEach(editedLamp => {
          const index = finalLamps.findIndex(l => l.id === editedLamp.id);
          if (index >= 0) {
              finalLamps[index] = editedLamp;
          } else {
              // New lamp added in modal (ID was temporary or needs proper generation if strictly unique)
              finalLamps.push(editedLamp);
          }
      });

      setAllLamps(finalLamps);
      storageService.saveLamps(finalLamps);
      setShowEditDeviceModal(false);
      addToast('Device Configuration Saved', 'success');
  };

  const handleAddDevice = () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!newController.name) { addToast('Controller Name required', 'error'); return; }
    
    // 1. Create Controller
    const controllerId = Math.random().toString(36).substr(2, 9);
    const controller: Controller = {
        id: controllerId,
        name: newController.name,
        ip: newController.ip || '0.0.0.0',
        secretKey: newController.secretKey || Math.random().toString(36).substring(2, 12).toUpperCase(),
        model: newController.model,
        isOnline: false,
        ownerId: currentUser.id
    };

    // 2. Create Lamps for each pin
    const lamps: Lamp[] = newLampOutputs.map((output, idx) => ({
        id: Date.now() + idx,
        name: output.name || `Output ${output.pin}`,
        pin: parseInt(output.pin) || 2,
        controllerId: controllerId,
        status: false,
        isLocked: false,
        totalHours: 0,
        lastTurnedOn: null,
        isOnline: false,
        ownerId: currentUser.id,
        schedules: [],
        ip: controller.ip // Legacy support
    }));

    const updatedControllers = [...allControllers, controller];
    const updatedLamps = [...allLamps, ...lamps];

    setAllControllers(updatedControllers);
    setAllLamps(updatedLamps);
    
    storageService.saveControllers(updatedControllers);
    storageService.saveLamps(updatedLamps);

    setShowAddModal(false);
    setNewController({ name: '', ip: '', secretKey: '', model: 'ESP32' });
    setNewLampOutputs([{ name: 'Light 1', pin: '2' }]);
    addToast('Microcontroller registered with ' + lamps.length + ' outputs', 'success');
  };

  const toggleLamp = async (lamp: Lamp) => {
    if (currentUser?.role === 'viewer') { addToast('View only mode', 'info'); return; }
    if (lamp.isLocked && currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') { addToast('Device locked', 'error'); return; }

    const controller = allControllers.find(c => c.id === lamp.controllerId);
    if (!controller) {
        addToast("Error: Controller not found for this device", 'error');
        return;
    }

    const previousLamps = [...allLamps];
    const newStatus = !lamp.status;
    
    // Optimistic Update
    const updatedLamps = allLamps.map(l => l.id === lamp.id ? { ...l, status: newStatus, lastTurnedOn: newStatus ? new Date().toISOString() : l.lastTurnedOn } : l);
    setAllLamps(updatedLamps);

    try {
      if (controller.ip && controller.ip !== '0.0.0.0' && !controller.ip.includes('localhost')) {
          await safeFetch(`http://${controller.ip}/toggle?key=${controller.secretKey}&state=${newStatus ? 'on' : 'off'}&pin=${lamp.pin}`, {
              mode: 'no-cors',
              method: 'GET'
          });
      }
      storageService.saveLamps(updatedLamps);
    } catch (e) {
      setAllLamps(previousLamps); // Revert on failure
      handleError(e, `Failed to connect to ${controller.name}`);
    }
  };

  const toggleLock = (lamp: Lamp) => {
    const updated = allLamps.map(l => l.id === lamp.id ? { ...l, isLocked: !l.isLocked } : l);
    setAllLamps(updated);
    storageService.saveLamps(updated);
    addToast(lamp.isLocked ? 'Device Unlocked' : 'Device Locked', 'info');
  };

  const deleteLamp = (id: number) => {
    const updated = allLamps.filter(l => l.id !== id);
    setAllLamps(updated);
    storageService.saveLamps(updated);
    const updatedUsers = allUsers.map(u => ({ ...u, allowedLamps: u.allowedLamps.filter(lId => lId !== id) }));
    setAllUsers(updatedUsers);
    storageService.saveUsers(updatedUsers);
    addToast('Output Deleted', 'success');
  };

  const deleteController = (id: string) => {
      if(!window.confirm("Delete Microcontroller? This will remove all associated lamps.")) return;
      
      const updatedControllers = allControllers.filter(c => c.id !== id);
      const updatedLamps = allLamps.filter(l => l.controllerId !== id);
      
      setAllControllers(updatedControllers);
      setAllLamps(updatedLamps);
      
      storageService.saveControllers(updatedControllers);
      storageService.saveLamps(updatedLamps);
      
      addToast('Controller Removed', 'success');
  };

  const handleAddUserFromDashboard = () => {
     if (!currentUser) return;
     if (!newUser.username || !newUser.email || !newUser.password) { addToast('All fields required', 'error'); return; }
     if (allUsers.some(u => u.username === newUser.username)) { addToast('Username taken', 'error'); return; }

    const u: User = {
      id: Date.now(),
      username: newUser.username,
      email: newUser.email,
      password: newUser.password,
      allowedLamps: [],
      createdAt: new Date().toISOString(),
      role: newUser.role || 'viewer',
      createdBy: currentUser.id
    };
    const updated = [...allUsers, u];
    setAllUsers(updated);
    storageService.saveUsers(updated);
    setNewUser({ username: '', email: '', password: '', role: 'viewer' });
    setShowAddUserModal(false);
    addToast('User created', 'success');
  };
  
  const handleAddAdminFromDashboard = () => {
     handleAddUserFromDashboard();
  };
  
  const handleAdminResetPassword = (userId: number) => {
     if (!window.confirm("Reset this user's password? They will be prompted to set a new one on next login.")) return;
     const updated = allUsers.map(u => u.id === userId ? { ...u, passwordResetRequired: true } : u);
     setAllUsers(updated);
     storageService.saveUsers(updated);
     addToast("User password reset flagged", 'info');
  };

  const deleteUser = (id: number) => {
    if(!window.confirm("Delete user?")) return;
    const userToDelete = allUsers.find(u => u.id === id);
    const updated = allUsers.filter(u => u.id !== id);
    let finalUsers = updated;
    let finalLamps = allLamps;

    if (userToDelete?.role === 'admin') {
        finalUsers = updated.filter(u => u.createdBy !== id); 
        finalLamps = allLamps.filter(l => l.ownerId !== id); 
    }

    setAllUsers(finalUsers);
    setAllLamps(finalLamps);
    storageService.saveUsers(finalUsers);
    storageService.saveLamps(finalLamps);
    addToast('User Deleted', 'success');
  };

  // --- REQUESTS LOGIC ---
  const handleSendRequest = () => {
     if (!currentUser || !newRequestMessage) return;
     
     let adminId: number | undefined = currentUser.createdBy;
     
     if (requestType === 'access' && targetAdminInput) {
         const target = allUsers.find(u => 
             (u.role === 'admin' || u.role === 'super_admin') && 
             (u.username.toLowerCase() === targetAdminInput.toLowerCase() || u.email.toLowerCase() === targetAdminInput.toLowerCase())
         );
         if (!target) {
             addToast("Target Admin not found", 'error');
             return;
         }
         adminId = target.id;
     }

     if (!adminId) {
         addToast("No system admin connected", 'error');
         return;
     }

     const req: SystemRequest = {
        id: Math.random().toString(36).substr(2,9),
        userId: currentUser.id,
        username: currentUser.username,
        adminId: adminId,
        type: requestType as any,
        message: newRequestMessage,
        status: 'pending',
        createdAt: new Date().toISOString()
     };
     const updated = [req, ...allRequests];
     setAllRequests(updated);
     storageService.saveRequests(updated);
     setShowRequestModal(false);
     setNewRequestMessage('');
     setTargetAdminInput('');
     addToast('Request sent to admin', 'success');
  };

  const handleUpdateRequestStatus = (reqId: string, status: 'approved' | 'rejected') => {
      const request = allRequests.find(r => r.id === reqId);
      const updatedRequests = allRequests.map(r => r.id === reqId ? { ...r, status } : r);
      setAllRequests(updatedRequests);
      storageService.saveRequests(updatedRequests);
      
      if (status === 'approved' && request) {
          if (request.type === 'username_change' && request.payload) {
              const newName = request.payload;
              if (!allUsers.some(u => u.username === newName && u.id !== request.userId)) {
                  const updatedUsers = allUsers.map(u => u.id === request.userId ? { ...u, username: newName, pendingUsername: undefined } : u);
                  setAllUsers(updatedUsers);
                  storageService.saveUsers(updatedUsers);
                  addToast(`Username changed to ${newName}`, 'success');
              } else {
                  addToast(`New username ${newName} is taken`, 'error');
              }
          }
          else if (request.type === 'password_reset') {
             handleAdminResetPassword(request.userId);
          }
      } else if (status === 'rejected' && request && request.type === 'username_change') {
          const updatedUsers = allUsers.map(u => u.id === request.userId ? { ...u, pendingUsername: undefined } : u);
          setAllUsers(updatedUsers);
          storageService.saveUsers(updatedUsers);
      }

      if (request) {
          logAction(
              'Request Update', 
              `Request from ${request.username} marked as ${status}`, 
              status === 'approved' ? 'success' : 'warning'
          );
      }
      
      addToast(`Request marked as ${status}`, status === 'approved' ? 'success' : 'info');
  };

  // --- PROFILE MANAGEMENT ---
  const handleUpdateProfile = () => {
      if (!currentUser) return;
      let updatedUser = { ...currentUser };
      let changesMade = false;

      if (profileForm.newPassword) {
          if (profileForm.newPassword !== profileForm.confirmPassword) {
              addToast("Passwords do not match", 'error');
              return;
          }
          updatedUser.password = profileForm.newPassword;
          changesMade = true;
          addToast("Password updated", 'success');
      }

      if (profileForm.email && profileForm.email !== currentUser.email) {
          updatedUser.email = profileForm.email;
          changesMade = true;
          addToast("Email updated", 'success');
      }

      if (profileForm.newUsername && profileForm.newUsername !== currentUser.username) {
          if (allUsers.some(u => u.username.toLowerCase() === profileForm.newUsername.toLowerCase() && u.id !== currentUser.id)) {
              addToast("Username already taken", 'error');
              return;
          }

          if (currentUser.createdBy) {
              const req: SystemRequest = {
                id: Math.random().toString(36).substr(2,9),
                userId: currentUser.id,
                username: currentUser.username,
                adminId: currentUser.createdBy,
                type: 'username_change',
                message: `Request to change username from ${currentUser.username} to ${profileForm.newUsername}`,
                status: 'pending',
                createdAt: new Date().toISOString(),
                payload: profileForm.newUsername
             };
             const updatedReqs = [req, ...allRequests];
             setAllRequests(updatedReqs);
             storageService.saveRequests(updatedReqs);
             updatedUser.pendingUsername = profileForm.newUsername;
             changesMade = true;
             addToast("Username change requested (Pending Approval)", 'info');
          } else {
              updatedUser.username = profileForm.newUsername;
              changesMade = true;
              addToast("Username updated", 'success');
          }
      }

      if (changesMade) {
          const updatedAll = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
          setAllUsers(updatedAll);
          storageService.saveUsers(updatedAll);
          setCurrentUser(updatedUser);
          setProfileForm({ ...profileForm, newPassword: '', confirmPassword: '' });
      } else {
          addToast("No changes detected", 'info');
      }
  };

  // --- RENDER HELPERS ---
  const isSuperAdmin = currentUser?.role === 'super_admin'; // Moved declaration up here
  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length; // Moved declaration up here

  const filteredLamps = myLamps.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.ip?.includes(searchTerm)
  );

  const filteredUsers = myUsers
    .filter(u => isSuperAdmin ? u.role === 'admin' : u.role !== 'super_admin')
    .filter(u => 
      u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    );

  
  // Render logic for dashboard (Shared between User/Admin but different components)
  const renderDashboard = () => {
      if (!currentUser) return null; // Safe guard for render
      
      return (
      <div className="space-y-6">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
               <div>
                 <h2 className="text-3xl font-bold text-white mb-2">{isSuperAdmin ? 'Global Network Overview' : 'System Dashboard'}</h2>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search devices..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                   </div>
               </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {/* Stats (Simplified for update) */}
               <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
                 <div className="text-2xl font-bold text-white mb-1">{myLamps.length}</div>
                 <div className="text-sm text-slate-400">Total Outputs</div>
               </div>
               <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
                 <div className="text-2xl font-bold text-white mb-1">{allControllers.filter(c => c.ownerId === currentUser.id && c.isOnline).length}</div>
                 <div className="text-sm text-slate-400">Controllers Online</div>
               </div>
               <div className="col-span-2">
                 <StatsPanel lamps={myLamps} />
               </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-xl font-bold text-white">{isSuperAdmin ? 'All Network Devices' : 'Device Control Center'}</h3>
                       {!isSuperAdmin && (
                         <div className="flex gap-2">
                             <Button onClick={handleShowCode} size="sm" variant="secondary" className="gap-2">
                                <FileCode className="w-4 h-4" /> Firmware
                             </Button>
                             <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-2">
                                <Plus className="w-4 h-4" /> Add Device
                             </Button>
                         </div>
                       )}
                    </div>
                    
                    {/* Render Controllers & Their Lamps */}
                    {allControllers.filter(c => c.ownerId === currentUser.id || isSuperAdmin).map(controller => (
                        <div key={controller.id} className="mb-6 p-4 rounded-3xl bg-slate-900/30 border border-slate-800">
                             <div className="flex items-center justify-between mb-4 px-2">
                                 <div className="flex items-center gap-3">
                                     <div className={`w-3 h-3 rounded-full ${controller.isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                                     <div className="flex flex-col">
                                         <h4 className="text-white font-bold flex items-center gap-2">
                                             <Cpu className="w-4 h-4 text-slate-400" /> {controller.name}
                                         </h4>
                                         <span className="text-[10px] text-slate-500 font-mono">{controller.ip}</span>
                                     </div>
                                 </div>
                                 <div className="flex gap-2">
                                     {!isSuperAdmin && (
                                         <button
                                            onClick={() => handleOpenEditDevice(controller)}
                                            className="text-slate-500 hover:text-blue-400 transition-colors p-2"
                                            title="Configure Pins"
                                         >
                                             <Settings2 className="w-4 h-4" />
                                         </button>
                                     )}
                                     <button 
                                         onClick={() => deleteController(controller.id)}
                                         className="text-slate-500 hover:text-red-400 transition-colors p-2"
                                         title="Remove Controller"
                                     >
                                         <Trash2 className="w-4 h-4" />
                                     </button>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredLamps.filter(l => l.controllerId === controller.id).map(lamp => (
                                    <LampCard 
                                    key={lamp.id} 
                                    lamp={lamp}
                                    onToggle={toggleLamp}
                                    onLock={toggleLock}
                                    onDelete={deleteLamp}
                                    onManageSchedule={handleManageSchedule}
                                    onManageAccess={handleManageAccess}
                                    onClick={handleCardClick}
                                    userRole={currentUser.role}
                                    variant="admin"
                                    ownerName={isSuperAdmin ? allUsers.find(u => u.id === lamp.ownerId)?.username : undefined}
                                    />
                                ))}
                                {filteredLamps.filter(l => l.controllerId === controller.id).length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-600 text-sm border border-dashed border-slate-800 rounded-xl">
                                        No outputs configured for this controller. Click the settings icon to add pins.
                                    </div>
                                )}
                             </div>
                        </div>
                    ))}
                    
                    {/* Legacy/Orphan Lamps */}
                    {filteredLamps.filter(l => !l.controllerId).length > 0 && (
                        <div className="mb-6 p-4 rounded-3xl bg-amber-900/10 border border-amber-900/30">
                            <h4 className="text-amber-500 font-bold mb-4 px-2">Legacy Devices (Please Migrate)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredLamps.filter(l => !l.controllerId).map(lamp => (
                                    <LampCard 
                                    key={lamp.id} 
                                    lamp={lamp}
                                    onToggle={toggleLamp}
                                    onLock={toggleLock}
                                    onDelete={deleteLamp}
                                    onClick={handleCardClick}
                                    userRole={currentUser.role}
                                    variant="admin"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                  </div>

                  {/* Activity Log Panel */}
                  <div className="lg:col-span-1">
                     <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 h-full max-h-[600px] overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4 text-slate-300 font-bold border-b border-white/5 pb-2">
                           <History className="w-4 h-4" /> Activity Log
                        </div>
                        <div className="space-y-3">
                           {activityLogs.slice(0, 15).map(log => (
                              <div key={log.id} className="text-sm border-l-2 border-slate-700 pl-3 py-1 relative">
                                 <div className="flex justify-between items-start">
                                    <span className="font-medium text-slate-200">{log.action}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                 </div>
                                 <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
      </div>
  )};

  // --- VIEW: LOCKED (PASSWORD RESET REQUIRED) ---
  if (currentUser && currentUser.passwordResetRequired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative">
           <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
               <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Lock className="w-8 h-8 text-red-500" />
               </div>
               <h2 className="text-2xl font-bold mb-2">Password Reset Required</h2>
               <p className="text-slate-400 mb-6">Your administrator has required you to change your password before proceeding.</p>
               
               <input 
                  type="password" 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 mb-4 text-white" 
                  placeholder="New Password" 
                  value={resetRequiredNewPass}
                  onChange={e => setResetRequiredNewPass(e.target.value)}
               />
               <Button onClick={handlePasswordResetRequired} className="w-full">Set New Password</Button>
           </div>
        </div>
      );
  }

  if (!currentUser) {
     const isLogin = authMode === 'login';
     const isJoinSystem = authMode === 'join_system';
     const isRegisterAdmin = authMode === 'register_admin';

     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>
           
           <div className="relative z-10 w-full max-w-md p-8">
              <div className="text-center mb-10">
                 <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-4">
                    <Zap className="w-8 h-8 text-white" />
                 </div>
                 <h1 className="text-3xl font-bold tracking-tight mb-2">Lumina Control</h1>
                 <p className="text-slate-400">
                    {isLogin ? 'Sign in to your control center' : isRegisterAdmin ? 'Deploy new system controller' : 'Request access to an existing system'}
                 </p>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                 {isLogin ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" placeholder="Username or Email" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} />
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                        <Button type="submit" className="w-full py-4 text-lg">Login</Button>
                    </form>
                 ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        {isJoinSystem && (
                             <div className="relative">
                                <span className="absolute left-4 top-4 text-slate-500"><Network className="w-5 h-5" /></span>
                                <input 
                                    className="w-full p-4 pl-12 rounded-xl bg-slate-950/50 border border-indigo-500/50 focus:border-indigo-500 outline-none transition-all" 
                                    placeholder="System Admin (Username or Email)" 
                                    value={regForm.targetAdmin} 
                                    onChange={e => setRegForm({...regForm, targetAdmin: e.target.value})} 
                                    required={isJoinSystem}
                                />
                             </div>
                        )}
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" placeholder="Username" value={regForm.username} onChange={e => setRegForm({...regForm, username: e.target.value})} />
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" type="email" placeholder="Email Address" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} />
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" type="password" placeholder="Password" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
                        <input className="w-full p-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:border-indigo-500 outline-none transition-all" type="password" placeholder="Confirm Password" value={regForm.confirm} onChange={e => setRegForm({...regForm, confirm: e.target.value})} />
                        <Button type="submit" className={`w-full py-4 text-lg ${isRegisterAdmin ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            {isRegisterAdmin ? 'Create System' : 'Request Access'}
                        </Button>
                    </form>
                 )}

                 <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-400">
                    {isLogin ? (
                        <>
                           <button onClick={() => setAuthMode('join_system')} className="hover:text-white transition-colors">
                               New User? <span className="text-blue-400 font-medium">Join a System</span>
                           </button>
                           <div className="flex items-center gap-2 justify-center my-1 opacity-50">
                               <div className="h-px w-12 bg-slate-700"></div>
                               <span className="text-xs">OR</span>
                               <div className="h-px w-12 bg-slate-700"></div>
                           </div>
                           <button onClick={() => setAuthMode('register_admin')} className="flex items-center justify-center gap-2 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                               <MonitorPlay className="w-4 h-4 text-indigo-400" />
                               <span>Deploy New System</span>
                           </button>
                        </>
                    ) : (
                        <button onClick={() => {
                            setAuthMode('login');
                            setRegForm({ username: '', email: '', password: '', confirm: '', targetAdmin: '' });
                        }} className="hover:text-white transition-colors">
                            Already have an account? <span className="text-blue-400 font-medium">Login</span>
                        </button>
                    )}
                 </div>
              </div>
           </div>

           {/* Toasts */}
           <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg ${t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
                {t.message}
                </div>
            ))}
           </div>
        </div>
     )
  }

  // --- USER VIEW (Viewer/Operator/User) ---
  if (!['admin', 'super_admin'].includes(currentUser.role)) {
    // Group lamps by owner for multi-admin view
    const lampsByOwner = myLamps.reduce((acc, lamp) => {
        const ownerId = lamp.ownerId || 0;
        if (!acc[ownerId]) acc[ownerId] = [];
        acc[ownerId].push(lamp);
        return acc;
    }, {} as Record<number, Lamp[]>);
    
    const ownerIds = Object.keys(lampsByOwner);
    const hasMultipleSystems = ownerIds.length > 1;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
        
        <nav className="relative z-10 px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white tracking-tight">Lumina</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {currentUser.createdBy && (
                 <button onClick={() => { setRequestType('support'); setShowRequestModal(true); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-sm font-medium">
                    <MessageSquare className="w-4 h-4" /> Support
                 </button>
             )}
            <div className="hidden sm:flex flex-col items-end cursor-pointer" onClick={() => setShowProfileModal(true)}>
                <span className="text-sm font-medium text-white flex items-center gap-1">
                    {currentUser.username} {currentUser.pendingUsername && <span className="text-[10px] text-amber-500 italic">(pending)</span>}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{currentUser.role}</span>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </nav>

        <main className="relative z-0 container mx-auto p-6 max-w-6xl">
          <div className="mb-8 flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Control Center</h2>
                <p className="text-slate-400">Manage your connected environment.</p>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => { setRequestType('access'); setShowRequestModal(true); }} variant="secondary" size="sm" className="gap-2">
                    <Network className="w-4 h-4" /> Link System
                </Button>
                <Button onClick={() => setShowProfileModal(true)} variant="secondary" size="sm" className="gap-2">
                    <UserCog className="w-4 h-4" /> Profile
                </Button>
            </div>
          </div>

          <div className="space-y-12">
            {ownerIds.map((ownerIdStr) => {
                const ownerId = parseInt(ownerIdStr);
                const owner = allUsers.find(u => u.id === ownerId);
                const lamps = lampsByOwner[ownerId];
                
                return (
                    <div key={ownerId} className={hasMultipleSystems ? "bg-slate-900/20 p-6 rounded-3xl border border-white/5" : ""}>
                        {hasMultipleSystems && (
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Server className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{owner?.username || 'Unknown System'}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">System Admin</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {lamps.map(lamp => (
                            <LampCard 
                                key={lamp.id} 
                                lamp={lamp} 
                                onToggle={toggleLamp}
                                onClick={handleCardClick}
                                variant="user" 
                                userRole={currentUser.role}
                            />
                            ))}
                        </div>
                    </div>
                );
            })}
          </div>

            {myLamps.length === 0 && (
             <div className="py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-lg text-slate-300">No Access Granted</h3>
                <p className="text-slate-500">Contact your System Admin to approve your request.</p>
             </div>
          )}
        </main>
        
        {/* Lamp Details Modal for User */}
        <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Device Details">
            {selectedLampForDetails && (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{selectedLampForDetails.name}</h3>
                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${selectedLampForDetails.status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {selectedLampForDetails.status ? 'Active' : 'Off'}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block text-xs">IP Address</span>
                                <span className="font-mono text-slate-300">{selectedLampForDetails.ip}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs">Runtime</span>
                                <span className="text-slate-300">{Math.floor(selectedLampForDetails.totalHours)}h {Math.round((selectedLampForDetails.totalHours % 1) * 60)}m</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block text-xs">Last Active</span>
                                <span className="text-slate-300">{selectedLampForDetails.lastTurnedOn ? new Date(selectedLampForDetails.lastTurnedOn).toLocaleString() : 'Never'}</span>
                            </div>
                             <div>
                                <span className="text-slate-500 block text-xs">GPIO Pin</span>
                                <span className="font-mono text-slate-300">{selectedLampForDetails.pin}</span>
                            </div>
                        </div>
                    </div>
                    
                    {selectedLampForDetails.schedules && selectedLampForDetails.schedules.length > 0 && (
                        <div className="border-t border-slate-700 pt-4">
                            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><CalendarClock className="w-4 h-4"/> Automation Schedules</h4>
                             <div className="space-y-2">
                                {selectedLampForDetails.schedules.map(s => (
                                    <div key={s.id} className="flex justify-between text-sm p-2 bg-slate-800 rounded border border-slate-700/50">
                                        <span className="text-white font-mono">{s.time}</span>
                                        <span className={s.action === 'on' ? 'text-green-400' : 'text-red-400'}>Turn {s.action.toUpperCase()}</span>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>

        {/* User Request Modal */}
        <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} title={requestType === 'access' ? 'Link New System' : 'Contact Support'}>
            <div className="space-y-4">
                <p className="text-sm text-slate-400">
                    {requestType === 'access' 
                        ? 'Enter the username of the System Admin you want to access.' 
                        : 'Describe your issue or request.'}
                </p>
                
                {requestType === 'access' && (
                     <div className="space-y-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Target System Admin</label>
                        <input 
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Admin Username"
                            value={targetAdminInput}
                            onChange={e => setTargetAdminInput(e.target.value)}
                        />
                     </div>
                )}
                
                <textarea 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    placeholder="Message to Admin..."
                    value={newRequestMessage}
                    onChange={e => setNewRequestMessage(e.target.value)}
                />
                <Button onClick={handleSendRequest} className="w-full">
                    <Send className="w-4 h-4 mr-2" /> Send Request
                </Button>
            </div>
        </Modal>
        
        {/* Profile Modal */}
        <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="My Profile">
             <div className="space-y-6">
                 <div className="space-y-3">
                     <label className="text-xs text-slate-500 uppercase font-bold">Personal Info</label>
                     <input 
                        type="text" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" 
                        placeholder="Username" 
                        value={profileForm.newUsername}
                        onChange={e => setProfileForm({...profileForm, newUsername: e.target.value})}
                     />
                     <input 
                        type="email" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" 
                        placeholder="Email" 
                        value={profileForm.email}
                        onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                     />
                 </div>
                 
                 <div className="space-y-3 pt-4 border-t border-slate-700">
                     <label className="text-xs text-slate-500 uppercase font-bold flex items-center gap-2"><Lock className="w-3 h-3"/> Change Password</label>
                     <input 
                        type="password" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" 
                        placeholder="New Password" 
                        value={profileForm.newPassword}
                        onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})}
                     />
                     <input 
                        type="password" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white" 
                        placeholder="Confirm Password" 
                        value={profileForm.confirmPassword}
                        onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                     />
                 </div>
                 
                 <Button onClick={handleUpdateProfile} className="w-full">Update Profile</Button>
                 
                 <div className="text-xs text-slate-500 text-center">
                    Note: Changing username requires Admin approval.
                 </div>
             </div>
        </Modal>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map(t => (
                <div key={t.id} className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg ${t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
                {t.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {t.message}
                </div>
            ))}
        </div>
      </div>
    );
  }

  // --- ADMIN & SUPER ADMIN VIEW ---
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl border flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full ${t.type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-100' : 'bg-slate-800/90 border-slate-700 text-white'}`}>
             {t.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
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
                 {isSuperAdmin ? 'Super Admin' : 'Admin Console'}
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
             <button onClick={() => setView('requests')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'requests' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <div className="relative">
                    <Inbox className="w-5 h-5" />
                    {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                </div>
                <span className="font-medium flex-1 text-left">Requests</span>
                {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{pendingRequestsCount}</span>
                )}
             </button>
          )}

          <button onClick={() => setShowSettingsModal(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-white/5 hover:text-white`}>
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        
        {view === 'dashboard' && renderDashboard()}

        {view === 'users' && (
          <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-white">{isSuperAdmin ? 'System Administration' : 'User Management'}</h2>
                 <p className="text-slate-400">
                    {isSuperAdmin ? 'Manage system admins.' : 'Control user access permissions.'}
                 </p>
               </div>
               <div className="flex gap-3">
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-64 bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                   </div>
                   <Button onClick={() => setShowAddUserModal(true)} className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> {isSuperAdmin ? 'New System' : 'Add User'}
                   </Button>
               </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <div key={user.id} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm hover:bg-slate-800/60 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg relative">
                                {user.username.charAt(0).toUpperCase()}
                                {user.pendingUsername && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-tight">{user.username}</h3>
                                {user.pendingUsername && <span className="text-[10px] text-amber-500 block">Req: {user.pendingUsername}</span>}
                            </div>
                        </div>
                        {/* New Role Selector for Admin */}
                        {!isSuperAdmin ? (
                            <select 
                                className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-slate-900 border border-slate-700 outline-none focus:border-blue-500 ${
                                    user.role === 'admin' ? 'text-indigo-400' : 'text-blue-400'
                                }`}
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            >
                                <option value="viewer">Viewer</option>
                                <option value="user">User</option>
                                <option value="operator">Operator</option>
                                <option value="admin">Admin</option>
                            </select>
                        ) : (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                                {user.role}
                            </div>
                        )}
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-6 flex items-center gap-2"><Mail className="w-3 h-3"/> {user.email}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Access</span>
                            <span className="text-white font-medium">{user.allowedLamps.length} Devices</span>
                        </div>
                        
                        <div className="flex gap-2">
                            {!isSuperAdmin && (
                                <button 
                                    onClick={() => handleAdminResetPassword(user.id)}
                                    className="p-2 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all"
                                    title="Reset Password"
                                >
                                    <KeyRound className="w-4 h-4" />
                                </button>
                            )}
                            {!isSuperAdmin && (
                                <button 
                                    onClick={() => openPermsModal(user)} 
                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                                    title="Manage Permissions"
                                >
                                    <Shield className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => deleteUser(user.id)} 
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                title="Delete User"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                 <div className="col-span-full py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg text-slate-300">No Users Found</h3>
                    <p className="text-slate-500">Add a user to get started.</p>
                 </div>
              )}
            </div>
          </div>
        )}

        {view === 'requests' && !isSuperAdmin && (
            <div className="space-y-6">
                <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">User Requests</h2>
                        <p className="text-slate-400">Manage support, access, and account change requests.</p>
                    </div>
                    <div className="flex gap-3">
                        <select 
                            value={requestStatusFilter} 
                            onChange={(e) => setRequestStatusFilter(e.target.value as any)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                        <select 
                            value={requestTypeFilter} 
                            onChange={(e) => setRequestTypeFilter(e.target.value as any)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="support">Support</option>
                            <option value="access">Access</option>
                            <option value="username_change">Profile Changes</option>
                        </select>
                    </div>
                </header>

                <div className="grid gap-4">
                    {(() => {
                        const filteredRequests = myRequests
                            .filter(req => requestStatusFilter === 'all' || req.status === requestStatusFilter)
                            .filter(req => requestTypeFilter === 'all' || req.type === requestTypeFilter)
                            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        if (filteredRequests.length === 0) {
                             return (
                                <div className="py-20 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                                    <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <h3 className="text-lg text-slate-300">No Requests Found</h3>
                                    <p className="text-slate-500">Try adjusting your filters.</p>
                                </div>
                            );
                        }

                        return filteredRequests.map(req => (
                            <div key={req.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                            req.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                            req.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                        }`}>
                                            {req.status}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(req.createdAt).toLocaleString()}</span>
                                        <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 rounded">{req.type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                                            {req.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-white">{req.username}</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                                        {req.message}
                                    </p>
                                </div>
                                
                                {req.status === 'pending' && (
                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px]">
                                        <Button onClick={() => handleUpdateRequestStatus(req.id, 'approved')} size="sm" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/50">
                                            <CheckCircle className="w-4 h-4 mr-2" /> {req.type === 'username_change' ? 'Approve' : 'Resolve'}
                                        </Button>
                                        <Button onClick={() => handleUpdateRequestStatus(req.id, 'rejected')} size="sm" variant="danger">
                                            <X className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ));
                    })()}
                </div>
            </div>
        )}

      </main>

      {/* --- MODALS --- */}
      
      {/* Details Modal (Shared logic with user view) */}
      <Modal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} title="Device Details">
            {selectedLampForDetails && (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">{selectedLampForDetails.name}</h3>
                            <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${selectedLampForDetails.status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {selectedLampForDetails.status ? 'Active' : 'Off'}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500 block text-xs">Runtime</span>
                                <span className="text-slate-300">{Math.floor(selectedLampForDetails.totalHours)}h</span>
                            </div>
                             <div>
                                <span className="text-slate-500 block text-xs">GPIO Pin</span>
                                <span className="font-mono text-slate-300">{selectedLampForDetails.pin}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={showAddUserModal} onClose={() => setShowAddUserModal(false)} title={isSuperAdmin ? 'New System' : 'Add User'}>
          <div className="space-y-4">
               <input 
                  type="text" placeholder="Username" className="w-full bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
               />
               <input 
                  type="email" placeholder="Email" className="w-full bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
               />
               <input 
                  type="password" placeholder="Password" className="w-full bg-slate-900 border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
               />
               {!isSuperAdmin && (
                   <select 
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                     value={newUser.role}
                     onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                   >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                   </select>
               )}
               <Button onClick={isSuperAdmin ? handleAddAdminFromDashboard : handleAddUserFromDashboard} className="w-full h-[48px]">
                  {isSuperAdmin ? 'Launch System' : 'Create Account'}
               </Button>
          </div>
      </Modal>

      {/* Add Device/Controller Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Register Microcontroller">
        <div className="space-y-6">
          <div className="space-y-3">
             <label className="text-xs font-bold text-slate-500 uppercase">Controller Details</label>
             <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="Controller Name (e.g. Living Room ESP)" value={newController.name} onChange={(e) => setNewController({...newController, name: e.target.value})} />
             <div className="grid grid-cols-2 gap-4">
                <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" placeholder="IP Address (e.g. 192.168.1.100)" value={newController.ip} onChange={(e) => setNewController({...newController, ip: e.target.value})} />
                <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newController.model} onChange={(e) => setNewController({...newController, model: e.target.value as any})}>
                    <option value="ESP32">ESP32</option>
                    <option value="ESP8266">ESP8266</option>
                </select>
             </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-slate-500 uppercase">Output Configuration (Lamps/Relays)</label>
                 <span className="text-xs text-slate-600">{newLampOutputs.length} Pins</span>
             </div>
             
             <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                 {newLampOutputs.map((output, idx) => (
                     <div key={idx} className="flex gap-2">
                         <input 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                            placeholder="Output Name" 
                            value={output.name}
                            onChange={e => {
                                const newOutputs = [...newLampOutputs];
                                newOutputs[idx].name = e.target.value;
                                setNewLampOutputs(newOutputs);
                            }}
                         />
                         <input 
                            className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                            placeholder="GPIO" 
                            value={output.pin}
                            onChange={e => {
                                const newOutputs = [...newLampOutputs];
                                newOutputs[idx].pin = e.target.value;
                                setNewLampOutputs(newOutputs);
                            }}
                         />
                         <button 
                            className="p-2 text-slate-500 hover:text-red-400" 
                            onClick={() => setNewLampOutputs(newLampOutputs.filter((_, i) => i !== idx))}
                         >
                            <Trash className="w-4 h-4" />
                         </button>
                     </div>
                 ))}
             </div>
             
             <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                    if (newLampOutputs.length < 16) {
                        setNewLampOutputs([...newLampOutputs, { name: `Light ${newLampOutputs.length + 1}`, pin: '' }]);
                    } else {
                        addToast("Maximum 16 outputs per controller", 'error');
                    }
                }} 
                className="w-full"
            >
                 <Plus className="w-4 h-4 mr-2" /> Add Output Pin
             </Button>
          </div>

          <Button className="w-full" onClick={handleAddDevice}>Register Controller</Button>
        </div>
      </Modal>

      {/* Edit Device Configuration Modal (Add/Remove Pins on Existing) */}
      <Modal isOpen={showEditDeviceModal} onClose={() => setShowEditDeviceModal(false)} title={`Configure ${selectedControllerForEdit?.name}`}>
          <div className="space-y-6">
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                     <label className="text-xs font-bold text-slate-500 uppercase">Outputs/Pins</label>
                     <span className="text-xs text-slate-600">Changes auto-update on save</span>
                 </div>
                 
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                     {editDeviceLamps.map((lamp, idx) => (
                         <div key={idx} className="flex gap-2">
                             <input 
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                                placeholder="Output Name" 
                                value={lamp.name}
                                onChange={e => {
                                    const newLamps = [...editDeviceLamps];
                                    newLamps[idx].name = e.target.value;
                                    setEditDeviceLamps(newLamps);
                                }}
                             />
                             <input 
                                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" 
                                placeholder="GPIO" 
                                value={lamp.pin}
                                onChange={e => {
                                    const newLamps = [...editDeviceLamps];
                                    newLamps[idx].pin = parseInt(e.target.value) || 0;
                                    setEditDeviceLamps(newLamps);
                                }}
                             />
                             <button 
                                className="p-2 text-slate-500 hover:text-red-400" 
                                onClick={() => {
                                    if(window.confirm("Remove this output?")) {
                                        setEditDeviceLamps(editDeviceLamps.filter((_, i) => i !== idx));
                                    }
                                }}
                             >
                                <Trash className="w-4 h-4" />
                             </button>
                         </div>
                     ))}
                 </div>
                 
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                        if (editDeviceLamps.length < 16) {
                            const newLamp: Lamp = {
                                id: Date.now(),
                                name: `Output ${editDeviceLamps.length + 1}`,
                                pin: 0,
                                controllerId: selectedControllerForEdit?.id,
                                status: false,
                                isLocked: false,
                                totalHours: 0,
                                lastTurnedOn: null,
                                isOnline: false,
                                ownerId: currentUser?.id
                            };
                            setEditDeviceLamps([...editDeviceLamps, newLamp]);
                        } else {
                            addToast("Maximum 16 outputs per controller", 'error');
                        }
                    }} 
                    className="w-full"
                >
                     <Plus className="w-4 h-4 mr-2" /> Add Output Pin
                 </Button>
              </div>
              <Button className="w-full" onClick={handleSaveDeviceConfig}>Save Configuration</Button>
          </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={showPermsModal} onClose={() => setShowPermsModal(false)} title="Access Control">
        <div className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {myLamps.map(lamp => {
               const isAllowed = editingUser?.allowedLamps.includes(lamp.id);
               return (
                 <div key={lamp.id} onClick={() => toggleUserPerm(lamp.id)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isAllowed ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                   <span className={isAllowed ? 'text-white' : 'text-slate-400'}>{lamp.name}</span>
                   {isAllowed && <CheckCircle className="w-5 h-5 text-blue-400" />}
                 </div>
               );
            })}
          </div>
          <Button className="w-full" onClick={() => setShowPermsModal(false)}>Save</Button>
        </div>
      </Modal>

      <Modal isOpen={showLampAccessModal} onClose={() => setShowLampAccessModal(false)} title={`Manage Access: ${selectedLampForAccess?.name}`}>
         <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                {myUsers.filter(u => u.role !== 'admin' && u.role !== 'super_admin').map(user => {
                    const hasAccess = user.allowedLamps.includes(selectedLampForAccess?.id || 0);
                    return (
                        <div key={user.id} onClick={() => selectedLampForAccess && toggleUserAccessForLamp(user.id, selectedLampForAccess.id)} 
                             className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${hasAccess ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-900/50 border-slate-700'}`}
                        >
                           <span className={hasAccess ? 'text-white' : 'text-slate-400'}>{user.username}</span>
                           {hasAccess && <CheckCircle className="w-5 h-5 text-blue-400" />}
                        </div>
                    );
                })}
            </div>
            <Button className="w-full" onClick={() => setShowLampAccessModal(false)}>Done</Button>
         </div>
      </Modal>
      
      <Modal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} title="Generate Firmware">
        <div className="space-y-6">
            {!selectedControllerForCode ? (
                <div className="space-y-3">
                    <p className="text-sm text-slate-400">Select a microcontroller to generate firmware for:</p>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {allControllers.filter(c => c.ownerId === currentUser?.id).map(controller => (
                            <button 
                                key={controller.id}
                                onClick={() => setSelectedControllerForCode(controller)}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors text-left"
                            >
                                <div>
                                    <div className="text-white font-medium">{controller.name}</div>
                                    <div className="text-xs text-slate-500">{controller.model} • {controller.ip}</div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                             <h4 className="text-white font-bold">{selectedControllerForCode.name} Firmware</h4>
                             <button onClick={() => setSelectedControllerForCode(null)} className="text-xs text-blue-400 hover:underline text-left">Change Device</button>
                         </div>
                         <select 
                            className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-2 py-1 text-white outline-none focus:ring-1 focus:ring-blue-500"
                            value={firmwareLang}
                            onChange={(e) => setFirmwareLang(e.target.value as any)}
                         >
                             <option value="arduino">Arduino IDE (C++)</option>
                             <option value="micropython">MicroPython</option>
                         </select>
                     </div>
                     
                     <div className="relative">
                         <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto max-h-60 border border-slate-800 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                             {generateFirmware(selectedControllerForCode, allLamps.filter(l => l.controllerId === selectedControllerForCode.id))}
                         </pre>
                         <button 
                            onClick={handleCopyCode}
                            className="absolute top-2 right-2 p-2 bg-slate-800 rounded hover:bg-slate-700 text-slate-300"
                            title="Copy to Clipboard"
                         >
                             <Copy className="w-4 h-4" />
                         </button>
                     </div>

                    <div className="flex gap-2">
                        <Button onClick={handleDownloadCode} variant="primary" className="w-full">
                            <Download className="w-4 h-4 mr-2" /> Download .{firmwareLang === 'micropython' ? 'py' : 'ino'}
                        </Button>
                    </div>
                    
                    <div className="text-[10px] text-slate-500 text-center">
                        This firmware is auto-configured with your WiFi credentials and secret key.
                        <br/>Flash it directly to your device.
                    </div>
                </div>
            )}
        </div>
      </Modal>

      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Automation">
         <div className="space-y-4">
               <div className="flex gap-3 items-end">
                  <input type="time" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newSchedule.time} onChange={e => setNewSchedule({...newSchedule, time: e.target.value})} />
                  <select className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={newSchedule.action} onChange={e => setNewSchedule({...newSchedule, action: e.target.value as 'on'|'off'})}>
                        <option value="on">Turn ON</option>
                        <option value="off">Turn OFF</option>
                     </select>
                  <Button onClick={handleAddSchedule}>Add</Button>
               </div>
               <div className="space-y-2">
                   {selectedLampForSchedule?.schedules?.map(s => (
                       <div key={s.id} className="flex justify-between items-center p-2 bg-slate-800 rounded border border-slate-700">
                           <span className="text-white">{s.time} - {s.action.toUpperCase()}</span>
                           <button onClick={() => handleDeleteSchedule(s.id)} className="text-red-400 hover:text-red-300"><Trash className="w-4 h-4" /></button>
                       </div>
                   ))}
               </div>
         </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="System Configuration">
          <div className="space-y-6">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
                  <h4 className="text-white font-medium flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-blue-400" /> Wi-Fi Setup
                  </h4>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Device Mode</label>
                          <select 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                              value={wifiConfig.device}
                              onChange={(e) => setWifiConfig({...wifiConfig, device: e.target.value as any})}
                          >
                              <option value="router">Router Connection (Station)</option>
                              <option value="phone">Smartphone Hotspot</option>
                              <option value="direct">Direct Access Point (AP)</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SSID (Network Name)</label>
                          <input 
                              type="text" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="MyHomeNetwork"
                              value={wifiConfig.ssid}
                              onChange={(e) => setWifiConfig({...wifiConfig, ssid: e.target.value})}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                          <input 
                              type="password" 
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="••••••••"
                              value={wifiConfig.password}
                              onChange={(e) => setWifiConfig({...wifiConfig, password: e.target.value})}
                          />
                      </div>
                  </div>
              </div>
              
              <Button className="w-full" onClick={() => {
                  addToast('Settings Saved', 'success');
                  setShowSettingsModal(false);
              }}>Save Configuration</Button>
          </div>
      </Modal>

    </div>
  );
}
