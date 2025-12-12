import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

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
    <div className="flex flex-wrap gap-1.5">
      {availableOptions.map(opt => {
        const isActive = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded-md"
          >
            <Badge
              variant={isActive ? "default" : "outline"}
              className={`cursor-pointer transition-all duration-200 flex items-center gap-1 text-[10px] px-2 py-1 ${isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {isActive && <Check size={10} />}
              {opt}
            </Badge>
          </button>
        );
      })}
    </div>
  );
};

export default RestrictionSelector;