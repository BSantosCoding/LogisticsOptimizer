
import React from 'react';
import { EyeOff, Check, Zap } from 'lucide-react';
import { OptimizationPriority } from '../../types';
import Button from '../Button';

interface OptimizationControlsProps {
  marginPercentage: number;
  setMarginPercentage: (n: number) => void;
  optimizationPriority: OptimizationPriority;
  setOptimizationPriority: (p: OptimizationPriority) => void;
  ignoreWeight: boolean;
  setIgnoreWeight: (b: boolean) => void;
  ignoreVolume: boolean;
  setIgnoreVolume: (b: boolean) => void;
  handleOptimization: () => void;
  isOptimizing: boolean;
  disabled: boolean;
  selectedCount?: number;
}

const OptimizationControls: React.FC<OptimizationControlsProps> = ({
  marginPercentage,
  setMarginPercentage,
  optimizationPriority,
  setOptimizationPriority,
  ignoreWeight,
  setIgnoreWeight,
  ignoreVolume,
  setIgnoreVolume,
  handleOptimization,
  isOptimizing,
  disabled,
  selectedCount = 0
}) => {
  return (
    <div className="bg-slate-800 border-t border-slate-700 p-4 shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.2)] z-20">
      <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block flex justify-between">
        <span>Safety Margin</span>
        <span className="text-blue-400">{marginPercentage}%</span>
      </label>
      <input
        type="range" min="0" max="50" step="1"
        value={marginPercentage}
        onChange={(e) => setMarginPercentage(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-4 accent-blue-500 block"
      />

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Priority</label>
          <div className="flex gap-1">
            {[OptimizationPriority.COST, OptimizationPriority.BALANCE, OptimizationPriority.TIME].map(p => (
              <button
                key={p}
                onClick={() => setOptimizationPriority(p)}
                title={p}
                className={`flex-1 py-1.5 text-[10px] rounded font-medium border text-center ${optimizationPriority === p
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {p === OptimizationPriority.BALANCE ? 'Bal' : p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block flex items-center gap-1">
            <EyeOff size={10} /> Ignore
          </label>
          <div className="flex gap-1">
            <button
              onClick={() => setIgnoreWeight(!ignoreWeight)}
              title="Ignore Weight Limit"
              className={`flex-1 py-1.5 text-[10px] rounded border flex items-center justify-center transition-colors ${ignoreWeight ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
              Weight
            </button>
            <button
              onClick={() => setIgnoreVolume(!ignoreVolume)}
              title="Ignore Volume Limit"
              className={`flex-1 py-1.5 text-[10px] rounded border flex items-center justify-center transition-colors ${ignoreVolume ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            >
              Vol
            </button>
          </div>
        </div>
      </div>

      <Button
        onClick={handleOptimization}
        isLoading={isOptimizing}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm"
      >
        <Zap size={16} />
        {selectedCount > 0 ? `Plan (${selectedCount})` : 'Calculate Plan'}
      </Button>
    </div>
  );
};

export default OptimizationControls;
