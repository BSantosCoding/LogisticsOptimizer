import React from 'react';
import { OptimizationResult, Deal } from '../../types';
import { MessageSquare, Layers, Clock, Calendar, AlertTriangle, Move, Box } from 'lucide-react';

interface ResultsPanelProps {
  result: OptimizationResult | null;
  deals: Deal[];
  handleDragStart: (e: React.DragEvent, productId: string, sourceId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  deals,
  handleDragStart,
  handleDragOver,
  handleDrop
}) => {
  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed min-h-[400px]">
        <Box size={48} className="mb-4 opacity-50" />
        <p>Add products and deals, then click Calculate Plan.</p>
      </div>
    );
  }

  const getUnusedDeals = () => {
    if (!result) return [];
    const usedIds = new Set(result.assignments.map(a => a.deal.id));
    return deals.filter(d => !usedIds.has(d.id));
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-xs uppercase font-bold">Total Cost</div>
            <div className="text-2xl font-bold text-green-400">${result.totalCost.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-xs uppercase font-bold">Deals Used</div>
            <div className="text-2xl font-bold text-blue-400">{result.assignments.filter(a => a.assignedProducts.length > 0).length} <span className="text-sm text-slate-500 font-normal">/ {deals.length}</span></div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-xs uppercase font-bold">Margin Applied</div>
            <div className="text-2xl font-bold text-purple-400">{result.safetyMarginUsed}%</div>
          </div>
      </div>

      {/* Logic Summary */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
            <MessageSquare size={16}/> Optimization Summary
          </h4>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{result.reasoning}</p>
      </div>
      
      {/* Assignments Visualizer */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Layers size={20} className="text-blue-500"/> Packing Plan</h3>
        
        {result.assignments.map((loadedDeal) => (
          <div 
              key={loadedDeal.deal.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, loadedDeal.deal.id)}
              className={`bg-slate-800 rounded-lg border transition-all ${
                  (loadedDeal.validationIssues && loadedDeal.validationIssues.length > 0) ? 'border-red-500' : 'border-slate-700'
              }`}
          >
            <div className={`p-3 border-b border-slate-700 flex justify-between items-center ${
                (loadedDeal.validationIssues && loadedDeal.validationIssues.length > 0) ? 'bg-red-900/20' : 'bg-slate-900/50'
            }`}>
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    {loadedDeal.deal.carrierName} 
                    <span className="text-slate-500 text-sm font-normal">({loadedDeal.deal.containerType})</span>
                    {loadedDeal.deal.restrictions.length > 0 && (
                      <div className="flex gap-1">
                        {loadedDeal.deal.restrictions.map(r => (
                          <span key={r} className="text-[10px] px-1.5 rounded bg-green-900/30 text-green-400 border border-green-800/50">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex gap-3 mt-1">
                    <span>${loadedDeal.deal.cost}</span>
                    <span className="flex items-center gap-1"><Clock size={10}/> {loadedDeal.deal.transitTimeDays}d</span>
                    <span className="flex items-center gap-1"><Calendar size={10}/> {loadedDeal.deal.availableFrom}</span>
                    <span className="text-blue-400">{loadedDeal.deal.destination}</span>
                  </div>
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                      <span className="text-slate-500">Weight</span>
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${loadedDeal.utilizationWeight > 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${Math.min(loadedDeal.utilizationWeight, 100)}%`}}></div>
                      </div>
                      <span className="w-8 text-right">{Math.round(loadedDeal.utilizationWeight)}%</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                      <span className="text-slate-500">Volume</span>
                      <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${loadedDeal.utilizationVolume > 100 ? 'bg-red-500' : 'bg-purple-500'}`} style={{width: `${Math.min(loadedDeal.utilizationVolume, 100)}%`}}></div>
                      </div>
                      <span className="w-8 text-right">{Math.round(loadedDeal.utilizationVolume)}%</span>
                  </div>
                </div>
            </div>

            {/* Validation Issues */}
            {loadedDeal.validationIssues && loadedDeal.validationIssues.length > 0 && (
                <div className="bg-red-900/40 text-red-200 text-xs p-2 border-b border-red-900/50">
                    <div className="font-bold flex items-center gap-1"><AlertTriangle size={12}/> Issues Detected:</div>
                    <ul className="list-disc list-inside pl-1 mt-1 space-y-0.5">
                        {loadedDeal.validationIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                </div>
            )}

            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 min-h-[50px]">
                {loadedDeal.assignedProducts.length === 0 && (
                    <div className="col-span-full text-center text-slate-600 text-xs py-4 border border-dashed border-slate-700 rounded">
                        Drag items here
                    </div>
                )}
                {loadedDeal.assignedProducts.map(prod => (
                  <div 
                      key={prod.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, prod.id, loadedDeal.deal.id)}
                      className="bg-slate-700/30 p-2 rounded border border-slate-700/50 text-sm cursor-move hover:bg-slate-700/50 transition-colors shadow-sm hover:shadow-md text-slate-200"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Move size={12} className="text-slate-500"/>
                      <div className="truncate font-medium" title={prod.name}>{prod.name}</div>
                    </div>
                    {(prod.shipDeadline || prod.arrivalDeadline || prod.readyDate) && (
                      <div className="text-[10px] text-slate-500 pl-5">
                         {prod.readyDate && <div>Ready: {prod.readyDate}</div>}
                         {prod.shipDeadline && <div>Ship by {prod.shipDeadline}</div>}
                         {prod.arrivalDeadline && <div>Arr by {prod.arrivalDeadline}</div>}
                      </div>
                    )}
                    {prod.restrictions.length > 0 && (
                      <div className="flex gap-1 mt-1 pl-5">
                        {prod.restrictions.map(r => <span key={r} className="text-[9px] bg-slate-800 px-1 rounded text-slate-400">{r}</span>)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}

        {/* Unused Deals Section */}
        {getUnusedDeals().length > 0 && (
           <div className="pt-4 border-t border-slate-800">
              <h4 className="text-slate-400 text-sm font-medium mb-3">Available Unused Deals</h4>
              <div className="grid gap-3">
                  {getUnusedDeals().map(deal => (
                      <div 
                          key={deal.id}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, deal.id)}
                          className="bg-slate-800/30 border border-dashed border-slate-700 p-3 rounded-lg opacity-70 hover:opacity-100 transition-opacity group relative"
                      >
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <div className="text-sm font-medium text-slate-300">{deal.carrierName}</div>
                                  <div className="text-xs text-slate-500">{deal.containerType}</div>
                              </div>
                              <div className="text-right">
                                  <div className="text-xs text-green-500 font-bold">${deal.cost}</div>
                                  <div className="text-[10px] text-slate-500">{deal.transitTimeDays} days</div>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mb-2 border-t border-slate-700/50 pt-2">
                              <div>
                                  <span className="block text-slate-600 uppercase text-[9px]">Available</span>
                                  {deal.availableFrom}
                              </div>
                               <div>
                                  <span className="block text-slate-600 uppercase text-[9px]">Capacity</span>
                                  {deal.maxWeightKg}kg / {deal.maxVolumeM3}m³
                              </div>
                          </div>
                          
                          {deal.restrictions.length > 0 && (
                              <div className="flex gap-1 flex-wrap mb-2">
                                  {deal.restrictions.map((r, i) => (
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
          <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2"><AlertTriangle size={18}/> Unassigned Items</h4>
          
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
                   <Move size={12} className="opacity-50"/>
                  {p.name}
                  {p.restrictions.length > 0 && (
                    <span className="text-[10px] opacity-70 bg-black/30 px-1 rounded">{p.restrictions.join(', ')}</span>
                  )}
                </div>
                {(p.shipDeadline || p.arrivalDeadline || p.readyDate) && (
                    <div className="text-[10px] opacity-75 mt-1">
                      {p.readyDate && <span>Ready {p.readyDate}</span>}
                      {(p.shipDeadline || p.arrivalDeadline) && (p.readyDate ? ' | ' : '')}
                      {(p.shipDeadline || p.arrivalDeadline) ? 'Deadline set' : ''}
                    </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

export default ResultsPanel;