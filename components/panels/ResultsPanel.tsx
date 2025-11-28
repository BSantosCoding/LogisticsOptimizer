import React, { useState } from 'react';
import { OptimizationResult, Container, Product, OptimizationPriority, LoadedContainer } from '../../types';
import { Layers, AlertTriangle, Move, Box, X, ChevronDown, ChevronRight, MapPin, Save } from 'lucide-react';

interface ResultsPanelProps {
  results: Record<OptimizationPriority, OptimizationResult> | null;
  activePriority: OptimizationPriority;
  setActivePriority: (p: OptimizationPriority) => void;
  containers: Container[];
  countries: any[];
  handleDragStart: (e: React.DragEvent, productId: string, sourceId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetId: string, quantity?: number) => void;
  draggedProductId: string | null;
  onClose: () => void;
  onSaveShipment: (name: string, result: OptimizationResult) => void;
  optimalRange?: { min: number; max: number };
  onAddContainer?: (container: Container) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  activePriority,
  setActivePriority,
  containers,
  countries,
  handleDragStart,
  handleDragOver,
  handleDrop,
  draggedProductId,
  onClose,
  onSaveShipment,
  optimalRange = { min: 85, max: 100 },
  onAddContainer
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [shipmentName, setShipmentName] = useState('');
  const [addContainerModal, setAddContainerModal] = useState(false);

  const handleAddContainer = (container: Container) => {
    if (onAddContainer) {
      onAddContainer(container);
      setAddContainerModal(false);
    }
  };

  // Move Quantity Modal State
  const [moveModal, setMoveModal] = useState<{
    sourceId: string;
    targetId: string;
    productId: string;
    maxQty: number;
    productName: string;
  } | null>(null);
  const [moveQty, setMoveQty] = useState(1);

  // Transform countries data into countryCosts map
  const countryCosts = React.useMemo(() => {
    const costs: Record<string, Record<string, number>> = {};
    countries.forEach((country: any) => {
      if (country.code && country.containerCosts) {
        costs[country.code] = country.containerCosts;
      }
    });
    return costs;
  }, [countries]);

  // Helper to get cost for a container
  const getContainerCost = (loadedContainer: LoadedContainer) => {
    const country = loadedContainer.assignedProducts[0]?.country;
    return (country && countryCosts[country]?.[loadedContainer.container.id]) ?? loadedContainer.container.cost;
  };
  const [collapsedDestinations, setCollapsedDestinations] = useState<Set<string>>(new Set());

  const toggleDestination = (dest: string) => {
    setCollapsedDestinations(prev => {
      const next = new Set(prev);
      if (next.has(dest)) next.delete(dest);
      else next.add(dest);
      return next;
    });
  };

  // Internal Drop Handler to intercept and check for quantity
  const onDropWrapper = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const productId = e.dataTransfer.getData("productId");
    const sourceId = e.dataTransfer.getData("sourceId");

    if (sourceId === targetId || !results) return;

    const currentResult = results[activePriority];

    // Find Source Container and Product Group
    let productsInSource: Product[] = [];
    if (sourceId === 'unassigned') {
      productsInSource = currentResult.unassignedProducts;
    } else {
      const sourceContainer = currentResult.assignments.find(a => a.container.id === sourceId);
      if (sourceContainer) {
        productsInSource = sourceContainer.assignedProducts;
      }
    }

    // Find the specific product to get details
    const templateProd = productsInSource.find(p => p.id === productId);
    if (!templateProd) return;

    // Calculate total quantity of identical items in source
    const identicalProducts = productsInSource.filter(p =>
      p.id === productId ||
      (p.name === templateProd.name && p.formFactorId === templateProd.formFactorId)
    );

    const totalQty = identicalProducts.reduce((sum, p) => sum + p.quantity, 0);

