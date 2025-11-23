import React from 'react';
import { Box, Building2, LogOut } from 'lucide-react';

interface HeaderProps {
  companyName: string;
  isDataLoading: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ companyName, isDataLoading, onLogout }) => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Box className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Logistics Optimizer</h1>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <Building2 size={10} />
              <span>{companyName || 'My Company'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {isDataLoading && <span className="text-xs text-slate-500 animate-pulse">Syncing...</span>}
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