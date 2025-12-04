
import React from 'react';
import { Lamp } from '../types';
import { Power, Lock, Unlock, Settings2, Trash2, Clock, Zap, FileCode, Wifi, WifiOff, Cpu } from 'lucide-react';

interface LampCardProps {
  lamp: Lamp;
  onToggle: (lamp: Lamp) => void;
  onLock?: (lamp: Lamp) => void;
  onEdit?: (lamp: Lamp) => void;
  onDelete?: (id: number) => void;
  onShowCode?: (lamp: Lamp) => void;
  variant?: 'admin' | 'user';
}

export const LampCard: React.FC<LampCardProps> = ({ 
  lamp, 
  onToggle, 
  onLock, 
  onEdit, 
  onDelete,
  onShowCode,
  variant = 'admin'
}) => {
  const isOn = lamp.status;
  const isLocked = lamp.isLocked;
  // Default to false if undefined, but maybe we want a 'checking' state? For now, treat undefined as offline or checking.
  const isOnline = lamp.isOnline === true; 
  
  return (
    <div className={`
      relative group overflow-hidden rounded-3xl p-6 transition-all duration-300
      ${isLocked 
        ? 'bg-slate-900/60 border border-slate-700/30' // Locked state: darker, subtle
        : isOn 
          ? 'bg-gradient-to-br from-blue-900/40 to-slate-900/60 border border-blue-500/30 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)]' 
          : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600'
      }
      backdrop-blur-xl
    `}>
      {/* Background Glow when on */}
      {isOn && !isLocked && (
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
      )}
      
      {/* Locked Overlay Pattern/Indicator */}
      {isLocked && (
         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUwyMCAyME0yMCAxTDEgMjAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-20 pointer-events-none" />
      )}

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className={`text-lg font-bold mb-1 flex items-center gap-2 ${isLocked ? 'text-slate-400' : 'text-white'}`}>
            {lamp.name}
            {isLocked && <Lock className="w-3 h-3 text-amber-500" />}
          </h3>
          <div className="flex items-center gap-2 mt-1">
             <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'ONLINE' : 'OFFLINE'}
             </div>
             <p className="text-xs font-mono text-slate-500">{lamp.ip}</p>
          </div>
        </div>
        
        <button
          onClick={() => !isLocked && onToggle(lamp)}
          disabled={isLocked}
          title={isLocked ? "Device is locked" : isOn ? "Turn Off" : "Turn On"}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
            ${isLocked
               ? 'bg-slate-800/50 text-slate-600 border border-slate-700/50 cursor-not-allowed' // Locked styling
               : isOn 
                 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:bg-blue-400 cursor-pointer' 
                 : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white cursor-pointer shadow-lg'
            }
          `}
        >
          {isLocked ? <Lock className="w-5 h-5" /> : <Power className="w-6 h-6" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
        <div className={`rounded-xl p-3 border ${isLocked ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-900/50 border-white/5'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Clock className="w-3 h-3" /> Runtime
          </div>
          <div className={`text-sm font-medium ${isLocked ? 'text-slate-500' : 'text-slate-200'}`}>
            {Math.floor(lamp.totalHours)}h {Math.round((lamp.totalHours % 1) * 60)}m
          </div>
        </div>
        <div className={`rounded-xl p-3 border ${isLocked ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-900/50 border-white/5'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Cpu className="w-3 h-3" /> GPIO
          </div>
          <div className={`text-sm font-medium ${isLocked ? 'text-slate-500' : 'text-slate-200'}`}>
            Pin {lamp.pin}
          </div>
        </div>
      </div>

      {/* Controls - Only show in admin variant */}
      {variant === 'admin' && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
          <div className="flex gap-2">
            {onLock && (
              <button 
                onClick={() => onLock(lamp)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium border ${
                  isLocked 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20' 
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                }`}
                title={isLocked ? "Click to unlock device" : "Click to lock device"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
              </button>
            )}
            
            <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

            {onEdit && (
              <button 
                onClick={() => onEdit(lamp)}
                disabled={isLocked}
                className={`p-2 rounded-lg transition-colors ${isLocked ? 'text-slate-600 cursor-not-allowed' : 'hover:bg-slate-700 text-slate-400 hover:text-white'}`}
                title="Edit Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}

            {onShowCode && (
              <button
                onClick={() => onShowCode(lamp)}
                className="p-2 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
                title="Get Integration Code"
              >
                <FileCode className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {onDelete && (
            <button 
              onClick={() => onDelete(lamp.id)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete Lamp"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
