
import React, { useEffect, useState } from 'react';
import { Lamp, UserRole } from '../types';
import { Power, Lock, Unlock, Settings2, Trash2, Clock, Wifi, WifiOff, User, Calendar, FileCode, RefreshCw } from 'lucide-react';

interface LampCardProps {
  lamp: Lamp;
  onToggle: (lamp: Lamp) => void;
  onLock?: (lamp: Lamp) => void;
  onEdit?: (lamp: Lamp) => void;
  onDelete?: (id: number) => void;
  onShowCode?: (lamp: Lamp) => void;
  onRegenerateKey?: (lamp: Lamp) => void;
  onManageSchedule?: (lamp: Lamp) => void;
  onManageAccess?: (lamp: Lamp) => void;
  onClick?: (lamp: Lamp) => void;
  userRole?: UserRole;
  variant?: 'admin' | 'user';
  ownerName?: string;
}

export const LampCard: React.FC<LampCardProps> = ({ 
  lamp, 
  onToggle, 
  onLock, 
  onEdit, 
  onDelete,
  onShowCode,
  onRegenerateKey,
  onManageSchedule,
  onManageAccess,
  onClick,
  userRole = 'viewer',
  variant = 'admin',
  ownerName
}) => {
  const [timeAgo, setTimeAgo] = useState('');
  const isOn = lamp.status;
  const isLocked = lamp.isLocked;
  const isOnline = lamp.isOnline === true; 
  
  // Permission Logic
  const canToggle = !isLocked && (userRole === 'super_admin' || userRole === 'admin' || userRole === 'operator');
  const canModify = userRole === 'super_admin' || userRole === 'admin';

  // Calculate Time Ago
  useEffect(() => {
    const calculateTimeAgo = () => {
      if (!lamp.lastTurnedOn) {
        setTimeAgo('Never');
        return;
      }
      const diff = Date.now() - new Date(lamp.lastTurnedOn).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) setTimeAgo('Just now');
      else if (minutes < 60) setTimeAgo(`${minutes}m ago`);
      else if (hours < 24) setTimeAgo(`${hours}h ago`);
      else setTimeAgo(`${days}d ago`);
    };

    calculateTimeAgo();
    const interval = setInterval(calculateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [lamp.lastTurnedOn]);

  const powerTitle = isLocked 
    ? 'Device Locked' 
    : !canToggle 
        ? 'Permission denied' 
        : isOn 
            ? 'Turn Off' 
            : 'Turn On';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      if (window.confirm(`Are you sure you want to delete "${lamp.name}"? This action cannot be undone.`)) {
        onDelete(lamp.id);
      }
    }
  };

  const handleAction = (action: (() => void) | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action) action();
  };

  return (
    <div 
      onClick={() => onClick && onClick(lamp)}
      className={`
      relative group overflow-hidden rounded-[2rem] p-6 transition-all duration-300 cursor-pointer
      ${isLocked 
        ? 'bg-slate-900 border border-slate-700' 
        : 'bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 hover:border-white/20'
      }
      hover:shadow-2xl hover:scale-[1.02] backdrop-blur-3xl
    `}>
      {/* Dynamic Background Glows */}
      {!isLocked && (
        <>
           <div className={`absolute -top-20 -left-20 w-60 h-60 rounded-full blur-[80px] transition-all duration-1000 ${isOn ? 'bg-green-500/20' : 'bg-red-500/10'}`}></div>
           <div className={`absolute bottom-0 right-0 w-40 h-40 rounded-full blur-[60px] transition-all duration-1000 ${isOn ? 'bg-yellow-400/10' : 'bg-blue-500/10'}`}></div>
        </>
      )}

      <div className="relative z-10 flex flex-col h-full justify-between min-h-[220px]">
        {/* Top Section: Status & Info */}
        <div className="flex justify-between items-start">
           <div>
              {/* Glowing Indicator */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 shadow-lg
                ${isOn 
                  ? 'bg-gradient-to-br from-lime-400 to-green-600 shadow-[0_0_30px_rgba(74,222,128,0.5)]' 
                  : 'bg-gradient-to-br from-red-800 to-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                }
              `}>
                 <div className={`w-12 h-12 rounded-full blur-sm opacity-50 ${isOn ? 'bg-white' : 'bg-black'}`}></div>
              </div>

              <h3 className={`text-2xl font-bold tracking-tight mb-1 ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                {lamp.name}
              </h3>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                   {isLocked ? (
                      <span className="flex items-center gap-1 text-amber-500"><Lock className="w-3 h-3" /> Locked</span>
                   ) : (
                      <span className={isOn ? "text-lime-300" : "text-slate-500"}>{isOn ? "Active" : "Standby"}</span>
                   )}
                   <span className="text-slate-600">•</span>
                   <span className="flex items-center gap-1">
                      {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
                   </span>
                </div>
                {ownerName && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-400">
                    <User className="w-3 h-3" /> {ownerName}
                  </div>
                )}
              </div>
           </div>

           {/* Admin Quick Actions (Top Right) */}
           {canModify && variant === 'admin' && (
              <div className="flex flex-col gap-2">
                 {onLock && (
                   <button 
                     onClick={(e) => handleAction(() => onLock(lamp), e)}
                     className={`p-2 rounded-full transition-all ${isLocked ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                     title={isLocked ? "Unlock Device" : "Lock Device"}
                   >
                     {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                   </button>
                 )}

                 {onManageAccess && (
                    <button
                        onClick={(e) => handleAction(() => onManageAccess(lamp), e)}
                        className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                        title="Manage Access"
                    >
                        <User className="w-4 h-4" />
                    </button>
                 )}

                 {onManageSchedule && (
                    <button
                        onClick={(e) => handleAction(() => onManageSchedule(lamp), e)}
                        className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-purple-500/20 hover:text-purple-400 transition-all"
                        title="Schedules"
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                 )}
                 
                 {onShowCode && (
                    <button
                        onClick={(e) => handleAction(() => onShowCode(lamp), e)}
                        className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all"
                        title="Firmware Code"
                    >
                        <FileCode className="w-4 h-4" />
                    </button>
                 )}

                 {onRegenerateKey && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm("Regenerate API Key? This will disconnect the device until firmware is updated.")) {
                                onRegenerateKey(lamp); // Using the prop function, not recursive
                            }
                        }}
                        className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400 transition-all"
                        title="Regenerate Key"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                 )}

                 {onDelete && (
                   <button 
                     onClick={handleDelete}
                     className="p-2 rounded-full bg-white/5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                     title="Delete Device"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
           )}
        </div>

        {/* Bottom Section: Big Toggle Button */}
        <div className="mt-6">
           <button
             onClick={(e) => canToggle ? handleAction(() => onToggle(lamp), e) : e.stopPropagation()}
             disabled={!canToggle}
             className={`
               w-full py-4 rounded-xl font-bold text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 shadow-xl
               ${isLocked
                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                 : isOn
                   ? 'bg-gradient-to-r from-lime-500 to-green-600 text-black hover:scale-[1.02] shadow-green-900/20'
                   : 'bg-gradient-to-r from-red-600 to-red-800 text-white hover:scale-[1.02] shadow-red-900/20'
               }
             `}
             title={powerTitle}
           >
              {isLocked ? <Lock className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              {isLocked ? 'LOCKED' : isOn ? 'ON' : 'OFF'}
           </button>
           
           <div className="mt-3 flex justify-between items-center px-1">
              <span className={`text-[10px] font-medium ${isOn ? 'text-lime-300/70' : 'text-slate-500'}`}>
                {isOn ? 'Glowing softly' : 'Power off'}
              </span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                 <Clock className="w-3 h-3" /> {timeAgo}
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};
