import React from 'react';
import { Check } from 'lucide-react';

interface RestrictionSelectorProps {
  availableOptions: string[];
  selected: string[];
  onChange: (r: string[]) => void;
}

const RestrictionSelector: React.FC<RestrictionSelectorProps> = ({ availableOptions, selected, onChange }) => {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {availableOptions.map(opt => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`text-[10px] px-2 py-1 rounded-md border transition-all duration-200 flex items-center gap-1 ${
              isActive 
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-900/20' 
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {isActive && <Check size={10} />}
            {opt}
          </button>
        );
      })}
    </div>
  );
};

export default RestrictionSelector;