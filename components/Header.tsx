
import React from 'react';
import { Box, Building2, LogOut, Repeat, Shield, Briefcase } from 'lucide-react';

interface HeaderProps {
  companyName: string;
  userRole: 'admin' | 'manager' | 'standard' | null;
  isDataLoading: boolean;
  onLogout: () => void;
  onSwitchWorkspace: () => void;
}

const Header: React.FC<HeaderProps> = ({ companyName, userRole, isDataLoading, onLogout, onSwitchWorkspace }) => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Box className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Logistics Optimizer</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <div className="flex items-center gap-1">
                <Building2 size={10} />
                <span>{companyName || 'My Company'}</span>
              </div>
              {userRole === 'admin' && (
                <span className="bg-blue-900/40 text-blue-300 border border-blue-500/30 px-1.5 rounded flex items-center gap-0.5 text-[10px] uppercase font-bold">
                  <Shield size={8} /> Admin
                </span>
              )}
              {userRole === 'manager' && (
                <span className="bg-purple-900/40 text-purple-300 border border-purple-500/30 px-1.5 rounded flex items-center gap-0.5 text-[10px] uppercase font-bold">
                  <Briefcase size={8} /> Manager
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDataLoading && <span className="text-xs text-slate-500 animate-pulse">Syncing...</span>}

          <button
            onClick={onSwitchWorkspace}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-slate-700/50"
            title="Switch Workspace"
          >
            <Repeat size={14} /> <span className="hidden sm:inline">Switch Workspace</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-red-300 transition-colors px-3 py-1.5 rounded hover:bg-slate-700/50"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;