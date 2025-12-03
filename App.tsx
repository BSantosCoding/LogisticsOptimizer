import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Container as ContainerIcon,
  Settings,
  Shield,
  Building2,
  Users,
  RefreshCw,
  LogOut,
  BarChart3,
  ChevronDown,
  Check,
  Zap,
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

import { Container, Product, ProductFormFactor, Shipment, UserProfile } from './types';
import { hasRole, getAvailableViewRoles, getRoleLabel } from './utils/roles';
import { supabase } from './services/supabase';
import { validateLoadedContainer } from './services/logisticsEngine';
import { useAuth } from './hooks/useAuth';
import { useAppData } from './hooks/useAppData';
import { useOptimization } from './hooks/useOptimization';
import { parseProductsCSV } from './services/importService';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';

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
    setFormFactors,
    countries,
    setCountries,
    shipments,
    setShipments,
    restrictionTags,
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
    updateCsvMapping
  } = useAppData(companyId, session?.user?.id);

  // --- App State ---
  const [inputMode, setInputMode] = useState<'products' | 'containers' | 'config' | 'team' | 'countries' | 'shipments' | 'management' | 'super_admin' | 'user_settings'>('products');
  const [viewMode, setViewMode] = useState<'data' | 'results'>('data');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  // Load optimal range from localStorage, fallback to default values
  const [optimalUtilizationRange, setOptimalUtilizationRange] = useState<{ min: number; max: number }>(() => {
    try {
      const saved = localStorage.getItem('optimalUtilizationRange');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the parsed data has the correct structure
        if (parsed && typeof parsed.min === 'number' && typeof parsed.max === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved optimal range:', e);
      // Clear corrupted data
      localStorage.removeItem('optimalUtilizationRange');
    }
    return { min: 85, max: 100 };
  });

  // Save optimal range to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('optimalUtilizationRange', JSON.stringify(optimalUtilizationRange));
    } catch (e) {
      console.error('Failed to save optimal range to localStorage:', e);
    }
  }, [optimalUtilizationRange]);

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
  } = useOptimization(products, containers, countries, selectedProductIds, selectedContainerIds, optimalUtilizationRange);

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
    arrivalDeadline: ''
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

    setNewProduct({ name: '', formFactorId: '', quantity: 1, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '' });
  };

  const handleImportProducts = async (csvContent: string) => {
    if (!companyId) return;
    try {
      const { products: parsedProducts, productsWithMissingFF, missingHeaders } = parseProductsCSV(csvContent, formFactors, csvMapping);

      // Show warning if configured headers are missing from CSV
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
            destination: p.destination,
            country: p.country,
            shipToName: p.shipToName
          },
          form_factor_id: p.formFactorId || null,
          quantity: p.quantity,
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
      arrivalDeadline: p.arrivalDeadline || ''
    });
    setEditingProductId(p.id);
    handleTabChange('products');
  };

  const handleRemoveProduct = async (id: string) => {
    removeProduct(id);
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('products').delete().eq('id', id);
  };

  const handleCancelProductEdit = () => {
    setNewProduct({ name: '', formFactorId: '', quantity: 1, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '' });
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

  const handleAddFormFactor = async (name: string, description: string) => {
    if (!companyId) return;
    const newId = `FF-${Date.now()}`;
    const newFF = { id: newId, name, description };
    addFormFactor(newFF);

    await supabase.from('form_factors').insert([{
      id: newId,
      company_id: companyId,
      name,
      description
    }]);
  };

  const handleRemoveFormFactor = async (id: string) => {
    removeFormFactor(id);
    await supabase.from('form_factors').delete().eq('id', id);
  };

  const handleEditFormFactor = async (id: string, name: string, description: string) => {
    updateFormFactor({ id, name, description });
    await supabase.from('form_factors').update({ name, description }).eq('id', id);
  };

  // --- Shipment Handlers ---
  const handleSaveShipment = async (name: string, result: any) => {
    if (!companyId) return;

    try {
      const totalCost = result.assignments.reduce((sum: number, a: any) => {
        return sum + a.container.cost;
      }, 0);

      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .insert([{
          company_id: companyId,
          created_by: session.user.id,
          name,
          status: 'finalized',
          total_cost: totalCost,
          container_count: result.assignments.length,
          snapshot: result
        }])
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      const productIdsToUpdate = new Set<string>();
      result.assignments.forEach((a: any) => {
        a.assignedProducts.forEach((p: any) => productIdsToUpdate.add(p.id));
      });

      const { error: productsError } = await supabase
        .from('products')
        .update({ shipment_id: shipmentData.id, status: 'shipped' })
        .in('id', Array.from(productIdsToUpdate));

      if (productsError) throw productsError;

      const newShipment: Shipment = {
        id: shipmentData.id,
        name: shipmentData.name,
        status: shipmentData.status,
        totalCost: shipmentData.total_cost,
        containerCount: shipmentData.container_count,
        snapshot: shipmentData.snapshot,
        createdAt: shipmentData.created_at
      };

      addShipment(newShipment);

      setProducts(prev => prev.map(p =>
        productIdsToUpdate.has(p.id)
          ? { ...p, shipmentId: shipmentData.id, status: 'shipped' }
          : p
      ));

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
          const { error: productsError } = await supabase
            .from('products')
            .update({ shipment_id: null, status: 'available' })
            .eq('shipment_id', shipmentId);

          if (productsError) throw productsError;

          const { error: shipmentError } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

          if (shipmentError) throw shipmentError;

          setShipments(prev => prev.filter(s => s.id !== shipmentId));
          setProducts(prev => prev.map(p =>
            p.shipmentId === shipmentId
              ? { ...p, shipmentId: null, status: 'available' }
              : p
          ));
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
          const { error: productsError } = await supabase
            .from('products')
            .update({ shipment_id: null, status: 'available' })
            .eq('shipment_id', shipmentId);

          if (productsError) throw productsError;

          const { error: shipmentError } = await supabase
            .from('shipments')
            .delete()
            .eq('id', shipmentId);

          if (shipmentError) throw shipmentError;

          setShipments(prev => prev.filter(s => s.id !== shipmentId));
          setProducts(prev => prev.map(p =>
            p.shipmentId === shipmentId
              ? { ...p, shipmentId: null, status: 'available' }
              : p
          ));

          setInputMode('products');
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

      setProducts(prev => prev.map(p =>
        p.id === productId
          ? { ...p, shipmentId: null, status: 'available' }
          : p
      ));

      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          const newSnapshot = { ...s.snapshot };
          newSnapshot.assignments = newSnapshot.assignments.map((a: any) => ({
            ...a,
            assignedProducts: a.assignedProducts.filter((p: any) => p.id !== productId)
          })).filter((a: any) => a.assignedProducts.length > 0);

          return { ...s, snapshot: newSnapshot };
        }
        return s;
      }));

    } catch (error) {
      console.error('Error unpacking item:', error);
      setErrorModal({ isOpen: true, message: 'Failed to unpack item.' });
    }
  };

  const handleRunOptimization = () => {
    runOptimization(
      (msg) => setErrorModal({ isOpen: true, message: msg }),
      () => setViewMode('results')
    );
  };

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

  // --- Configuration Handlers ---
  const handleAddTag = async () => {
    if (newTag && !restrictionTags.includes(newTag) && companyId) {
      // Note: restrictionTags is managed by useAppData but update is not exposed directly for tags array
      // We need to refresh data or optimistically update.
      // Since useAppData exposes restrictionTags but not setRestrictionTags, we should probably add a helper there or just refresh.
      // For now, let's rely on refreshData or just ignore local update if not critical (it is critical for UI).
      // I should have added addTag to useAppData.
      // Let's just update DB and refresh for now, or assume useAppData will fetch it.
      await supabase.from('tags').insert([{ company_id: companyId, name: newTag }]);
      setNewTag('');
      refreshData();
    }
  };

  const handleRemoveTag = async (tag: string) => {
    await supabase.from('tags').delete().eq('name', tag);
    refreshData();
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

  // --- Bulk Operations ---
  const handleClearProducts = async () => {
    if (!companyId) return;
    if (!window.confirm('Are you sure you want to delete ALL products? This cannot be undone.')) return;

    setProducts([]);
    setSelectedProductIds(new Set());
    setResults(null);

    await supabase.from('products').delete().eq('created_by', session.user.id);
  };

  const handleImportDeals = async (csvContent: string) => {
    setErrorModal({ isOpen: true, message: 'CSV Import needs update for new format' });
  };

  const handleClearDeals = async () => {
    if (!companyId) return;
    if (!window.confirm('Are you sure you want to delete ALL containers? This cannot be undone.')) return;

    setContainers([]);
    setSelectedContainerIds(new Set());
    setResults(null);

    await supabase.from('containers').delete().eq('company_id', companyId);
  };

  if (loadingSession) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  if (approvalStatus === 'pending') {
    return (
      <PendingApproval
        companyName={companyName}
        onCheckStatus={refreshAuth}
        onSwitchWorkspace={() => {
          logout(); // Simple logout to switch for now, or implement switch logic
          // The original code reset state and set setupMode='join'.
          // Since we moved auth state to hook, we might need a way to reset it.
          // Logout is the cleanest way to "switch" in this context.
        }}
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

  // --- MAIN APP VIEW ---
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/30 mb-4">
          <Package className="text-white" size={24} />
        </div>

        <nav className="flex flex-col gap-2 w-full px-2">
          {/* Operational Group */}
          <button
            onClick={() => results && setViewMode('results')}
            disabled={!results}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${results && viewMode === 'results'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
              : results
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 cursor-pointer'
                : 'text-slate-700 cursor-not-allowed opacity-50'
              }`}
            title={results ? "View optimization results" : "Run an optimization to see results"}
          >
            <BarChart3 size={18} />
            <span className="text-[10px] font-medium">{t('nav.results')}</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-slate-800 w-full my-2"></div>

          {/* Main Tabs */}
          <button
            onClick={() => setInputMode('shipments')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'shipments' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Shipments"
          >
            <Package size={18} />
            <span className="text-[10px] font-medium">{t('nav.shipments')}</span>
          </button>
          <button
            onClick={() => handleTabChange('products')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'products' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Products"
          >
            <Box size={18} />
            <span className="text-[10px] font-medium">{t('nav.items')}</span>
          </button>
          <button
            onClick={() => handleTabChange('containers')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'containers' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Containers"
          >
            <ContainerIcon size={18} />
            <span className="text-[10px] font-medium">{t('nav.containers')}</span>
          </button>
          <button
            onClick={() => setInputMode('countries')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'countries' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Countries"
          >
            <Globe size={18} />
            <span className="text-[10px] font-medium">{t('nav.countries')}</span>
          </button>
          <button
            onClick={() => handleTabChange('config')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'config' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Configuration"
          >
            <Settings size={18} />
            <span className="text-[10px] font-medium">{t('nav.config')}</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-slate-800 w-full my-2"></div>

          {hasRole(effectiveRole, 'manager') && (
            <>
              <button
                onClick={() => handleTabChange('management')}
                className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'management' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                title="Management"
              >
                <Users size={18} />
                <span className="text-[10px] font-medium">{t('nav.team')}</span>
              </button>
            </>
          )}
          <button
            onClick={() => setInputMode('user_settings')}
            className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'user_settings' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="User Settings"
          >
            <UserCog size={18} />
            <span className="text-[10px] font-medium">{t('nav.userSettings')}</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-2 items-center">
          {/* Super Admin Button - Only visible to super admins */}
          {hasRole(effectiveRole, 'super_admin') && (
            <button
              onClick={() => setInputMode('super_admin')}
              className={`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'super_admin'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                : 'text-slate-500 hover:text-purple-400 hover:bg-slate-900'
                }`}
              title="Super Admin Panel"
            >
              <Building2 size={18} />
              <span className="text-[10px] font-medium">{t('nav.admin')}</span>
            </button>
          )}
          <button onClick={() => logout()} className="text-slate-600 hover:text-red-400 transition-colors p-2">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-50 relative">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">{companyName}</h1>
            <span className="text-xs text-slate-500 font-mono flex items-center">ID: {companyId?.substring(0, 8)}</span>
            {hasRole(effectiveRole, 'admin') && (
              <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded uppercase font-bold">admin</span>
            )}
            <LanguageSwitcher />

            {/* View As Role Selector */}
            {userRole && hasRole(userRole, 'manager') && getAvailableViewRoles(userRole).length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all border ${showRoleMenu
                    ? 'bg-blue-900/20 border-blue-500/50 text-blue-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                >
                  <span className="text-slate-500">{t('header.viewAs')}:</span>
                  <span className="font-medium">{viewAsRole ? getRoleLabel(viewAsRole) : t('header.myRole')}</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showRoleMenu ? 'rotate-180 text-blue-400' : 'text-slate-500'}`} />
                </button>

                {/* Dropdown */}
                {showRoleMenu && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowRoleMenu(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 min-w-[240px] z-[9999] animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-2 py-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Select Role View
                      </div>
                      <button
                        onClick={() => {
                          setViewAsRole(null);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${!viewAsRole ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        <span className="font-medium">{t('header.myRole')} <span className="opacity-75 font-normal">({getRoleLabel(userRole)})</span></span>
                        {!viewAsRole && <Check size={14} />}
                      </button>
                      <div className="h-px bg-slate-800 my-1.5 mx-1" />
                      {getAvailableViewRoles(userRole).map(role => (
                        <div key={role}>
                          <button
                            onClick={() => {
                              if (role === 'standard') {
                                // Default standard user has no extra permissions
                                setViewAsRole(role, {
                                  can_edit_countries: false,
                                  can_edit_form_factors: false,
                                  can_edit_containers: false,
                                  can_edit_templates: false,
                                  can_edit_tags: false
                                });
                              } else {
                                setViewAsRole(role);
                              }
                              if (role !== 'standard') setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${viewAsRole === role ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                          >
                            <span className="font-medium">{getRoleLabel(role)}</span>
                            {viewAsRole === role && <Check size={14} />}
                          </button>

                          {/* Permission Toggles for Standard Role */}
                          {role === 'standard' && viewAsRole === 'standard' && (
                            <div className="px-3 py-2 space-y-2 bg-slate-950/50 border border-slate-800 rounded-lg mt-1 mb-1 mx-1">
                              <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
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
                                <label key={perm.key} className="flex items-center gap-2 cursor-pointer group select-none">
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${userProfile?.[perm.key as keyof UserProfile] ? 'bg-blue-600 border-blue-500' : 'border-slate-600 bg-slate-900 group-hover:border-slate-500'}`}>
                                    {userProfile?.[perm.key as keyof UserProfile] && <Check size={10} className="text-white" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!userProfile?.[perm.key as keyof UserProfile]}
                                    onChange={(e) => {
                                      const newPerms = {
                                        ...userProfile,
                                        [perm.key]: e.target.checked
                                      };
                                      setViewAsRole('standard', newPerms);
                                    }}
                                  />
                                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{perm.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Optimize Button */}
            {/* Optimize Button Removed from here */}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex">
          {viewMode === 'results' ? (
            <div className="absolute inset-0 z-30 bg-slate-900 p-6">
              <ResultsPanel
                results={results}
                activePriority={activePriority}
                setActivePriority={setActivePriority}
                containers={containers}
                countries={countries}
                onClose={() => setViewMode('data')}
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
                products={products}
                selectedProductIds={selectedProductIds}
                formFactors={formFactors}
              />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {inputMode === 'products' && (
                <div className="flex-1 flex overflow-hidden">
                  <div className="w-80 shrink-0 border-r border-slate-700 overflow-y-auto">
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
                    />
                  </div>
                  <div className="flex-1 overflow-hidden p-6">
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
                    />
                  </div>
                </div>
              )}

              {inputMode === 'containers' && (
                <div className="flex-1 flex overflow-hidden">
                  {(hasRole(effectiveRole, 'manager') || userProfile?.can_edit_containers) && (
                    <div className="w-80 shrink-0 border-r border-slate-700 overflow-y-auto">
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
                  <div className="flex-1 overflow-hidden p-6">
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
                      userProfile={userProfile}
                    />
                  </div>
                </div>
              )}

              {inputMode === 'config' && (
                <div className="flex-1 flex gap-4 p-4 overflow-hidden">
                  <div className="w-1/3 min-w-[300px]">
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
                    newTag={newTag}
                    setNewTag={setNewTag}
                    handleAddTag={handleAddTag}
                    handleRemoveTag={handleRemoveTag}
                    DEFAULT_RESTRICTIONS={['Temperature Control']}
                    userRole={effectiveRole}
                    userProfile={userProfile}
                    csvMapping={csvMapping}
                    onUpdateCsvMapping={updateCsvMapping}
                  />
                </div>
              )}

              {inputMode === 'user_settings' && (
                <div className="flex-1 overflow-hidden">
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
                    <div className="w-80 shrink-0 border-r border-slate-700 overflow-y-auto">
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
                  <div className="flex-1 p-6 overflow-y-auto">
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
                <div className="flex-1 overflow-hidden">
                  <ShipmentPanel
                    shipments={shipments}
                    onUnpack={handleUnpackShipment}
                    onLoadAsBase={handleLoadBasePlan}
                    onDelete={handleConsumeShipment}
                    onUnpackItem={handleUnpackItem}
                  />
                </div>
              )}

              {inputMode === 'management' && hasRole(effectiveRole, 'manager') && (
                <ManagementPanel
                  companyId={companyId}
                  currentUserRole={effectiveRole}
                  currentUserId={session?.user?.id || ''}
                />
              )}

              {inputMode === 'super_admin' && hasRole(effectiveRole, 'super_admin') && (
                <div className="flex-1 overflow-hidden">
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
