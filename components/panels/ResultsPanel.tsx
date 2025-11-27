import React, { useState } from 'react';
import { OptimizationResult, Container, Product, OptimizationPriority, LoadedContainer } from '../../types';
import { Layers, AlertTriangle, Move, Box, X, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

interface ResultsPanelProps {
  results: Record<OptimizationPriority, OptimizationResult> | null;
  activePriority: OptimizationPriority;
  setActivePriority: (p: OptimizationPriority) => void;
  containers: Container[];
  handleDragStart: (e: React.DragEvent, productId: string, sourceId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
  draggedProductId: string | null;
  onClose: () => void;
  optimalRange?: { min: number; max: number };
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  activePriority,
  setActivePriority,
  containers,
  handleDragStart,
  handleDragOver,
  handleDrop,
  draggedProductId,
  onClose,
  optimalRange = { min: 85, max: 100 }
}) => {
  const [collapsedDestinations, setCollapsedDestinations] = useState<Set<string>>(new Set());

  const toggleDestination = (dest: string) => {
    setCollapsedDestinations(prev => {
      const next = new Set(prev);
      if (next.has(dest)) next.delete(dest);
      else next.add(dest);
      return next;
    });
  };

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed min-h-[400px]">
        <Box size={48} className="mb-4 opacity-50" />
        <p>Add products and containers, then click Run Optimization.</p>
      </div>
    );
  }

  const result = results[activePriority];

  // Group assignments by destination
  const groupedAssignments = React.useMemo(() => {
    const groups: Record<string, LoadedContainer[]> = {};
    result.assignments.forEach(a => {
      const dest = a.container.destination || 'Unspecified Destination';
      if (!groups[dest]) groups[dest] = [];
      groups[dest].push(a);
    });
    return groups;
  }, [result]);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Optimization Results</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Containers Used</div>
          <div className="text-2xl font-bold text-blue-400">{result.assignments.filter(a => a.assignedProducts.length > 0).length}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Avg Utilization</div>
          <div className="text-2xl font-bold text-purple-400">{result.assignments.length > 0 ? (result.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / result.assignments.length).toFixed(1) : 0}%</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Unassigned</div>
          <div className="text-2xl font-bold text-red-400">{result.unassignedProducts.length}</div>
        </div>
      </div>

      {/* Reasoning */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-6">
        <h3 className="text-sm font-bold text-slate-300 mb-2">Optimization Strategy</h3>
        <p className="text-sm text-slate-400 whitespace-pre-line">{result.reasoning}</p>
      </div>

      {/* Assignments Visualizer */}
      <div className="space-y-8">
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (collapsedDestinations.size === Object.keys(groupedAssignments).length) {
                setCollapsedDestinations(new Set());
              } else {
                setCollapsedDestinations(new Set(Object.keys(groupedAssignments)));
              }
            }}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            {collapsedDestinations.size === Object.keys(groupedAssignments).length ? 'Expand All' : 'Collapse All'}
          </button>
        </div>

        {Object.entries(groupedAssignments).map(([destination, assignments]: [string, LoadedContainer[]]) => {
          const isCollapsed = collapsedDestinations.has(destination);

          // Check for issues in this group
          const hasIssues = assignments.some(a => a.validationIssues && a.validationIssues.length > 0);
          const hasUtilizationWarning = assignments.some(a => {
            const util = a.totalUtilization;
            // Use passed optimal range or default
            const minUtil = optimalRange?.min || 85;
            const maxUtil = optimalRange?.max || 100;
            return util < minUtil || util > maxUtil + 0.1; // +0.1 for tolerance
          });

          const headerColorClass = hasIssues
            ? 'text-red-400'
            : hasUtilizationWarning
              ? 'text-yellow-400'
              : 'text-slate-200';

          const borderColorClass = hasIssues
            ? 'border-red-900/50'
            : hasUtilizationWarning
              ? 'border-yellow-900/50'
              : 'border-slate-700';

          return (
            <div key={destination} className={`space-y-4 rounded-xl border p-4 ${borderColorClass} ${isCollapsed && (hasIssues || hasUtilizationWarning) ? 'bg-slate-800/50' : ''}`}>
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => toggleDestination(destination)}
              >
                {isCollapsed ? <ChevronRight size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                <h3 className={`text-lg font-bold flex items-center gap-2 ${headerColorClass}`}>
                  <MapPin size={18} />
                  {destination === 'Unspecified Destination' ? 'Unspecified Destination' : destination.split('|')[0]}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({assignments.length} Containers)
                  </span>
                  {isCollapsed && hasIssues && (
                    <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle size={12} /> Issues
                    </span>
                  )}
                  {isCollapsed && !hasIssues && hasUtilizationWarning && (
                    <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle size={12} /> Utilization
                    </span>
                  )}
                </h3>
                <div className="h-px bg-slate-700 flex-1 ml-4 group-hover:bg-slate-600 transition-colors" />
              </div>

              {!isCollapsed && assignments.map((loadedContainer) => {
                // Extract instance number from ID (format: templateId-instance-N)
                const instanceMatch = loadedContainer.container.id.match(/-instance-(\d+)$/);
                const instanceNumber = instanceMatch ? `#${instanceMatch[1]}` : '';

                const isLowUtilization = loadedContainer.totalUtilization < optimalRange.min;
                const isOptimal = loadedContainer.totalUtilization >= optimalRange.min && loadedContainer.totalUtilization <= optimalRange.max;

                return (
                  <div
                    key={loadedContainer.container.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, loadedContainer.container.id)}
                    className={`bg-slate-800 rounded-lg border transition-all duration-200 
                    ${(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) ? 'border-red-500' : 'border-slate-700'}
                  `}
                  >
                    <div className={`p-3 border-b border-slate-700 flex justify-between items-center ${(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) ? 'bg-red-900/20' : 'bg-slate-900/50'
                      }`}>
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          {loadedContainer.container.name} {instanceNumber && <span className="text-slate-500 text-sm font-normal">{instanceNumber}</span>}
                          {(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) && (
                            <span className="text-red-400 flex items-center gap-1 text-xs bg-red-900/30 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={12} /> Issues Found
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex gap-3">
                          <span>{loadedContainer.container.destination || 'No Dest'}</span>
                          <span>•</span>
                          <span>{loadedContainer.container.restrictions.join(', ') || 'No Restrictions'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${isLowUtilization ? 'text-yellow-500' : isOptimal ? 'text-green-400' : 'text-blue-400'}`}>
                          {loadedContainer.totalUtilization.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500">Utilization</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-900 w-full">
                      <div
                        className={`h-full transition-all duration-500 ${isLowUtilization ? 'bg-yellow-500' : isOptimal ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(loadedContainer.totalUtilization, 100)}%` }}
                      />
                    </div>

                    {/* Products List */}
                    <div className="p-3 space-y-2">
                      {loadedContainer.assignedProducts.length === 0 ? (
                        <div className="text-center py-4 text-slate-600 text-sm italic">Empty Container</div>
                      ) : (
                        loadedContainer.assignedProducts.map((p, idx) => (
                          <div
                            key={`${p.id}-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, p.id, loadedContainer.container.id)}
                            className="bg-slate-700/50 p-2 rounded border border-slate-600/50 flex justify-between items-center text-sm hover:bg-slate-700 cursor-grab active:cursor-grabbing group"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Box size={14} className="text-blue-400 shrink-0" />
                              <span className="truncate text-slate-300" title={p.name}>{p.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded">
                                {p.quantity} units
                              </span>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Validation Issues */}
                      {loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                            <AlertTriangle size={14} />
                            Validation Issues:
                          </div>
                          <ul className="space-y-1">
                            {loadedContainer.validationIssues.map((issue, idx) => (
                              <li key={idx} className="text-xs text-red-300 pl-4">
                                • {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Unassigned Products */}
      {result.unassignedProducts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" /> Unassigned Products
          </h3>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <div className="grid grid-cols-1 gap-2">
              {result.unassignedProducts.map((p) => (
                <div key={p.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                  <div className="font-medium text-slate-300">{p.name}</div>
                  <div className="text-red-400 font-bold">{p.quantity} left</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