    if (totalQty > 1) {
      setMoveModal({
        sourceId,
        targetId,
        productId,
        maxQty: totalQty,
        productName: templateProd.name
      });
      setMoveQty(totalQty); // Default to moving all
    } else {
      handleDrop(e, targetId);
    }
  };

  const confirmMove = () => {
    if (!moveModal) return;
    // Create a synthetic event or just call the handler if we modify it to not need event
    // Since handleDrop expects event, we can mock it or better yet, update handleDrop signature in App.tsx to be more flexible?
    // But for now, let's just call it with the params we added.
    // We need to pass a mock event object because handleDrop uses e.dataTransfer to get IDs.
    // Wait, handleDrop in App.tsx reads dataTransfer. We can't easily mock that synchronously here without a real drag event.
    // Actually, we can just modify handleDrop in App.tsx to accept optional IDs if event is not provided?
    // OR: We construct a mock event.

    const mockEvent = {
      preventDefault: () => { },
      dataTransfer: {
        getData: (key: string) => {
          if (key === "productId") return moveModal.productId;
          if (key === "sourceId") return moveModal.sourceId;
          return "";
        }
      }
    } as unknown as React.DragEvent;

    handleDrop(mockEvent, moveModal.targetId, moveQty);
    setMoveModal(null);
  };

  const result = results ? results[activePriority] : null;

  // Group assignments by destination
  const groupedAssignments = React.useMemo(() => {
    if (!result) return {};
    const groups: Record<string, LoadedContainer[]> = {};
    result.assignments.forEach(a => {
      const dest = a.container.destination || 'Unspecified Destination';
      if (!groups[dest]) groups[dest] = [];
      groups[dest].push(a);
    });
    return groups;
  }, [result]);

  // Group unassigned products
  const groupedUnassigned = React.useMemo(() => {
    if (!result) return {};
    return result.unassignedProducts.reduce((acc, p) => {
      const key = `${p.name}-${p.formFactorId}`;
      if (!acc[key]) acc[key] = { products: [], totalQty: 0 };
      acc[key].products.push(p);
      acc[key].totalQty += p.quantity;
      return acc;
    }, {} as Record<string, { products: Product[], totalQty: number }>);
  }, [result?.unassignedProducts]);

  if (!results || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 border-dashed min-h-[400px]">
        <Box size={48} className="mb-4 opacity-50" />
        <p>Add products and containers, then click Run Optimization or switch to Manual mode.</p>
      </div>
    );
  }


  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Optimization Results</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSaving(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Save size={16} /> Save as Shipment
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Priority Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-700 pb-1">
            {Object.values(OptimizationPriority).map((priority) => (
              <button
                key={priority}
                onClick={() => setActivePriority(priority)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${activePriority === priority
                  ? 'text-blue-400 bg-slate-800 border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
              >
                {priority}
                {activePriority === priority && (
                  <div className="absolute bottom-[-5px] left-0 right-0 h-[5px] bg-slate-800" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Move Quantity Modal */}
      {moveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-80 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Move Items</h3>
            <p className="text-sm text-slate-400 mb-4">
              How many units of <span className="text-white font-medium">{moveModal.productName}</span> do you want to move?
            </p>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setMoveQty(Math.max(1, moveQty - 1))}
                className="w-8 h-8 rounded bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={moveQty}
                  onChange={(e) => setMoveQty(Math.max(1, Math.min(moveModal.maxQty, parseInt(e.target.value) || 1)))}
                  className="w-full bg-transparent text-center text-2xl font-bold text-blue-400 outline-none"
                />
                <div className="text-xs text-slate-500">of {moveModal.maxQty} available</div>
              </div>
              <button
                onClick={() => setMoveQty(Math.min(moveModal.maxQty, moveQty + 1))}
                className="w-8 h-8 rounded bg-slate-700 text-white flex items-center justify-center hover:bg-slate-600"
              >
                +
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMoveModal(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMove}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium"
              >
                Move {moveQty} Units
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Save Shipment</h3>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Shipment Name</label>
              <input
                autoFocus
                type="text"
                value={shipmentName}
                onChange={(e) => setShipmentName(e.target.value)}
                placeholder="e.g., PO-12345"
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsSaving(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (shipmentName.trim()) {
                    onSaveShipment(shipmentName, result);
                    setIsSaving(false);
                    setShipmentName('');
                  }
                }}
                disabled={!shipmentName.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Containers Used</div>
          <div className="text-2xl font-bold text-blue-400">{result.assignments.filter(a => a.assignedProducts.length > 0).length}</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Avg Utilization</div>
          <div className="text-2xl font-bold text-purple-400">{result.assignments.length > 0 ? (result.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / result.assignments.length).toFixed(1) : 0}%</div>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-slate-400 text-xs uppercase font-bold">Total Cost</div>
          <div className="text-2xl font-bold text-green-400">${result.assignments.reduce((sum, a) => sum + getContainerCost(a), 0).toLocaleString()}</div>
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

      {/* Split Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main Content - Containers */}
        <div className="flex-1 overflow-y-auto pr-2">
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

            {/* Add Container Modal */}
            {addContainerModal && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl max-h-[80vh] overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-4">Add Container</h3>
                  <div className="space-y-2">
                    {containers.map((container) => (
                      <button
                        key={container.id}
                        onClick={() => handleAddContainer(container)}
                        className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600 transition-colors flex justify-between items-center group"
                      >
                        <div>
                          <div className="font-medium text-slate-200">{container.name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {container.destination || 'No Destination'} • ${container.cost.toLocaleString()}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:text-white" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setAddContainerModal(false)}
                      className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                      {assignments[0]?.assignedProducts[0]?.shipToName && (
                        <span className="text-sm font-normal text-slate-400 ml-1">
                          - {assignments[0].assignedProducts[0].shipToName}
                        </span>
                      )}
                      {assignments[0]?.assignedProducts[0]?.country && (
                        <span className="text-sm font-normal text-slate-400 ml-1">
                          ({assignments[0].assignedProducts[0].country})
                        </span>
                      )}
                      <span className="text-sm font-normal text-slate-500 ml-2">
                        ({assignments.length} Containers)
                      </span>
                      <span className="text-sm font-normal text-green-400 ml-2">
                        ${assignments.reduce((sum, a) => sum + getContainerCost(a), 0).toLocaleString()}
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

                    // Group products for display
                    const productGroups: Record<string, { products: Product[], totalQty: number }> = {};
                    loadedContainer.assignedProducts.forEach(p => {
                      const key = `${p.name}-${p.formFactorId}`;
                      if (!productGroups[key]) productGroups[key] = { products: [], totalQty: 0 };
                      productGroups[key].products.push(p);
                      productGroups[key].totalQty += p.quantity;
                    });
                    const groupedProducts = Object.values(productGroups);

                    return (
                      <div
                        key={loadedContainer.container.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => onDropWrapper(e, loadedContainer.container.id)}
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
                              <span>•</span>
                              <span className="text-green-400">${getContainerCost(loadedContainer).toLocaleString()}</span>
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
                            groupedProducts.map((group, idx) => {
                              const p = group.products[0]; // Representative product
                              return (
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
                                      {group.totalQty} units
                                    </span>
                                  </div>
                                </div>
                              );
                            })
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
        </div>

        {/* Sidebar - Unassigned Items & Add Container */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Add Container Button */}
          <button
            onClick={() => setAddContainerModal(true)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors border border-slate-600"
          >
            <Box size={16} /> Add Container
          </button>

          {/* Unassigned Products */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" /> Unassigned Items
            </h3>
            <div
              className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 p-3 min-h-[200px] transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-slate-800');
                e.currentTarget.classList.add('border-blue-500');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-slate-800');
                e.currentTarget.classList.remove('border-blue-500');
              }}
              onDrop={(e) => {
                e.currentTarget.classList.remove('bg-slate-800');
                e.currentTarget.classList.remove('border-blue-500');
                onDropWrapper(e, 'unassigned');
              }}
            >
              <div className="space-y-2">
                {result.unassignedProducts.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 italic text-xs">
                    Drag items here to unassign
                  </div>
                ) : (
                  Object.values(groupedUnassigned).map((group: { products: Product[], totalQty: number }, idx) => {
                    const p = group.products[0];
                    if (!p) return null;
                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, p.id, 'unassigned')}
                        className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex justify-between items-center cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors text-sm"
                      >
                        <div className="font-medium text-slate-300 truncate">{p.name}</div>
                        <div className="text-red-400 font-bold text-xs ml-2">{group.totalQty}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
