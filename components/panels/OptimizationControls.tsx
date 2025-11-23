
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
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg shrink-0">
      <label className="text-xs text-slate-400 uppercase font-bold mb-2 block flex justify-between">
        <span>Safety Margin</span>
        <span className="text-blue-400">{marginPercentage}%</span>
      </label>
      <input
        type="range" min="0" max="50" step="1"
        value={marginPercentage}
        onChange={(e) => setMarginPercentage(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-6 accent-blue-500"
      />

      <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Priority</label>
      <div className="flex gap-2 mb-4">
        {[OptimizationPriority.COST, OptimizationPriority.BALANCE, OptimizationPriority.TIME].map(p => (
          <button
            key={p}
            onClick={() => setOptimizationPriority(p)}
            className={`flex-1 py-2 text-xs rounded font-medium border ${optimizationPriority === p
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
          >
            {p}
          </button>
        ))}
      </div>

      <label className="text-xs text-slate-400 uppercase font-bold mb-2 block flex items-center gap-2">
        <EyeOff size={12} /> Ignore Constraints
      </label>
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setIgnoreWeight(!ignoreWeight)}
          className={`px-2 py-2 text-xs rounded border flex items-center justify-center gap-2 transition-colors ${ignoreWeight ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
        >
          <div className={`w-3 h-3 rounded-sm border ${ignoreWeight ? 'bg-red-500 border-red-500' : 'border-slate-600'}`}>
            {ignoreWeight && <Check size={10} className="text-white" />}
          </div>
          Weight Limit
        </button>
        <button
          onClick={() => setIgnoreVolume(!ignoreVolume)}
          className={`px-2 py-2 text-xs rounded border flex items-center justify-center gap-2 transition-colors ${ignoreVolume ? 'bg-red-900/30 border-red-500 text-red-200' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
        >
          <div className={`w-3 h-3 rounded-sm border ${ignoreVolume ? 'bg-red-500 border-red-500' : 'border-slate-600'}`}>
            {ignoreVolume && <Check size={10} className="text-white" />}
          </div>
          Volume Limit
        </button>
      </div>

      <Button
        onClick={handleOptimization}
        isLoading={isOptimizing}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2"
      >
        <Zap size={18} />
        {selectedCount > 0 ? `Plan (${selectedCount} Selected)` : 'Calculate Plan (All)'}
      </Button>
    </div>
  );
};

export default OptimizationControls;
