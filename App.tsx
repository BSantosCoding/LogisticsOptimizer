
import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Container as ContainerIcon,
  Settings,
  Shield,
  Building2,
  Users,
  LogOut,
  BarChart3,
  ChevronDown,
  Check,
  Box,
  Globe,
  UserCog
} from 'lucide-react';
import Auth from './components/Auth';
import ProductPanel from './components/panels/ProductPanel';
import ContainerPanel from './components/panels/ContainerPanel';
import ConfigPanel from './components/panels/ConfigPanel';
import UserSettingsPanel from './components/panels/UserSettingsPanel';
import ManagementPanel from './components/panels/ManagementPanel';
import CountryPanel from './components/panels/CountryPanel';
import FormFactorPanel from './components/panels/FormFactorPanel';
import ResultsPanel from './components/panels/ResultsPanel';
import ShipmentPanel from './components/panels/ShipmentPanel';
import SuperAdminPanel from './components/panels/SuperAdminPanel';
import ErrorModal from './components/modals/ErrorModal';
import ImportConfirmModal from './components/modals/ImportConfirmModal';
import ImportSummaryModal from './components/modals/ImportSummaryModal';
import ConfirmModal from './components/modals/ConfirmModal';
import SetupWizard from './components/SetupWizard';
import PendingApproval from './components/PendingApproval';

import { Container, Product, Shipment, UserProfile, OptimizationPriority } from './types';
import { hasRole, getAvailableViewRoles, getRoleLabel } from './utils/roles';
import { supabase } from './services/supabase';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useOptimization } from './hooks/useOptimization';
import { parseProductsCSV } from './services/importService';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ThemeToggle } from './components/ThemeToggle';

// Shadcn UI
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

