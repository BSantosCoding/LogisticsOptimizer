
import React from 'react';
import { OptimizationResult, Container, Product, OptimizationPriority } from '../../types';
import { Layers, AlertTriangle, Move, Box, X } from 'lucide-react';

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
  onClose
}) => {

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed min-h-[400px]">
        <Box size={48} className="mb-4 opacity-50" />
        <p>Add products and containers, then click Run Optimization.</p>
      </div>
    );
  }

  const result = results[activePriority];

  const getUnusedContainers = () => {
    if (!result) return [];
    const usedIds = new Set(result.assignments.map(a => a.container.id));
    return containers.filter(c => !usedIds.has(c.id));
  };

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
          <div className="text-2xl font-bold text-blue-400">{result.assignments.filter(a => a.assignedProducts.length > 0).length} <span className="text-sm text-slate-500 font-normal">/ {containers.length}</span></div>
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
        <div className="text-sm text-slate-300 whitespace-pre-wrap">{result.reasoning}</div>
      </div>

      {/* Assignments Visualizer */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Layers size={20} className="text-blue-500" /> Packing Plan</h3>

        {result.assignments.map((loadedContainer) => {
          // Extract instance number from ID (format: templateId-instance-N)
          const instanceMatch = loadedContainer.container.id.match(/-instance-(\d+)$/);
          const instanceNumber = instanceMatch ? `#${instanceMatch[1]}` : '';

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
                    {loadedContainer.container.restrictions.length > 0 && (
                      <div className="flex gap-1">
                        {loadedContainer.container.restrictions.map(r => (
                          <span key={r} className="text-[10px] px-1.5 rounded bg-green-900/30 text-green-400 border border-green-800/50">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-slate-500">Utilization</span>
                    <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                      <div className={`h-full absolute left-0 top-0 transition-all ${loadedContainer.totalUtilization > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(loadedContainer.totalUtilization, 100)}%` }}></div>
                    </div>
                    <span className="w-12 text-right font-bold">{Math.round(loadedContainer.totalUtilization)}%</span>
                  </div>
                </div>
              </div>

              {/* Validation Issues */}
              {loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0 && (
                <div className="bg-red-900/40 text-red-200 text-xs p-2 border-b border-red-900/50">
                  <div className="font-bold flex items-center gap-1"><AlertTriangle size={12} /> Issues Detected:</div>
                  <ul className="list-disc list-inside pl-1 mt-1 space-y-0.5">
                    {loadedContainer.validationIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                </div>
              )}

              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 min-h-[50px]">
                {loadedContainer.assignedProducts.length === 0 && (
                  <div className="col-span-full text-center text-slate-600 text-xs py-4 border border-dashed border-slate-700 rounded">
                    Drag items here
                  </div>
                )}
                {loadedContainer.assignedProducts.map(prod => (
                  <div
                    key={prod.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, prod.id, loadedContainer.container.id)}
                    className="bg-slate-700/30 p-2 rounded border border-slate-700/50 text-sm cursor-move hover:bg-slate-700/50 transition-colors shadow-sm hover:shadow-md text-slate-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Move size={12} className="text-slate-500" />
                      <div className="truncate font-medium" title={prod.name}>{prod.name}</div>
                    </div>
                    <div className="text-[10px] text-slate-400 pl-5">Qty: {prod.quantity}</div>
                    {prod.restrictions.length > 0 && (
                      <div className="flex gap-1 mt-1 pl-5">
                        {prod.restrictions.map(r => <span key={r} className="text-[9px] bg-slate-800 px-1 rounded text-slate-400">{r}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Unused Containers Section */}
        {getUnusedContainers().length > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-slate-400 text-sm font-medium mb-3">Available Unused Containers</h4>
            <div className="grid gap-3">
              {getUnusedContainers().map(container => (
                <div
                  key={container.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, container.id)}
                  className="bg-slate-800/30 border border-dashed border-slate-700 p-3 rounded-lg opacity-70 hover:opacity-100 transition-opacity group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-medium text-slate-300">{container.name}</div>
                    </div>
                  </div>

                  {container.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {container.restrictions.map((r, i) => (
                        <span key={i} className="text-[9px] bg-slate-700 px-1 rounded text-slate-400">{r}</span>
                      ))}
                    </div>
                  )}

                  <div className="text-center text-xs text-slate-500 py-1 border-t border-dashed border-slate-700/50 mt-1">
                    Drag items here to activate
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Section */}
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'unassigned')}
          className="bg-red-900/10 rounded-lg border border-red-900/30 p-4 min-h-[100px]"
        >
          <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18} /> Unassigned Items</h4>

          <div className="flex gap-2 flex-wrap">
            {result.unassignedProducts.length === 0 && (
              <div className="text-xs text-red-400/50 italic">Drag items here to unassign them</div>
            )}
            {result.unassignedProducts.map(p => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, p.id, 'unassigned')}
                className="bg-red-900/40 text-red-200 px-2 py-1 rounded text-sm border border-red-500/30 flex flex-col cursor-move hover:bg-red-900/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Move size={12} className="opacity-50" />
                  {p.name}
                  {p.restrictions.length > 0 && (
                    <span className="text-[10px] opacity-70 bg-black/30 px-1 rounded">{p.restrictions.join(', ')}</span>
                  )}
                </div>
                <div className="text-[10px] opacity-75 mt-1">Qty: {p.quantity}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResultsPanel;
