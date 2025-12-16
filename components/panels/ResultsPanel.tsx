
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizationResult, Container, Product, OptimizationPriority, LoadedContainer, CSVMapping, ProductFormFactor } from '../../types';
import { AlertTriangle, Box, X, ChevronDown, ChevronRight, MapPin, Save, Trash2, Zap, RefreshCw, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResultsPanelProps {
  results: Record<OptimizationPriority, OptimizationResult> | null;
  activePriority: OptimizationPriority;
  setActivePriority: (p: OptimizationPriority) => void;
  containers: Container[];
  countries: CountryData[];
  handleDragStart: (e: React.DragEvent, productId: string, sourceId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetId: string, quantity?: number) => void;
  draggedProductId: string | null;
  onClose: () => void;
  onSaveShipment: (name: string, result: OptimizationResult) => void;
  optimalRange?: { min: number; max: number };
  onAddContainer?: (container: Container) => void;
  onDeleteContainer?: (containerId: string, priority: OptimizationPriority) => void;
  onRunOptimization: (respectCurrentAssignments?: boolean) => void;
  isOptimizing: boolean;
  products: Product[];
  selectedProductIds: Set<string>;
  formFactors: ProductFormFactor[];
  csvMapping?: CSVMapping;
}

interface CountryData {
  code?: string;
  name?: string;
  containerCosts?: Record<string, number>;
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
  _draggedProductId,
  onClose,
  onSaveShipment,
  optimalRange = { min: 85, max: 100 },
  onAddContainer,
  onDeleteContainer,
  onRunOptimization,
  isOptimizing,
  products,
  selectedProductIds,
  _formFactors,
  csvMapping
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const result = results ? results[activePriority] : null;
  const [shipmentName, setShipmentName] = useState('');
  const [addContainerModal, setAddContainerModal] = useState(false);
  const [deleteContainerModal, setDeleteContainerModal] = useState<string | null>(null);

  const handleAddContainer = (container: Container) => {
    if (onAddContainer) {
      onAddContainer(container);
      setAddContainerModal(false);
    }
  };

  const handleDeleteContainer = (containerId: string) => {
    if (onDeleteContainer) {
      onDeleteContainer(containerId, activePriority);
      setDeleteContainerModal(null);
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
      if (country.containerCosts) {
        if (country.code) costs[country.code] = country.containerCosts;
        if (country.name) costs[country.name] = country.containerCosts;
      }
    });
    return costs;
  }, [countries]);

  // Transform countries data into countryWeightLimits map
  const countryWeightLimits = React.useMemo(() => {
    const limits: Record<string, Record<string, number>> = {};
    countries.forEach((country: any) => {
      if (country.weightLimits) {
        if (country.code) limits[country.code] = country.weightLimits;
        if (country.name) limits[country.name] = country.weightLimits;
      }
    });
    return limits;
  }, [countries]);

  // Helper to get cost for a container
  const getContainerCost = (loadedContainer: LoadedContainer) => {
    const country = loadedContainer.assignedProducts[0]?.country;
    // Strip the -instance-XX suffix from container ID for cost lookup
    const baseContainerId = loadedContainer.container.id.replace(/-instance-\d+$/, '');
    const countryCost = countryCosts[country]?.[baseContainerId];
    return countryCost ?? loadedContainer.container.cost;
  };

  // Helper to get weight limit for a container
  const getContainerWeightLimit = (loadedContainer: LoadedContainer) => {
    const country = loadedContainer.assignedProducts[0]?.country;
    if (!country) return undefined;
    const baseContainerId = loadedContainer.container.id.replace(/-instance-\d+$/, '');
    return countryWeightLimits[country]?.[baseContainerId];
  };

  // Helper to calculate total weight for a container
  const getContainerWeight = (loadedContainer: LoadedContainer) => {
    return loadedContainer.assignedProducts.reduce((sum, p) => sum + (p.weight || 0), 0);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [previewQuantities, setPreviewQuantities] = useState<Record<string, number>>({});
  const [collapsedDestinations, setCollapsedDestinations] = useState<Set<string>>(new Set());

  // Handler to unassign all units of a product from a container
  const handleUnassignProduct = (productId: string, containerId: string) => {
    // Create a mock drag event to trigger the existing drop handler
    const mockEvent = {
      preventDefault: () => { },
      dataTransfer: {
        getData: (key: string) => {
          if (key === "productId") return productId;
          if (key === "sourceId") return containerId;
          return "";
        }
      },
      currentTarget: {
        classList: {
          add: () => { },
          remove: () => { }
        }
      }
    } as unknown as React.DragEvent;

    onDropWrapper(mockEvent, 'unassigned');
  };

  // Handle quantity change for preview
  const handleQuantityChange = (groupKey: string, quantity: number, maxQty: number) => {
    setPreviewQuantities(prev => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[groupKey];
      } else {
        next[groupKey] = Math.min(quantity, maxQty);
      }
      return next;
    });
  };

  // Group unassigned products by name and form factor
  const groupedUnassigned = React.useMemo(() => {
    if (!result) return {};
    return result.unassignedProducts.reduce((acc, p) => {
      // Include destination, shipToName, and shippingAvailableBy in the grouping key
      // to ensure items with different logistics requirements are not merged.
      const key = `${p.name}-${p.formFactorId}-${p.destination || ''}-${p.shipToName || ''}-${p.shippingAvailableBy || ''}`;
      if (!acc[key]) acc[key] = { products: [], totalQty: 0 };
      acc[key].products.push(p);
      acc[key].totalQty += p.quantity;
      return acc;
    }, {} as Record<string, { products: Product[], totalQty: number }>);
  }, [result?.unassignedProducts]);

  // Calculate utilization preview for selected products
  const utilizationPreview = React.useMemo(() => {
    const result = results ? results[activePriority] : null;
    if (!result || Object.keys(previewQuantities).length === 0) return null;

    // Use groupedUnassigned to find selected items with specific quantities
    const selectedItems: { product: Product, quantity: number }[] = [];
    Object.entries(previewQuantities).forEach(([key, qty]) => {
      // Skip items with 0 or negative quantity
      if (Number(qty) <= 0) return;

      const group = groupedUnassigned[key];
      if (group && group.products.length > 0) {
        // Use the first product as representative for form factor/restrictions
        selectedItems.push({
          product: group.products[0],
          quantity: Number(qty)
        });
      }
    });

    if (selectedItems.length === 0) return null;

    // Filter by matching destination - only include products with same destination as first selected
    const firstDestination = selectedItems[0]?.product.destination;
    const filteredItems = selectedItems.filter(item => item.product.destination === firstDestination);

    if (filteredItems.length === 0) return null;

    // Group selected items by form factor
    const itemsByFormFactor = filteredItems.reduce((acc: Record<string, number>, item: { product: Product, quantity: number }) => {
      const p = item.product;
      const formFactorId = p.formFactorId;
      if (typeof acc[formFactorId] !== 'number') {
        acc[formFactorId] = 0;
      }
      acc[formFactorId] = (acc[formFactorId] || 0) + Number(item.quantity);
      return acc;
    }, {} as Record<string, number>);

    // Calculate total units from filtered items
    const totalUnits = filteredItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    // Collect all unique restrictions from selected items
    const productRestrictions = new Set<string>();
    filteredItems.forEach(item => {
      item.product.restrictions?.forEach(r => productRestrictions.add(r));
    });

    // Check if items can be grouped together (same destination)
    const destinations = new Set(filteredItems.map(item => item.product.destination));
    const canGroup = destinations.size === 1;

    // Calculate utilization for each container
    const containerPreviews = containers.map(container => {
      // Check if container capabilities meet ALL product requirements
      const containerCapabilities = new Set(container.restrictions || []);
      const meetsRequirements = Array.from(productRestrictions).every(req =>
        containerCapabilities.has(req)
      );

      // Calculate utilization based on capacities
      let maxUtilization = 0;
      let fits = true;

      for (const [formFactorId, quantity] of Object.entries(itemsByFormFactor)) {
        const capacity = container.capacities[formFactorId];
        if (!capacity || typeof capacity !== 'number' || capacity === 0) {
          fits = false;
          maxUtilization = 100;
          break;
        }
        // Explicitly convert to number to satisfy TypeScript
        const capacityNum = Number(capacity);
        const utilization = (Number(quantity) / capacityNum) * 100;
        maxUtilization = Math.max(maxUtilization, utilization);
        if (utilization > 100) {
          fits = false;
        }
      }

      return {
        container,
        utilization: maxUtilization,
        meetsRequirements,
        fits: fits && meetsRequirements && maxUtilization <= 100
      };
    }); // Removed filter - show all containers

    return {
      itemsByFormFactor,
      canGroup,
      destinations: Array.from(destinations),
      productRestrictions: Array.from(productRestrictions),
      containerPreviews,
      selectedCount: selectedItems.length,
      includedCount: filteredItems.length,
      excludedCount: selectedItems.length - filteredItems.length,
      filterDestination: firstDestination,
      totalUnits // Add total units for display
    };
  }, [results, activePriority, previewQuantities, containers, groupedUnassigned]);

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
    // Calculate total quantity of identical items in source
    const identicalProducts = productsInSource.filter(p => {
      // Must match name and form factor
      if (p.name !== templateProd.name || p.formFactorId !== templateProd.formFactorId) return false;

      // Must also match stricter grouping criteria (Destination, ShipTo, Date)
      // to avoid merging different shipments
      if (p.destination !== templateProd.destination) return false;
      if (p.shipToName !== templateProd.shipToName) return false;
      if (p.shippingAvailableBy !== templateProd.shippingAvailableBy) return false;

      return true;
    });

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



  if (!results || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-card/50 rounded-xl border border-border border-dashed min-h-[400px]">
        <Box size={48} className="mb-4 opacity-50" />
        <p className="mb-6">{t('results.noResults')}</p>
        <div className="flex gap-4">
          <button
            onClick={() => onRunOptimization(false)}
            disabled={products.length === 0 || containers.length === 0 || isOptimizing}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg ${products.length > 0 && containers.length > 0
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
          >
            {isOptimizing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
            {isOptimizing ? t('header.optimizing') : "Optimize (Standard)"}
          </button>

          <button
            onClick={() => onRunOptimization(true)}
            disabled={products.length === 0 || containers.length === 0 || isOptimizing}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg ${products.length > 0 && containers.length > 0
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
          >
            {isOptimizing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
            {t('header.respectCurrent')}
          </button>
        </div>
      </div >
    );
  }

  // Calculate warnings
  const selectedCount = selectedProductIds.size > 0 ? selectedProductIds.size : products.length;
  const hasNoProducts = products.length === 0;
  const hasNoContainers = containers.length === 0;
  // Check for products with missing form factors if needed, but for now just general warnings
  const warnings = [];
  if (hasNoProducts) warnings.push(t('products.noProducts'));
  if (hasNoContainers) warnings.push(t('containers.noContainers'));
  if (selectedProductIds.size === 0 && products.length > 0) warnings.push(t('products.allSelectedDefault'));



  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 px-6 pt-4 pb-2 border-border">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{t('results.title')}</h2>
            {/* Priority Tabs - Inline */}
            <Tabs value={activePriority} onValueChange={(value) => setActivePriority(value as OptimizationPriority)}>
              <TabsList className="h-7">
                {Object.values(OptimizationPriority).map((priority) => (
                  <TabsTrigger key={priority} value={priority} className="text-xs px-3 py-1 h-6">
                    {priority}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-3">
            {/* Warnings / Info */}
            <div className="flex flex-col items-end mr-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Box size={12} />
                <span>{t('results.productsSelected', { count: selectedCount })}</span>
              </div>
              {warnings.length > 0 && (
                <div className="text-[10px] text-warning flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {warnings[0]}
                </div>
              )}
            </div>

            {/* Optimize Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => onRunOptimization(false)}
                disabled={hasNoProducts || hasNoContainers || isOptimizing}
                size="sm"
                title="Standard Optimization"
              >
                {isOptimizing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                {isOptimizing ? t('header.optimizing') : t('header.runOptimization')}
              </Button>
              <Button
                onClick={() => onRunOptimization(true)}
                disabled={hasNoProducts || hasNoContainers || isOptimizing}
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600/50 hover:bg-green-500/10"
                title="Respect Current Assignments"
              >
                <Zap size={14} className="mr-1" />
                {t('header.respectCurrent')}
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setIsSaving(true)}>
              <Save size={14} /> {t('common.save')}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Move Quantity Modal */}
      {
        moveModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-xl border border-border w-80 shadow-2xl">
              <h3 className="text-lg font-bold text-foreground mb-2">{t('results.moveItems')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('results.moveItemsDescription', { productName: moveModal.productName })}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setMoveQty(Math.max(1, moveQty - 1))}
                  className="w-8 h-8 rounded bg-muted text-foreground flex items-center justify-center hover:bg-muted/80"
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
                  <div className="text-xs text-muted-foreground">{t('results.ofAvailable', { maxQty: moveModal.maxQty })}</div>
                </div>
                <button
                  onClick={() => setMoveQty(Math.min(moveModal.maxQty, moveQty + 1))}
                  className="w-8 h-8 rounded bg-muted text-foreground flex items-center justify-center hover:bg-muted/80"
                >
                  +
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setMoveModal(null)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmMove}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  {t('results.moveUnits', { count: moveQty })}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Container Confirmation Modal */}
      {
        deleteContainerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-xl border border-border w-96 shadow-2xl">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Trash2 size={20} className="text-red-400" />
                {t('containers.deleteTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t('containers.deleteConfirmation')}
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteContainerModal(null)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteContainer(deleteContainerModal)}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {t('containers.deleteTitle')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Save Modal */}
      {
        isSaving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-xl border border-border w-96 shadow-xl">
              <h3 className="text-lg font-bold text-foreground mb-4">{t('results.saveShipment')}</h3>
              <div className="mb-4">
                <label className="block text-xs text-muted-foreground mb-1">{t('results.shipmentName')}</label>
                <input
                  autoFocus
                  type="text"
                  value={shipmentName}
                  onChange={(e) => setShipmentName(e.target.value)}
                  placeholder={t('results.shipmentNamePlaceholder')}
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:border-primary outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsSaving(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
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
                  {t('results.saveShipment')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Compact Summary Stats - Inline */}
      <div className="flex items-center gap-4 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">{t('results.totalContainers')}:</span>
          <span className="text-sm font-bold">{result.assignments.length}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">{t('results.totalCost')}:</span>
          <span className="text-sm font-bold text-success">€{result.totalCost.toLocaleString()}</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">{t('results.unassignedItems')}:</span>
          <span className="text-sm font-bold text-destructive">{result.unassignedProducts.length}</span>
        </div>
        {result.reasoning && (
          <>
            <div className="h-3 w-px bg-border" />
            <div className="relative group cursor-help">
              <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Info size={14} />
                <span className="hidden sm:inline">Strategy</span>
              </div>
              {/* Tooltip on hover */}
              <div className="absolute left-0 top-full mt-2 z-50 hidden group-hover:block w-80 p-3 bg-popover border border-border rounded-lg shadow-xl">
                <div className="text-xs font-semibold text-foreground mb-1">Optimization Strategy</div>
                <div className="text-xs text-muted-foreground whitespace-pre-line">{result.reasoning}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Split Content Area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Unassigned Items & Add Container (LEFT, 20%) */}
        <div className="w-1/5 min-w-[250px] flex-shrink-0 flex flex-col overflow-hidden gap-2">
          {/* Sticky Add Container Button */}
          <Button
            onClick={() => setAddContainerModal(true)}
            variant="secondary"
            className="flex-shrink-0 w-full"
          >
            <Box size={14} /> Add Container
          </Button>

          {/* Search Bar */}
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-shrink-0 h-8 text-xs"
          />

          {/* Unassigned Items Header */}
          <div className="flex-shrink-0 flex items-center gap-2 text-xs font-semibold">
            <AlertTriangle size={14} className="text-destructive" />
            Unassigned Items
          </div>

          {/* Scrollable Products List */}
          <div
            className="flex-1 bg-card rounded-xl border border-border p-2 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-primary/10');
              e.currentTarget.classList.add('border-primary');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-primary/10');
              e.currentTarget.classList.remove('border-primary');
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove('bg-primary/10');
              e.currentTarget.classList.remove('border-primary');
              onDropWrapper(e, 'unassigned');
            }}
          >
            <div className="space-y-1.5">
              {result.unassignedProducts.length === 0 ? (
                <div className="text-center text-muted-foreground py-4 italic text-[10px]">
                  Drag items here to unassign
                </div>
              ) : (
                Object.entries(groupedUnassigned)
                  .filter(([key, group]: [string, { products: Product[], totalQty: number }], idx) => {
                    const p = group.products[0];
                    if (!p) return false;

                    // Filter by search query
                    if (!p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                      return false;
                    }

                    // Filter by destination if any product is selected
                    if (Object.keys(previewQuantities).length > 0 && utilizationPreview) {
                      // Only show products matching the destination of selected items
                      if (p.destination !== utilizationPreview.filterDestination) {
                        return false;
                      }
                    }

                    return true;
                  })
                  .map(([groupKey, group]: [string, { products: Product[], totalQty: number }], idx) => {
                    const p = group.products[0];
                    if (!p) return null;
                    const previewQty = previewQuantities[groupKey] || 0;
                    const isPreviewing = previewQty > 0;

                    return (
                      <div
                        key={groupKey}
                        className={`bg-popover p-2 rounded-lg border flex items-center gap-3 transition-all ${isPreviewing ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(139,92,246,0.1)]' : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max={group.totalQty}
                            value={previewQty || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              handleQuantityChange(groupKey, val, group.totalQty);
                            }}
                            className="w-12 h-7 bg-background border border-border rounded text-center text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                          />
                          <button
                            onClick={() => handleQuantityChange(groupKey, group.totalQty, group.totalQty)}
                            className="text-[9px] font-bold text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors hover:bg-muted px-1 rounded"
                          >
                            Max
                          </button>
                        </div>
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id, 'unassigned')}
                          className="flex-1 flex justify-between items-center cursor-grab active:cursor-grabbing min-w-0"
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="font-medium text-foreground truncate text-[11px]">{p.name}</div>
                            {p.destination && (
                              <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                                <MapPin size={8} />
                                <span className="truncate">{p.destination.split('|')[0]}</span>
                              </div>
                            )}
                            {/* Display Extra Fields in Sidebar */}
                            {csvMapping?.displayFields?.map(fieldKey => {
                              let val: any;
                              if (Object.prototype.hasOwnProperty.call(p, fieldKey)) {
                                val = (p as any)[fieldKey];
                              } else {
                                val = p.extraFields?.[fieldKey];
                              }

                              if (val === undefined || val === null || val === '') return null; // Only hide if truly empty or not found

                              // Ensure val is a string for display consistency, handle booleans specifically if needed
                              const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                              return (
                                <div key={fieldKey} className="text-[9px] text-muted-foreground mt-0.5 truncate">
                                  <span className="opacity-70 capitalize">{fieldKey}:</span> {displayVal}
                                </div>
                              );
                            })}
                          </div>
                          <div className="text-red-400 font-bold text-[10px] ml-1 flex-shrink-0">{group.totalQty}</div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Utilization Preview - Always Visible */}
          {utilizationPreview && (
            <div className="flex-shrink-0 p-2 bg-card/50 rounded-lg border border-border">
              <h4 className="text-[10px] font-semibold text-foreground mb-1.5">
                Previewing: {utilizationPreview.totalUnits} unit{utilizationPreview.totalUnits !== 1 ? 's' : ''}
                {utilizationPreview.filterDestination && (
                  <span className="text-blue-400 ml-1">
                    → {utilizationPreview.filterDestination.split('|')[0]}
                  </span>
                )}
                {utilizationPreview.excludedCount > 0 && (
                  <span className="text-orange-400 ml-1">
                    ({utilizationPreview.excludedCount} group{utilizationPreview.excludedCount !== 1 ? 's' : ''} excluded - different destination)
                  </span>
                )}
              </h4>

              {utilizationPreview.productRestrictions.length > 0 && (
                <div className="mb-1.5 p-1.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-400">
                  {utilizationPreview.productRestrictions.join(', ')}
                </div>
              )}

              <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-hide">
                {utilizationPreview.containerPreviews.map((preview) => {
                  // Determine color scheme based on compatibility and fit
                  let bgColor, borderColor, textColor;
                  if (!preview.meetsRequirements) {
                    bgColor = 'bg-muted/30';
                    borderColor = 'border-border';
                    textColor = 'text-muted-foreground';
                  } else if (preview.fits) {
                    bgColor = 'bg-green-500/10';
                    borderColor = 'border-green-500/30';
                    textColor = 'text-green-400';
                  } else {
                    bgColor = 'bg-red-500/10';
                    borderColor = 'border-red-500/30';
                    textColor = 'text-red-400';
                  }

                  return (
                    <div
                      key={preview.container.id}
                      className={`p-1.5 rounded text-[10px] ${bgColor} border ${borderColor}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`${textColor} truncate`}>
                          {preview.container.name}
                        </span>
                        <span className={`font-bold ${textColor} ml-1`}>
                          {preview.utilization.toFixed(1)}%
                        </span>
                      </div>
                      {!preview.meetsRequirements && (
                        <div className="text-muted-foreground text-[9px] mt-0.5">Missing capabilities</div>
                      )}
                      {preview.meetsRequirements && !preview.fits && preview.utilization > 100 && (
                        <div className="text-red-300 text-[9px] mt-0.5">Too large</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div >

        {/* Main Content - Containers (RIGHT, 80%) */}
        < div className="flex-1 flex flex-col overflow-hidden" >
          {/* Sticky Collapse All Button */}
          < div className="flex-shrink-0 pb-3 flex justify-end sticky top-0 bg-background z-10" >
            <button
              onClick={() => {
                if (collapsedDestinations.size === Object.keys(groupedAssignments).length) {
                  setCollapsedDestinations(new Set());
                } else {
                  setCollapsedDestinations(new Set(Object.keys(groupedAssignments)));
                }
              }}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              {collapsedDestinations.size === Object.keys(groupedAssignments).length ? 'Expand All' : 'Collapse All'}
            </button>
          </div >

          {/* Scrollable Assignments Area */}
          < div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" >
            {/* Assignments Visualizer */}
            < div className="space-y-8" >

              {/* Add Container Modal */}
              {
                addContainerModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card p-6 rounded-xl border border-border w-[500px] shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <h3 className="text-lg font-bold text-foreground mb-4">Add Container</h3>

                      {/* Unassigned Products Summary */}
                      {result && result.unassignedProducts.length > 0 && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                            Unassigned Items ({result.unassignedProducts.length})
                          </h4>
                          <div className="max-h-32 overflow-y-auto scrollbar-hide space-y-1">
                            {(Object.values(groupedUnassigned) as { products: Product[], totalQty: number }[]).slice(0, 10).map((group, idx) => {
                              const p = group.products[0];
                              return (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-foreground truncate flex-1">{p.name}</span>
                                  <span className="text-red-400 font-bold ml-2">{group.totalQty}</span>
                                </div>
                              );
                            })}
                            {Object.keys(groupedUnassigned).length > 10 && (
                              <div className="text-xs text-muted-foreground italic">
                                +{Object.keys(groupedUnassigned).length - 10} more...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Container Selection */}
                      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
                        {containers.map((container) => (
                          <button
                            key={container.id}
                            onClick={() => handleAddContainer(container)}
                            className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors flex justify-between items-center group"
                          >
                            <div>
                              <div className="font-medium text-foreground">{container.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {container.destination || 'No Destination'} • ${container.cost.toLocaleString()}
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setAddContainerModal(false)}
                          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }

              {
                Object.entries(groupedAssignments).map(([destination, assignments]: [string, LoadedContainer[]]) => {
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
                      : 'text-foreground';

                  const borderColorClass = hasIssues
                    ? 'border-red-900/50'
                    : hasUtilizationWarning
                      ? 'border-yellow-900/50'
                      : 'border-border';

                  return (
                    <div key={destination} className={`space-y-4 rounded-xl border p-4 ${borderColorClass} ${isCollapsed && (hasIssues || hasUtilizationWarning) ? 'bg-card/50' : ''}`}>
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => toggleDestination(destination)}
                      >
                        {isCollapsed ? <ChevronRight size={20} className="text-muted-foreground" /> : <ChevronDown size={20} className="text-muted-foreground" />}
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${headerColorClass}`}>
                          <MapPin size={18} />
                          {destination === 'Unspecified Destination' ? 'Unspecified Destination' : destination.split('|')[0]}
                          {assignments[0]?.assignedProducts[0]?.shipToName && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              - {assignments[0].assignedProducts[0].shipToName}
                            </span>
                          )}
                          {assignments[0]?.assignedProducts[0]?.country && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              ({assignments[0].assignedProducts[0].country})
                            </span>
                          )}
                          <span className="text-sm font-normal text-muted-foreground ml-2">
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
                        <div className="h-px bg-border flex-1 ml-4 group-hover:bg-primary/30 transition-colors" />
                      </div>

                      {!isCollapsed && assignments.map((loadedContainer) => {
                        // Extract instance number from ID (format: templateId-instance-N)
                        const instanceMatch = loadedContainer.container.id.match(/-instance-(\d+)$/);
                        const instanceNumber = instanceMatch ? `#${instanceMatch[1]} ` : '';

                        const isLowUtilization = loadedContainer.totalUtilization < optimalRange.min;
                        const isOptimal = loadedContainer.totalUtilization >= optimalRange.min && loadedContainer.totalUtilization <= optimalRange.max;

                        // Group products for display
                        const productGroups: Record<string, { products: Product[], totalQty: number }> = {};
                        loadedContainer.assignedProducts.forEach(p => {
                          const key = `${p.name}-${p.formFactorId}-${p.destination || ''}-${p.shipToName || ''}-${p.shippingAvailableBy || ''}`;
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
                            className={`bg-popover rounded-lg border transition-all duration-200 
                    ${(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) ? 'border-destructive' : 'border-border'}
`}
                          >
                            <div className={`p-3 border-b border-border flex justify-between items-center ${(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) ? 'bg-destructive/20' : 'bg-card/80'
                              } `}>
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                  {loadedContainer.container.name} {instanceNumber && <span className="text-muted-foreground text-sm font-normal">{instanceNumber}</span>}
                                  {(loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0) && (
                                    <span className="text-red-400 flex items-center gap-1 text-xs bg-red-900/30 px-2 py-0.5 rounded-full">
                                      <AlertTriangle size={12} /> Issues Found
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                                  <span>{loadedContainer.container.destination || 'No Dest'}</span>
                                  <span>•</span>
                                  <span>{loadedContainer.container.restrictions.join(', ') || 'No Restrictions'}</span>
                                  <span>•</span>
                                  <span className="text-green-400">${getContainerCost(loadedContainer).toLocaleString()}</span>
                                  {(() => {
                                    const weight = getContainerWeight(loadedContainer);
                                    const limit = getContainerWeightLimit(loadedContainer);
                                    if (weight > 0) {
                                      return (
                                        <>
                                          <span>•</span>
                                          <span className={`${limit && weight > limit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                            {weight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                                            {limit ? ` / ${limit.toLocaleString()} kg` : ''}
                                          </span>
                                        </>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <button
                                  onClick={() => setDeleteContainerModal(loadedContainer.container.id)}
                                  className="text-destructive hover:text-destructive/80 transition-colors p-1 rounded hover:bg-destructive/10"
                                  title="Delete container"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div>
                                  <div className={`text-2xl font-bold ${isLowUtilization ? 'text-yellow-500' : isOptimal ? 'text-green-400' : 'text-blue-400'}`}>
                                    {loadedContainer.totalUtilization.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">Utilization</div>
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 bg-muted w-full">
                              <div
                                className={`h-full transition-all duration-500 ${isLowUtilization ? 'bg-yellow-500' : isOptimal ? 'bg-green-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(loadedContainer.totalUtilization, 100)}%` }}
                              />
                            </div>

                            {/* Products List */}
                            <div className="p-3 space-y-2">
                              {loadedContainer.assignedProducts.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm italic">Empty Container</div>
                              ) : (
                                groupedProducts.map((group, idx) => {
                                  const p = group.products[0]; // Representative product
                                  return (
                                    <div
                                      key={`${p.id} -${idx} `}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, p.id, loadedContainer.container.id)}
                                      className="bg-muted/50 p-2 rounded border border-border/50 flex justify-between items-center text-sm hover:bg-muted cursor-grab active:cursor-grabbing group"
                                    >
                                      <div className="flex flex-col gap-1 overflow-hidden flex-1 min-w-0 mr-3">
                                        <div className="flex items-center gap-2">
                                          <Box size={14} className="text-primary shrink-0" />
                                          <span className="truncate text-foreground font-medium" title={p.name}>{p.name}</span>
                                        </div>
                                        {/* Extra Fields in Container */}
                                        {csvMapping?.displayFields?.length > 0 && (
                                          <div className="flex flex-wrap gap-x-3 gap-y-1 ml-5">
                                            {csvMapping.displayFields.map(fieldKey => {
                                              let val: any;
                                              if (Object.prototype.hasOwnProperty.call(p, fieldKey)) {
                                                val = (p as any)[fieldKey];
                                              } else {
                                                val = p.extraFields?.[fieldKey];
                                              }

                                              if (val === undefined || val === null || val === '') return null;

                                              const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                                              const label = csvMapping.customFields[fieldKey] || fieldKey.replace(/([A-Z])/g, ' $1').trim();

                                              return (
                                                <span key={fieldKey} className="text-[10px] text-foreground/70" title={`${label}: ${displayVal}`}>
                                                  <span className="font-semibold text-foreground/60 mr-1">{label}:</span>{displayVal}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-muted-foreground text-xs bg-muted px-2 py-0.5 rounded">
                                          {group.totalQty} units
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnassignProduct(p.id, loadedContainer.container.id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
                                          title="Unassign all units"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}

                              {/* Validation Issues */}
                              {loadedContainer.validationIssues && loadedContainer.validationIssues.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                                    <AlertTriangle size={14} />
                                    Validation Issues:
                                  </div>
                                  <ul className="space-y-1">
                                    {Array.from(new Set(loadedContainer.validationIssues)).map((issue, idx) => (
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
                })
              }
            </div >
          </div >
        </div >
      </div >
    </div >
  );
};

export default ResultsPanel;