const App: React.FC = () => {
  const { t } = useTranslation();
  // --- Hooks ---
  const {
    session,
    loadingSession,
    companyId,
    companyName,
    approvalStatus,
    userRole,
    userProfile,
    viewAsRole,
    setViewAsRole,
    isSetupRequired,
    logout,
    refreshAuth
  } = useAuth();

  const effectiveRole = viewAsRole || userRole;

  const {
    products,
    setProducts,
    containers,
    setContainers,
    templates,
    setTemplates,
    formFactors,
    countries,
    setCountries,
    shipments,
    setShipments,
    restrictionTags,
    setRestrictionTags,
    isDataLoading,
    refreshData,
    addProduct,
    updateProduct,
    removeProduct,
    addContainer,
    updateContainer,
    removeContainer,
    addFormFactor,
    updateFormFactor,
    removeFormFactor,
    addShipment,
    csvMapping,
    updateCsvMapping,
    optimizerSettings,
    updateOptimizerSettings
  } = useAppData(companyId, session?.user?.id);

  // --- App State ---
  const [inputMode, setInputMode] = useState<'products' | 'containers' | 'config' | 'team' | 'countries' | 'shipments' | 'management' | 'super_admin' | 'user_settings'>('products');
  const [viewMode, setViewMode] = useState<'data' | 'results'>('data');
  const [pendingReoptimize, setPendingReoptimize] = useState(false);

  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [optimalUtilizationRange, setOptimalUtilizationRange] = useState<{ min: number; max: number }>(() => {
    try {
      const saved = localStorage.getItem('optimalUtilizationRange');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.min === 'number' && typeof parsed.max === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved optimal range:', e);
      localStorage.removeItem('optimalUtilizationRange');
    }
    return { min: 85, max: 100 };
  });

  useEffect(() => {
    try {
      localStorage.setItem('optimalUtilizationRange', JSON.stringify(optimalUtilizationRange));
    } catch (e) {
      console.error('Failed to save optimal range to localStorage:', e);
    }
  }, [optimalUtilizationRange]);

  // Filter out shipped products for optimization and results view
  const activeProducts = React.useMemo(() => products.filter(p => p.status !== 'shipped'), [products]);

  const resetResultsToDefault = () => {
    setResults({
      [OptimizationPriority.AUTOMATIC]: {
        assignments: [],
        unassignedProducts: [],
        totalCost: 0,
        reasoning: ''
      },
      [OptimizationPriority.MANUAL]: {
        assignments: [],
        unassignedProducts: [...activeProducts],
        totalCost: 0,
        reasoning: 'Manual planning mode'
      }
    });
    setActivePriority(OptimizationPriority.MANUAL);
  };

  // Optimization Hook
  const {
    results,
    setResults,
    activePriority,
    setActivePriority,
    isOptimizing,
    draggedProductId,
    handleRunOptimization: runOptimization,
    handleDragStart,
    handleDrop,
    handleAddContainer: addContainerInstance,
    handleDeleteContainer: deleteContainerInstance
  } = useOptimization(activeProducts, containers, countries, selectedProductIds, selectedContainerIds, optimalUtilizationRange, optimizerSettings.allowUnitSplitting, optimizerSettings.shippingDateGroupingRange);

  // Forms
  const [newTag, setNewTag] = useState('');
  const [newTemplate, setNewTemplate] = useState<Partial<Product>>({ name: '', restrictions: [] });

  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    formFactorId: '',
    quantity: 1,
    destination: '',
    restrictions: [],
    readyDate: '',
    shipDeadline: '',
    arrivalDeadline: '',
    shippingAvailableBy: '',
    currentContainer: '',
    extraFields: {}
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [newContainer, setNewContainer] = useState<Omit<Container, 'id'>>({
    name: '',
    capacities: {},
    cost: 0,
    transitTimeDays: 0,
    availableFrom: new Date().toISOString().split('T')[0],
    destination: '',
    restrictions: []
  });
  const [editingContainerId, setEditingContainerId] = useState<string | null>(null);

  // Modals
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ products: Product[], productsWithMissingFF: string[] } | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummaryData, setImportSummaryData] = useState<{ total: number, savedToDb: number, issues: string[] } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  // --- Navigation Helpers ---
  const handleTabChange = (tab: 'products' | 'containers' | 'config' | 'team' | 'countries' | 'management') => {
    setInputMode(tab);
    setViewMode('data');
  };

  // --- DB Handlers ---
  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.formFactorId || !companyId) return;

    const productData = { ...newProduct };

    if (editingProductId) {
      const updatedProduct = { ...productData, id: editingProductId } as Product;
      updateProduct(updatedProduct);
      await supabase.from('products').update({
        data: productData,
        form_factor_id: productData.formFactorId,
        quantity: productData.quantity
      }).eq('id', editingProductId);
      setEditingProductId(null);
    } else {
      const newId = `P-${Date.now()}`;
      const newProdWithId = { ...productData, id: newId } as Product;
      addProduct(newProdWithId);
      await supabase.from('products').insert([{
        id: newId,
        company_id: companyId,
        created_by: session.user.id,
        data: productData,
        form_factor_id: productData.formFactorId,
        quantity: productData.quantity
      }]);
    }

    setNewProduct({ name: '', formFactorId: '', quantity: 1, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '', shippingAvailableBy: '', extraFields: {} });
  };

  const handleImportProducts = async (csvContent: string) => {
    if (!companyId) return;
    try {
      const { products: parsedProducts, productsWithMissingFF, missingHeaders } = parseProductsCSV(csvContent, formFactors, csvMapping);

      if (missingHeaders.length > 0) {
        setErrorModal({
          isOpen: true,
          message: `Warning: The following configured headers were not found in the CSV file:\n\n${missingHeaders.join('\n')}\n\nThe import will continue, but data from these columns will be missing.`
        });
      }

      setPendingImportData({ products: parsedProducts, productsWithMissingFF });
      setShowImportModal(true);
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      setErrorModal({ isOpen: true, message: 'Failed to parse CSV file. Please check the format.' });
    }
  };

  const confirmImport = async (saveToDb: boolean) => {
    if (!pendingImportData || !companyId) return;

    const { products: newProducts, productsWithMissingFF } = pendingImportData;

    setProducts(prev => [...prev, ...newProducts]);

    if (saveToDb) {
      const { error } = await supabase.from('products').insert(
        newProducts.map(p => ({
          id: p.id,
          company_id: companyId,
          created_by: session?.user?.id,
          data: {
            name: p.name,
            restrictions: p.restrictions,
            formFactorId: p.formFactorId,
            quantity: p.quantity,
            weight: p.weight,
            destination: p.destination,
            country: p.country,
            shipToName: p.shipToName,
            shippingAvailableBy: p.shippingAvailableBy,
            currentContainer: p.currentContainer,
            assignmentReference: p.assignmentReference,
            extraFields: p.extraFields
          },
          form_factor_id: p.formFactorId || null,
          quantity: p.quantity,
          weight: p.weight,
          destination: p.destination,
          country: p.country || null,
          ship_to_name: p.shipToName || null
        }))
      );

      if (error) console.error('Error importing products:', error);
    }

    if (productsWithMissingFF.length > 0) {
      setImportSummaryData({
        total: newProducts.length,
        savedToDb: saveToDb,
        issues: productsWithMissingFF
      });
      setShowImportSummary(true);
    }

    setShowImportModal(false);
    setPendingImportData(null);
  };

  const handleEditProduct = (p: Product) => {
    setNewProduct({
      name: p.name,
      formFactorId: p.formFactorId,
      quantity: p.quantity,
      destination: p.destination || '',
      restrictions: p.restrictions,
      readyDate: p.readyDate || '',
      shipDeadline: p.shipDeadline || '',
      arrivalDeadline: p.arrivalDeadline || '',
      currentContainer: p.currentContainer || '',
      assignmentReference: p.assignmentReference || '',
      extraFields: p.extraFields || {}
    });
    setEditingProductId(p.id);
    handleTabChange('products');
  };

  const handleRemoveProduct = async (id: string) => {
    // Check if product belongs to a shipment
    const productToDelete = products.find(p => p.id === id);
    if (!productToDelete) return;

    removeProduct(id);
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    try {
      await supabase.from('products').delete().eq('id', id);

      if (productToDelete.shipmentId) {
        // Check if shipment is now empty
        setShipments(prev => {
          let shipmentDeleted = false;
          const nextShipments = prev.map(s => {
            if (s.id === productToDelete.shipmentId) {
              const remaining = (s.products || []).filter(p => p.id !== id);
              if (remaining.length === 0) {
                shipmentDeleted = true;
                // Async delete shipment from DB if empty
                supabase.from('shipments').delete().eq('id', s.id).then(({ error }) => {
                  if (error) console.error("Failed to delete empty shipment:", error);
                });
                return null;
              }
              return { ...s, products: remaining, containerCount: s.containerCount };
            }
            return s;
          }).filter(Boolean) as Shipment[];
          return nextShipments;
        });
      }
    } catch (error) {
      console.error("Error removing product:", error);
    }
  };

  const handleCancelProductEdit = () => {
    setNewProduct({ name: '', formFactorId: '', quantity: 1, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '', shippingAvailableBy: '', currentContainer: '', extraFields: {} });
    setEditingProductId(null);
  };

  const handleSaveContainer = async () => {
    if (!newContainer.name || !companyId) return;

    const containerData = { ...newContainer };

    if (editingContainerId) {
      const updatedContainer = { ...containerData, id: editingContainerId } as Container;
      updateContainer(updatedContainer);
      await supabase.from('containers').update({
        data: containerData,
        capacities: containerData.capacities
      }).eq('id', editingContainerId);
      setEditingContainerId(null);
    } else {
      const newId = `C-${Date.now()}`;
      const newContainerWithId = { ...containerData, id: newId } as Container;
      addContainer(newContainerWithId);
      await supabase.from('containers').insert([{
        id: newId,
        company_id: companyId,
        data: containerData,
        capacities: containerData.capacities
      }]);
    }

    setNewContainer({ name: '', capacities: {}, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
  };

  const handleEditContainer = (c: Container) => {
    setNewContainer({
      name: c.name,
      capacities: c.capacities,
      cost: c.cost,
      transitTimeDays: c.transitTimeDays,
      availableFrom: c.availableFrom,
      destination: c.destination,
      restrictions: c.restrictions
    });
    setEditingContainerId(c.id);
    handleTabChange('containers');
  };

  const handleRemoveContainer = async (id: string) => {
    removeContainer(id);
    setSelectedContainerIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('containers').delete().eq('id', id);
  };

  const handleCancelContainerEdit = () => {
    setNewContainer({ name: '', capacities: {}, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
    setEditingContainerId(null);
  };

  const handleAddFormFactor = async (name: string, description: string, palletWeight?: number, unitsPerPallet?: number) => {
    if (!companyId) return;
    const newId = `FF-${Date.now()}`;
    const newFF = { id: newId, name, description, pallet_weight: palletWeight, units_per_pallet: unitsPerPallet };
    addFormFactor(newFF);

    await supabase.from('form_factors').insert([{
      id: newId,
      company_id: companyId,
      name,
      description,
      pallet_weight: palletWeight || null,
      units_per_pallet: unitsPerPallet || null
    }]);
  };

  const handleRemoveFormFactor = async (id: string) => {
    removeFormFactor(id);
    await supabase.from('form_factors').delete().eq('id', id);
  };

  const handleEditFormFactor = async (id: string, name: string, description: string, palletWeight?: number, unitsPerPallet?: number) => {
    updateFormFactor({ id, name, description, pallet_weight: palletWeight, units_per_pallet: unitsPerPallet });
    await supabase.from('form_factors').update({
      name,
      description,
      pallet_weight: palletWeight || null,
      units_per_pallet: unitsPerPallet || null
    }).eq('id', id);
  };

  // --- Shipment Handlers ---
  const handleSaveShipment = async (name: string, result: any) => {
    if (!companyId) return;

    try {
      const countryCosts: Record<string, Record<string, number>> = {};
      countries.forEach((country: any) => {
        if (country.containerCosts) {
          if (country.code) countryCosts[country.code] = country.containerCosts;
          if (country.name) countryCosts[country.name] = country.containerCosts;
        }
      });

      const totalCost = result.assignments.reduce((sum: number, a: any) => {
        const country = a.assignedProducts[0]?.country;
        const baseContainerId = a.container.id.replace(/-instance-\d+$/, '');
        const cost = (country && countryCosts[country]?.[baseContainerId]) ?? a.container.cost;
        return sum + cost;
      }, 0);

      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert([{
          company_id: companyId,
          created_by: session.user.id,
          name,
          status: 'finalized',
          total_cost: totalCost,
          container_count: result.assignments.length
        }])
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      const productUpdates: any[] = [];
      const updatedProductsMap = new Map<string, any>();

      // Generate updates for products
      let containerCounter = 1;
      const shipmentRandomId = Math.random().toString(36).substring(2, 8).toUpperCase();

      result.assignments.forEach((a: any) => {
        const containerRef = `packter-${shipmentRandomId}-${containerCounter}`;
        const containerName = a.container.name;

        // Step 1: Find a "Dominant" Hard Reference in this container, if any.
        // A Hard Reference is one that didn't originate from the system (doesn't start with 'packter-').
        // If we find one, we should group all "new" items (soft/no ref) under this ID to keep the container physically together.
        // If we find MULTIPLE distinct hard refs, we can't merge them (user forbid overwriting), so they will split.
        // We pick the first one found as the "dominant" one for new items.
        let dominantHardRef: string | null = null;

        for (const p of a.assignedProducts) {
          if (p.assignmentReference) {
            const ref = p.assignmentReference.toString();
            if (!ref.startsWith('packter-')) {
              dominantHardRef = ref;
              break; // Found one, use it.
            }
          }
        }

        a.assignedProducts.forEach((p: any) => {
          // Logic:
          // 1. If product has a "hard" reference, NEVER overwrite it.
          // 2. If product has a "soft" reference or NO reference:
          //    a. If there is a dominant hard ref in the container, inherit it as a COMPOSITE key.
          //       Format: "HARD_LINK_SOFT" (e.g. "EMP-123_LINK_packter-123...")
          //       This ensures:
          //       - Groups together in UI/Engine (by splitting on _LINK_)
          //       - Preserves "Soft" status (by checking for _LINK_ or packter) for future mutability
          //    b. Otherwise, use the new generated container ref. (New standalone group)

          let finalRef = containerRef;

          if (p.assignmentReference) {
            const ref = p.assignmentReference.toString();
            const isSystemRef = ref.startsWith('packter-') || ref.includes('_LINK_');

            if (!isSystemRef) {
              finalRef = ref; // Case 1: Keep hard reference (Pure)
            } else {
              // Case 2: System ref. 
              // If we have a dominant hard ref, link to it.
              // Else reset to new container ref.
              if (dominantHardRef) {
                // Create Composite Key: HardBase + Unique Soft ID
                // Use the *new* containerRef as the Soft ID to ensure uniqueness/freshness
                finalRef = `${dominantHardRef}_LINK_${containerRef}`;
              } else {
                finalRef = containerRef;
              }
            }
          } else {
            // Case 3: New Item
            if (dominantHardRef) {
              finalRef = `${dominantHardRef}_LINK_${containerRef}`;
            } else {
              finalRef = containerRef;
            }
          }

          const update = {
            id: p.id,
            shipment_id: shipmentData.id,
            status: 'shipped',
            data: {
              ...p,
              currentContainer: containerName,
              assignmentReference: finalRef,
              // Store unique physical container ID to strictly distinguish containers in UI
              // regardless of shared assignment references (e.g. 1 Order split across 2 containers)
              _containerInstanceId: containerRef
            }
          };

          productUpdates.push(update);
          updatedProductsMap.set(p.id, {
            currentContainer: containerName,
            assignmentReference: finalRef,
            _containerInstanceId: containerRef // Add to map for local state updates
          });
        });
        containerCounter++;
      });

      // Perform bulk update or individual updates
      // Supabase helper for bulk update might not be available, so we loop or use upsert if full rows.
      // Since we are updating specific fields in JSONB 'data' and standard cols, let's do it carefully.
      // Actually, we can just iterate and update. Efficiency might be lower but safer for now.

      const { error: productsUpdateError } = await supabase.from('products').upsert(
        productUpdates.map(u => ({
          id: u.id,
          company_id: companyId,
          shipment_id: u.shipment_id,
          status: u.status,
          created_by: session.user.id, // RLS requirement
          data: u.data
        }))
      );

      if (productsUpdateError) throw productsUpdateError;

      // Collect updated products for the new shipment
      const shipmentProducts = products.filter(p =>
        result.assignments.some((a: any) =>
          a.assignedProducts.some((ap: any) => ap.id === p.id)
        )
      ).map(p => {
        const updates = updatedProductsMap.get(p.id);
        return updates ? {
          ...p,
          shipmentId: shipmentData.id,
          status: 'shipped' as const,
          currentContainer: updates.currentContainer,
          assignmentReference: updates.assignmentReference,
          _containerInstanceId: updates._containerInstanceId
        } : p;
      });

      const newShipment: Shipment = {
        id: shipmentData.id,
        name: shipmentData.name,
        status: shipmentData.status,
        totalCost: shipmentData.total_cost,
        containerCount: shipmentData.container_count,
        products: shipmentProducts,
        createdAt: shipmentData.created_at
      };

      addShipment(newShipment);

      setProducts(prev => prev.map(p => {
        const updates = updatedProductsMap.get(p.id);
        if (updates) {
          return {
            ...p,
            shipmentId: shipmentData.id,
            status: 'shipped',
            currentContainer: updates.currentContainer,
            assignmentReference: updates.assignmentReference,
            _containerInstanceId: updates._containerInstanceId
          };
        }
        return p;
      }));

      setViewMode('data');
      setInputMode('shipments');

    } catch (error) {
      console.error('Error saving shipment:', error);
      setErrorModal({ isOpen: true, message: 'Failed to save shipment.' });
    }
  };

  const handleUnpackShipment = (shipmentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Unpack Shipment',
      message: 'Are you sure you want to unpack this shipment? All items will be returned to the "Available" list.',
      confirmText: 'Unpack',
      isDestructive: false,
      onConfirm: async () => {
        try {
          // fetch products first to check for packter refs
          const { data: productsInShipment, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('shipment_id', shipmentId);

          if (fetchError) throw fetchError;

          const updates = productsInShipment.map(p => {
            const data = p.data || {};
            let newData = { ...data };

            // Handle assignments logic
            const currentRef = String(data.assignmentReference || '');

            if (currentRef.startsWith('packter-')) {
              // Purely soft assignment - clear it and the container
              newData.assignmentReference = '';
              newData.currentContainer = '';
            } else if (currentRef.includes('_LINK_packter-')) {
              // Composite assignment (soft item in hard container). 
              // Clear ref (revert to no-ref) AND Clear container (revert to available input).
              newData.assignmentReference = '';
              newData.currentContainer = '';
            }
            // Else: Hard reference - preserve both ref and container

            return {
              id: p.id,
              company_id: companyId,
              created_by: p.created_by,
              shipment_id: null,
              status: 'available',
              data: newData
            };
          });

          if (updates.length > 0) {
            const { error: updateError } = await supabase.from('products').upsert(updates);
            if (updateError) throw updateError;
          }

          const { error: shipmentError } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

          if (shipmentError) throw shipmentError;

          setShipments(prev => prev.filter(s => s.id !== shipmentId));
          setProducts(prev => prev.map(p => {
            if (p.shipmentId === shipmentId) {
              const currentRef = String(p.data?.assignmentReference || p.assignmentReference || '');
              const currentContainerVal = p.data?.currentContainer || p.currentContainer || '';

              let newRef = currentRef;
              let newContainer = currentContainerVal;

              if (currentRef.startsWith('packter-')) {
                newRef = '';
                newContainer = '';
              } else if (currentRef.includes('_LINK_packter-')) {
                // Was a soft item inheriting a hard ref. Clear ref AND container to revert to available input.
                newRef = '';
                newContainer = '';
              }

              return {
                ...p,
                shipmentId: null,
                status: 'available',
                assignmentReference: newRef,
                currentContainer: newContainer,
                data: {
                  ...p.data,
                  assignmentReference: newRef,
                  currentContainer: newContainer
                }
              };
            }
            return p;
          }));
        } catch (error) {
          console.error('Error unpacking shipment:', error);
          setErrorModal({ isOpen: true, message: 'Failed to unpack shipment.' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleLoadBasePlan = (shipmentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Load as Base Plan',
      message: 'This will unpack the shipment and load its items for re-optimization. The shipment record will be removed. Continue?',
      confirmText: 'Load & Re-optimize',
      onConfirm: async () => {
        try {
          // Fetch current product data to handle references
          const { data: productsInShipment, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('shipment_id', shipmentId);

          if (fetchError) throw fetchError;

          // Map to track packter reference conversions to keep groups together
          const packterRefMap = new Map<string, string>();

          const productsToUpdate = productsInShipment.map(p => {
            let assignmentReference = p.data?.assignmentReference || p.assignmentReference; // specific field or data field

            // If it's a packter reference, convert to manual to preserve grouping but enable editing
            if (assignmentReference && String(assignmentReference).startsWith('packter-')) {
              if (!packterRefMap.has(assignmentReference)) {
                packterRefMap.set(assignmentReference, `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
              }
              assignmentReference = packterRefMap.get(assignmentReference);
            } else if (assignmentReference && String(assignmentReference).includes('_LINK_packter-')) {
              // Composite reference: Clear ref and container to revert to available input
              assignmentReference = '';
            }

            // Determine if container should be cleared. 
            // If we cleared the reference (manually or via link logic above), we might want to clear container too?
            // Actually simpler: if assignmentReference is empty string (after logic above), clear container.
            // But wait, Manual No-Ref items exist?
            // Logic specific to _LINK_:
            let currentContainer = p.currentContainer;
            if (p.data?.assignmentReference?.includes('_LINK_packter-')) {
              currentContainer = '';
            }

            return {
              ...p,
              company_id: companyId,
              created_by: p.created_by,
              shipment_id: null,
              status: 'available',
              currentContainer, // Explicitly update top-level
              data: {
                ...p.data,
                assignmentReference,
                currentContainer // Update data level
              }
            };
          });

          // Perform upsert to update all products
          const { error: updateError } = await supabase
            .from('products')
            .upsert(productsToUpdate);

          if (updateError) throw updateError;

          const { error: shipmentError } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

          if (shipmentError) throw shipmentError;

          setShipments(prev => prev.filter(s => s.id !== shipmentId));
          setProducts(prev => {
            const updatedMap = new Map(productsToUpdate.map(p => [p.id, p]));
            return prev.map(p => {
              if (updatedMap.has(p.id)) {
                const updated = updatedMap.get(p.id);
                // Ensure we get the updated reference from the map logic
                const newRef = updated.data.assignmentReference;

                return {
                  ...p,
                  shipmentId: null,
                  status: 'available',
                  assignmentReference: newRef, // Sync top-level
                  // Sync container from updated logic (which clears it for _LINK_)
                  currentContainer: updated.currentContainer,
                  data: {
                    ...p.data,
                    assignmentReference: newRef, // Sync data level
                    currentContainer: updated.currentContainer // Sync data level
                  }
                };
              }
              return p;
            });
          });

          setPendingReoptimize(true);
        } catch (error) {
          console.error('Error loading base plan:', error);
          setErrorModal({ isOpen: true, message: 'Failed to load base plan.' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleConsumeShipment = (shipmentId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Consume Shipment (Ship Items)',
      message: 'Mark this shipment as consumed? This will PERMANENTLY DELETE the shipment record AND all associated products from the database (as if they were shipped out). This cannot be undone.',
      confirmText: 'Consume & Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const { error: productsError } = await supabase
            .from('products')
            .delete()
            .eq('shipment_id', shipmentId);

          if (productsError) throw productsError;

          const { error: shipmentError } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

          if (shipmentError) throw shipmentError;

          setShipments(prev => prev.filter(s => s.id !== shipmentId));
          setProducts(prev => prev.filter(p => p.shipmentId !== shipmentId));

        } catch (error) {
          console.error('Error consuming shipment:', error);
          setErrorModal({ isOpen: true, message: 'Failed to consume shipment.' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUnpackItem = async (shipmentId: string, productId: string) => {
    try {
      const { error: productError } = await supabase
        .from('products')
        .update({ shipment_id: null, status: 'available' })
        .eq('id', productId);

      if (productError) throw productError;

      // Update local state first
      let shipmentIsEmpty = false;
      setShipments(prev => {
        return prev.map(s => {
          if (s.id === shipmentId) {
            // Remove product from shipment.products list if it exists in memory to check count
            const remaining = (s.products || []).filter(p => p.id !== productId);
            if (remaining.length === 0) {
              shipmentIsEmpty = true;
              return null; // Will filter out
            }
            return { ...s, products: remaining, containerCount: s.containerCount }; // naive container count update? 
          }
          return s;
        }).filter(Boolean) as any[]; // remove nulls
      });

      // If locally empty, strictly delete from DB
      if (shipmentIsEmpty) {
        await supabase.from('shipments').delete().eq('id', shipmentId);
      } else {
        // If not empty, we should check DB count for safety (async race conditions etc)
        // But for now, purely local check + optimistic UI update is standard.
        // Let's do a DB check to be safe:
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('shipment_id', shipmentId);
        if (count === 0) {
          await supabase.from('shipments').delete().eq('id', shipmentId);
          setShipments(prev => prev.filter(s => s.id !== shipmentId));
        }
      }

      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, shipmentId: null, status: 'available' }
          : p
      ));

      // Update shipments to remove product from their products array (Redundant if handled above, but ensuring consistency)
      // Actually lines 803-816 handle shipment update.
      // Lines 832-836 handle product update.
      // So we just need to close the try block and start the real catch.
    } catch (error) {
      console.error('Error unpacking item:', error);
      setErrorModal({ isOpen: true, message: 'Failed to unpack item.' });
    }
  };

  const handleRunOptimization = (respectCurrentAssignments: boolean = false) => {
    runOptimization(
      (msg) => setErrorModal({ isOpen: true, message: msg }),
      () => setViewMode('results'),
      respectCurrentAssignments
    );
  };

  useEffect(() => {
    if (pendingReoptimize) {
      const availableProducts = products.filter(p => !p.status || p.status === 'available');
      if (availableProducts.length > 0) {
        setPendingReoptimize(false);
        handleRunOptimization();
      }
    }
  }, [pendingReoptimize, products]);

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResults(null);
  };

  const toggleContainerSelection = (id: string) => {
    setSelectedContainerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResults(null);
  };

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
    setResults(null);
  };

  const handleAddTemplate = async () => {
    if (newTemplate.name && companyId) {
      const templateData = {
        ...newTemplate,
        restrictions: newTemplate.restrictions || []
      } as Product;

      const newId = `T-${Date.now()}`;
      setTemplates(prev => [...prev, { ...templateData, id: newId }]);
      await supabase.from('templates').insert([{
        id: newId,
        company_id: companyId,
        data: templateData
      }]);

      setNewTemplate({ name: '', restrictions: [] });
    }
  };

  const handleRemoveTemplate = async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    await supabase.from('templates').delete().eq('id', id);
  };

  const applyTemplate = (t: Product) => {
    setNewProduct({
      name: t.name,
      formFactorId: '',
      quantity: 1,
      destination: '',
      restrictions: t.restrictions,
      readyDate: '',
      shipDeadline: '',
      arrivalDeadline: ''
    });
    handleTabChange('products');
  };

  const handleClearProducts = async () => {
    if (!companyId) return;

    setConfirmModal({
      isOpen: true,
      title: t('modals.clearProductsTitle'),
      message: t('modals.clearProductsMessage'),
      confirmText: t('modals.deleteAll'),
      isDestructive: true,
      onConfirm: async () => {
        setProducts([]);
        setSelectedProductIds(new Set());
        setResults(null);
        await supabase.from('products').delete().eq('created_by', session.user.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleImportDeals = async (csvContent: string) => {
    setErrorModal({ isOpen: true, message: 'CSV Import needs update for new format' });
  };

  const handleClearDeals = async () => {
    if (!companyId) return;

    setConfirmModal({
      isOpen: true,
      title: t('modals.clearContainersTitle'),
      message: t('modals.clearContainersMessage'),
      confirmText: t('modals.deleteAll'),
      isDestructive: true,
      onConfirm: async () => {
        setContainers([]);
        setSelectedContainerIds(new Set());
        setResults(null);
        await supabase.from('containers').delete().eq('company_id', companyId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const NavButton = ({ mode, icon: Icon, label, disabled = false, tooltip }: { mode?: string, icon: any, label: string, disabled?: boolean, tooltip?: string }) => {
    const isActive = mode ? inputMode === mode : false;
    const isResults = label === t('nav.results');
    const activeState = isResults && results && viewMode === 'results';

    return (
      <Button
        variant={activeState || isActive ? "secondary" : "ghost"}
        className={`w-full h-auto py-2 px-2 flex flex-col items-center gap-1 rounded-lg transition-all ${activeState ? 'bg-primary text-primary-foreground hover:bg-primary/90' : isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}
        onClick={() => {
          if (isResults) {
            setViewMode('results');
          } else if (mode) {
            if (mode === 'products' || mode === 'containers' || mode === 'config' || mode === 'team' || mode === 'countries' || mode === 'management') {
              handleTabChange(mode as any);
            } else {
              setInputMode(mode as any);
              setViewMode('data');
            }
          }
        }}
        disabled={disabled}
      >
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
      </Button>
    );
  };

  if (loadingSession) {
    return <div className="h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (approvalStatus === 'pending') {
    return (
      <PendingApproval
        companyName={companyName}
        onCheckStatus={refreshAuth}
        onSwitchWorkspace={() => logout()}
        onLogout={logout}
        isDataLoading={isDataLoading}
      />
    );
  }

  if (isSetupRequired) {
    return (
      <SetupWizard
        session={session}
        onComplete={refreshAuth}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 bg-card border-r border-border flex flex-col items-center py-4 gap-2 z-20">
        <div className="bg-primary/10 p-2.5 rounded-xl mb-2">
          <Package className="text-primary" size={24} />
        </div>

        <ScrollArea className="flex-1 w-full px-1.5">
          <div className="flex flex-col gap-1 items-center pb-4">
            <NavButton mode={undefined} icon={BarChart3} label={t('nav.results')} />
            <Separator className="w-10 bg-border/60 my-1" />
            <NavButton mode="shipments" icon={Package} label={t('nav.shipments')} />
            <NavButton mode="products" icon={Box} label={t('nav.items')} />
            <NavButton mode="containers" icon={ContainerIcon} label={t('nav.containers')} />
            <NavButton mode="countries" icon={Globe} label={t('nav.countries')} />
            <NavButton mode="config" icon={Settings} label={t('nav.config')} />

            {(hasRole(effectiveRole, 'manager')) && (
              <>
                <Separator className="w-10 bg-border/60 my-1" />
                <NavButton mode="management" icon={Users} label={t('nav.team')} />
              </>
            )}

            <NavButton mode="user_settings" icon={UserCog} label={t('nav.userSettings')} />
          </div>
        </ScrollArea>

        <div className="mt-auto flex flex-col gap-1 items-center pb-4 w-full px-1.5">
          {hasRole(effectiveRole, 'super_admin') && (
            <NavButton mode="super_admin" icon={Building2} label={t('nav.admin')} />
          )}
          <Button variant="ghost" size="sm" onClick={() => logout()} className="w-full h-auto py-2 flex flex-col items-center gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut size={18} />
            <span className="text-[9px] font-medium">Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Header */}
        <header className="bg-background/80 backdrop-blur-md border-b px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">{companyName}</h1>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">{companyId?.substring(0, 8)}</Badge>
            {hasRole(effectiveRole, 'admin') && (
              <Badge variant="secondary" className="text-[10px] uppercase">admin</Badge>
            )}
            <div className="bg-border h-4 w-px mx-1" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            {/* View As Role Selector */}
            {userRole && hasRole(userRole, 'manager') && getAvailableViewRoles(userRole).length > 0 && (
              <div className="ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs">
                      <span className="text-muted-foreground">{t('header.viewAs')}:</span>
                      <span className="font-medium">{viewAsRole ? getRoleLabel(viewAsRole) : t('header.myRole')}</span>
                      <ChevronDown size={12} className="opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-xs">{t('header.viewAs') || "Switch Role View"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setViewAsRole(null)}>
                      <div className="flex items-center justify-between w-full">
                        <span>{t('header.myRole')} <span className="opacity-50 font-normal">({getRoleLabel(userRole)})</span></span>
                        {!viewAsRole && <Check size={14} />}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {getAvailableViewRoles(userRole).map(role => (
                      <React.Fragment key={role}>
                        <DropdownMenuItem onClick={() => {
                          if (role === 'standard') {
                            setViewAsRole(role, {
                              can_edit_countries: false,
                              can_edit_form_factors: false,
                              can_edit_containers: false,
                              can_edit_templates: false,
                              can_edit_tags: false,
                              can_edit_import_config: false
                            });
                          } else {
                            setViewAsRole(role);
                          }
                        }}>
                          <div className="flex items-center justify-between w-full">
                            <span>{getRoleLabel(role)}</span>
                            {viewAsRole === role && <Check size={14} />}
                          </div>
                        </DropdownMenuItem>
                        {role === 'standard' && viewAsRole === 'standard' && (
                          <div className="px-2 py-1.5 space-y-1">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1 px-2 py-1">
                              <Shield size={10} /> Simulated Permissions
                            </div>
                            {[
                              { key: 'can_edit_countries', label: 'Edit Countries' },
                              { key: 'can_edit_form_factors', label: 'Edit Form Factors' },
                              { key: 'can_edit_containers', label: 'Edit Containers' },
                              { key: 'can_edit_templates', label: 'Edit Templates' },
                              { key: 'can_edit_tags', label: 'Edit Tags' },
                              { key: 'can_edit_import_config', label: 'Edit Import Config' }
                            ].map(perm => (
                              <DropdownMenuCheckboxItem
                                key={perm.key}
                                checked={!!userProfile?.[perm.key as keyof UserProfile]}
                                onCheckedChange={(checked) => {
                                  const newPerms = { ...userProfile, [perm.key]: checked };
                                  setViewAsRole('standard', newPerms);
                                }}
                                onSelect={(e) => e.preventDefault()}
                                className="text-xs"
                              >
                                {perm.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex">
          {viewMode === 'results' ? (
            <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-3xl p-6">
              <ResultsPanel
                results={results}
                activePriority={activePriority}
                setActivePriority={setActivePriority}
                containers={containers}
                countries={countries}
                onClose={resetResultsToDefault}
                onSaveShipment={handleSaveShipment}
                handleDragStart={handleDragStart}
                handleDragOver={(e) => e.preventDefault()}
                handleDrop={handleDrop}
                draggedProductId={draggedProductId}
                optimalRange={optimalUtilizationRange}
                onAddContainer={addContainerInstance}
                onDeleteContainer={deleteContainerInstance}
                onRunOptimization={handleRunOptimization}
                isOptimizing={isOptimizing}
                products={activeProducts}
                selectedProductIds={selectedProductIds}
                formFactors={formFactors}
                csvMapping={csvMapping}
              />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {inputMode === 'products' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-80 shrink-0 border-r bg-muted/10 overflow-y-auto">
                    <ProductPanel
                      viewMode="form"
                      products={products}
                      newProduct={newProduct}
                      setNewProduct={setNewProduct}
                      editingProductId={editingProductId}
                      handleSaveProduct={handleSaveProduct}
                      handleEditProduct={handleEditProduct}
                      handleRemoveProduct={handleRemoveProduct}
                      handleCancelProductEdit={handleCancelProductEdit}
                      restrictionTags={restrictionTags}
                      selectedProductIds={selectedProductIds}
                      toggleProductSelection={toggleProductSelection}
                      onImport={handleImportProducts}
                      onClearAll={handleClearProducts}
                      formFactors={formFactors}
                      csvMapping={csvMapping}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden p-6 bg-background">
                    <ProductPanel
                      viewMode="list"
                      products={products}
                      newProduct={newProduct}
                      setNewProduct={setNewProduct}
                      editingProductId={editingProductId}
                      handleSaveProduct={handleSaveProduct}
                      handleEditProduct={handleEditProduct}
                      handleRemoveProduct={handleRemoveProduct}
                      handleCancelProductEdit={handleCancelProductEdit}
                      restrictionTags={restrictionTags}
                      selectedProductIds={selectedProductIds}
                      toggleProductSelection={toggleProductSelection}
                      onImport={handleImportProducts}
                      onClearAll={handleClearProducts}
                      formFactors={formFactors}
                      onSelectAll={toggleSelectAllProducts}
                      allSelected={products.length > 0 && selectedProductIds.size === products.length}
                      csvMapping={csvMapping}
                    />
                  </div>
                </div>
              )}

              {inputMode === 'containers' && (
                <div className="flex-1 flex overflow-hidden">
                  {(hasRole(effectiveRole, 'manager') || userProfile?.can_edit_containers) && (
                    <div className="w-80 shrink-0 border-r bg-muted/10 overflow-y-auto">
                      <ContainerPanel
                        viewMode="form"
                        containers={containers}
                        newContainer={newContainer}
                        setNewContainer={setNewContainer}
                        editingContainerId={editingContainerId}
                        handleSaveContainer={handleSaveContainer}
                        handleEditContainer={handleEditContainer}
                        handleRemoveContainer={handleRemoveContainer}
                        handleCancelContainerEdit={handleCancelContainerEdit}
                        restrictionTags={restrictionTags}
                        selectedContainerIds={selectedContainerIds}
                        toggleContainerSelection={toggleContainerSelection}
                        onImport={handleImportDeals}
                        onClearAll={handleClearDeals}
                        formFactors={formFactors}
                        userRole={effectiveRole}
                        userProfile={userProfile}
                      />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden p-6 bg-background">
                    <ContainerPanel
                      viewMode="list"
                      containers={containers}
                      newContainer={newContainer}
                      setNewContainer={setNewContainer}
                      editingContainerId={editingContainerId}
                      handleSaveContainer={handleSaveContainer}
                      handleEditContainer={handleEditContainer}
                      handleRemoveContainer={handleRemoveContainer}
                      handleCancelContainerEdit={handleCancelContainerEdit}
                      restrictionTags={restrictionTags}
                      selectedContainerIds={selectedContainerIds}
                      toggleContainerSelection={toggleContainerSelection}
                      onImport={handleImportDeals}
                      onClearAll={handleClearDeals}
                      formFactors={formFactors}
                      userRole={effectiveRole}
                      userProfile={userProfile}
                    />
                  </div>
                </div>
              )}

              {inputMode === 'config' && (
                <div className="flex-1 flex gap-4 p-4 overflow-hidden bg-background">
                  <div className="w-1/3 min-w-[320px]">
                    <FormFactorPanel
                      formFactors={formFactors}
                      onAdd={handleAddFormFactor}
                      onRemove={handleRemoveFormFactor}
                      onEdit={handleEditFormFactor}
                      userRole={effectiveRole}
                      userProfile={userProfile}
                    />
                  </div>
                  <ConfigPanel
                    viewMode="list"
                    templates={templates}
                    newTemplate={newTemplate}
                    setNewTemplate={setNewTemplate}
                    handleAddTemplate={handleAddTemplate}
                    handleRemoveTemplate={handleRemoveTemplate}
                    applyTemplate={applyTemplate}
                    restrictionTags={restrictionTags}
                    userRole={effectiveRole}
                    userProfile={userProfile}
                    csvMapping={csvMapping}
                    onUpdateCsvMapping={updateCsvMapping}
                    supabase={supabase}
                    session={session}
                    companyId={companyId}
                    setRestrictionTags={setRestrictionTags}
                    allowUnitSplitting={optimizerSettings.allowUnitSplitting}
                    setAllowUnitSplitting={(val) => updateOptimizerSettings({ ...optimizerSettings, allowUnitSplitting: val })}
                    shippingDateGroupingRange={optimizerSettings.shippingDateGroupingRange}
                    setShippingDateGroupingRange={(val) => updateOptimizerSettings({ ...optimizerSettings, shippingDateGroupingRange: val })}

                  />
                </div>
              )}

              {inputMode === 'user_settings' && (
                <div className="flex-1 overflow-hidden bg-background">
                  <UserSettingsPanel
                    userEmail={session?.user?.email || ''}
                    optimalRange={optimalUtilizationRange}
                    setOptimalRange={setOptimalUtilizationRange}
                  />
                </div>
              )}

              {inputMode === 'countries' && (
                <div className="flex-1 flex overflow-hidden">
                  {(hasRole(effectiveRole, 'manager') || userProfile?.can_edit_countries) && (
                    <div className="w-80 shrink-0 border-r bg-muted/10 overflow-y-auto">
                      <CountryPanel
                        viewMode="form"
                        countries={countries}
                        setCountries={setCountries}
                        containerTemplates={containers}
                        userRole={effectiveRole}
                        userProfile={userProfile}
                        companyId={companyId}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6 overflow-y-auto bg-background">
                    <CountryPanel
                      viewMode="list"
                      countries={countries}
                      setCountries={setCountries}
                      containerTemplates={containers}
                      userRole={effectiveRole}
                      userProfile={userProfile}
                      companyId={companyId}
                    />
                  </div>
                </div>
              )}

              {inputMode === 'shipments' && (
                <div className="flex-1 overflow-hidden bg-background">
                  <ShipmentPanel
                    shipments={shipments}
                    onUnpack={handleUnpackShipment}
                    onLoadAsBase={handleLoadBasePlan}
                    onDelete={handleConsumeShipment}
                    onUnpackItem={handleUnpackItem}
                    csvMapping={csvMapping}
                  />
                </div>
              )}

              {inputMode === 'management' && hasRole(effectiveRole, 'manager') && (
                <div className="flex-1 overflow-hidden bg-background">
                  <ManagementPanel
                    companyId={companyId}
                    currentUserRole={effectiveRole}
                    currentUserId={session?.user?.id || ''}
                  />
                </div>
              )}

              {inputMode === 'super_admin' && hasRole(effectiveRole, 'super_admin') && (
                <div className="flex-1 overflow-hidden bg-background">
                  <SuperAdminPanel onRefresh={refreshAuth} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Import Confirmation Modal */}
      {
        showImportModal && pendingImportData && (
          <ImportConfirmModal
            productCount={pendingImportData.products.length}
            onConfirm={confirmImport}
            onCancel={() => {
              setShowImportModal(false);
              setPendingImportData(null);
            }}
          />
        )
      }

      {/* Import Summary Modal */}
      {
        showImportSummary && importSummaryData && (
          <ImportSummaryModal
            totalImported={importSummaryData.total}
            savedToDb={importSummaryData.savedToDb}
            productsWithIssues={importSummaryData.issues}
            onClose={() => {
              setShowImportSummary(false);
              setImportSummaryData(null);
            }}
          />
        )
      }

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div >
  );
};

export default App;
