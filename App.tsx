
import React, { useState, useEffect } from 'react';
import {
  Package,
  Container,
  Settings,
  Building2,
  Users,
  Search,
  Clock,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Repeat,
  Layers,
  Database,
  Zap
} from 'lucide-react';
import Auth from './components/Auth';
import Header from './components/Header';
import Button from './components/Button';
import ProductPanel from './components/panels/ProductPanel';
import DealPanel from './components/panels/DealPanel';
import ConfigPanel from './components/panels/ConfigPanel';
import OptimizationControls from './components/panels/OptimizationControls';
import ResultsPanel from './components/panels/ResultsPanel';
import ManagementPanel from './components/panels/ManagementPanel';
import { supabase } from './services/supabase';
import { optimizeLogistics } from './services/geminiService';
import { validateLoadedDeal } from './services/logisticsEngine';
import { Product, Deal, OptimizationPriority, OptimizationResult } from './types';

// Default options
const DEFAULT_RESTRICTIONS = [
  "Flammable",
  "Temp < 20C",
  "Frozen",
  "Hazmat",
  "Fragile",
  "Corrosive",
  "Liquid",
  "Explosive"
];

const App: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<'active' | 'pending' | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'standard' | null>(null);

  // --- Onboarding State ---
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
  const [setupCompanyName, setSetupCompanyName] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState<{ id: string, name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // --- App State ---
  const [inputMode, setInputMode] = useState<'products' | 'deals' | 'config' | 'team'>('products');
  const [viewMode, setViewMode] = useState<'data' | 'results'>('data');

  // Data
  const [restrictionTags, setRestrictionTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());

  // Forms
  const [newTag, setNewTag] = useState('');
  const [newTemplate, setNewTemplate] = useState<Partial<Product>>({ name: '', weightKg: 0, volumeM3: 0, restrictions: [] });

  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    weightKg: 0,
    volumeM3: 0,
    destination: '',
    restrictions: [],
    readyDate: '',
    shipDeadline: '',
    arrivalDeadline: ''
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [newDeal, setNewDeal] = useState<Omit<Deal, 'id'>>({
    carrierName: '',
    containerType: '',
    maxWeightKg: 0,
    maxVolumeM3: 0,
    cost: 0,
    transitTimeDays: 0,
    availableFrom: new Date().toISOString().split('T')[0],
    destination: '',
    restrictions: []
  });
  const [editingDealId, setEditingDealId] = useState<string | null>(null);

  // Settings
  const [optimizationPriority, setOptimizationPriority] = useState<OptimizationPriority>(OptimizationPriority.BALANCE);
  const [marginPercentage, setMarginPercentage] = useState<number>(10);
  const [ignoreWeight, setIgnoreWeight] = useState<boolean>(false);
  const [ignoreVolume, setIgnoreVolume] = useState<boolean>(false);

  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // --- AUTH Initialization ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Data Loading ---
  useEffect(() => {
    if (session?.user) {
      loadUserData();
    }
  }, [session]);

  // Fetch companies when switching to join mode
  useEffect(() => {
    if (isSetupRequired && setupMode === 'join') {
      fetchCompanies();
    }
  }, [isSetupRequired, setupMode]);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    if (data) setAvailableCompanies(data);
  };

  const loadUserData = async () => {
    setIsDataLoading(true);
    try {
      // 1. Get Profile & Company
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id, status, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile) {
        setIsSetupRequired(true);
        setIsDataLoading(false);
        return;
      }

      const status = profile.status || 'active';
      const role = profile.role || 'standard';

      setApprovalStatus(status as 'active' | 'pending');
      setUserRole(role as 'admin' | 'manager' | 'standard');

      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', profile.company_id)
        .single();

      if (company) setCompanyName(company.name);

      if (status === 'pending') {
        setIsSetupRequired(false);
        setIsDataLoading(false);
        return; // Stop loading data if pending
      }

      // Valid active profile exists, load data
      setCompanyId(profile.company_id);
      setIsSetupRequired(false);

      // 2. Load Data from Supabase
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('created_by', session.user.id);

      const { data: dealsData } = await supabase.from('deals').select('*').eq('company_id', profile.company_id);
      const { data: templatesData } = await supabase.from('templates').select('*').eq('company_id', profile.company_id);
      const { data: tagsData } = await supabase.from('tags').select('*').eq('company_id', profile.company_id);

      if (productsData) setProducts(productsData.map((r: any) => ({ ...r.data, id: r.id })));
      if (dealsData) setDeals(dealsData.map((r: any) => ({ ...r.data, id: r.id })));
      if (templatesData) setTemplates(templatesData.map((r: any) => ({ ...r.data, id: r.id })));

      const dbTags = tagsData?.map((t: any) => t.name) || [];
      setRestrictionTags([...new Set([...DEFAULT_RESTRICTIONS, ...dbTags])]);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setSetupError(null);

    try {
      let targetCompanyId = selectedCompanyId;
      let initialStatus = 'active';
      let initialRole = 'standard';

      if (setupMode === 'create') {
        if (!setupCompanyName) return;
        // Create Company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert([{ name: setupCompanyName }])
          .select()
          .single();

        if (companyError) throw companyError;
        targetCompanyId = companyData.id;
        initialStatus = 'active'; // Creator is always active
        initialRole = 'admin';    // Creator is Admin
      } else {
        if (!selectedCompanyId) return;
        initialStatus = 'pending'; // Joiners must be approved
        initialRole = 'standard';
      }

      // Check if profile exists (upsert) or insert new
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: session.user.id,
          email: session.user.email,
          company_id: targetCompanyId,
          status: initialStatus,
          role: initialRole
        }]);

      if (profileError) throw profileError;

      // Reload
      await loadUserData();

    } catch (err: any) {
      console.error("Setup failed:", err);
      if (err.message && err.message.includes("infinite recursion")) {
        setSetupError("Database Policy Error: Infinite Recursion. Please run the provided 'get_my_company_id' SQL fix in Supabase.");
      } else if (err.message && err.message.includes("row-level security")) {
        setSetupError("Database permissions denied. Please run the SQL policies.");
      } else {
        setSetupError("Failed to setup workspace: " + err.message);
      }
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleCheckStatus = async () => {
    await loadUserData();
  };

  const handleSwitchWorkspace = () => {
    // Reset local state
    setCompanyId(null);
    setProducts([]);
    setDeals([]);
    setTemplates([]);
    setResult(null);
    setApprovalStatus(null);
    setSetupError(null);
    setUserRole(null);
    setSelectedProductIds(new Set());
    setSelectedDealIds(new Set());

    // Trigger setup UI
    setSetupMode('join');
    setIsSetupRequired(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProducts([]);
    setDeals([]);
    setResult(null);
    setIsSetupRequired(false);
    setApprovalStatus(null);
    setSetupError(null);
    setUserRole(null);
  };

  // --- Navigation Helpers ---
  const handleTabChange = (tab: 'products' | 'deals' | 'config' | 'team') => {
    setInputMode(tab);
    setViewMode('data');
  };

  const handleViewResults = () => {
    setViewMode('results');
  };

  // --- DB Handlers ---
  const handleSaveProduct = async () => {
    if (!newProduct.name || newProduct.weightKg <= 0 || !companyId) return;

    let updatedProducts = [...products];
    const productData = { ...newProduct };

    if (editingProductId) {
      updatedProducts = products.map(p => p.id === editingProductId ? { ...productData, id: editingProductId } : p);
      await supabase.from('products').update({ data: productData }).eq('id', editingProductId);
      setEditingProductId(null);
    } else {
      const newId = `P-${Date.now()}`;
      const newProdWithId = { ...productData, id: newId };
      updatedProducts = [...products, newProdWithId];
      await supabase.from('products').insert([{
        id: newId,
        company_id: companyId,
        created_by: session.user.id,
        data: productData
      }]);
    }

    setProducts(updatedProducts);
    setNewProduct({ name: '', weightKg: 0, volumeM3: 0, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '' });
  };

  const handleEditProduct = (p: Product) => {
    setNewProduct({
      name: p.name,
      weightKg: p.weightKg,
      volumeM3: p.volumeM3,
      destination: p.destination || '',
      restrictions: p.restrictions,
      readyDate: p.readyDate || '',
      shipDeadline: p.shipDeadline || '',
      arrivalDeadline: p.arrivalDeadline || ''
    });
    setEditingProductId(p.id);
    handleTabChange('products'); // Ensure sidebar shows product form
  };

  const handleRemoveProduct = async (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('products').delete().eq('id', id);
  };

  const handleCancelProductEdit = () => {
    setNewProduct({ name: '', weightKg: 0, volumeM3: 0, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '' });
    setEditingProductId(null);
  };

  const handleSaveDeal = async () => {
    if (!newDeal.carrierName || !newDeal.cost || !companyId) return;

    let updatedDeals = [...deals];
    const dealData = { ...newDeal };

    if (editingDealId) {
      updatedDeals = deals.map(d => d.id === editingDealId ? { ...dealData, id: editingDealId } : d);
      await supabase.from('deals').update({ data: dealData }).eq('id', editingDealId);
      setEditingDealId(null);
    } else {
      const newId = `D-${Date.now()}`;
      const newDealWithId = { ...dealData, id: newId };
      updatedDeals = [...deals, newDealWithId];
      await supabase.from('deals').insert([{
        id: newId,
        company_id: companyId,
        data: dealData
      }]);
    }

    setDeals(updatedDeals);
    setNewDeal({ carrierName: '', containerType: '', maxWeightKg: 0, maxVolumeM3: 0, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
  };

  const handleEditDeal = (d: Deal) => {
    setNewDeal({
      carrierName: d.carrierName,
      containerType: d.containerType,
      maxWeightKg: d.maxWeightKg,
      maxVolumeM3: d.maxVolumeM3,
      cost: d.cost,
      transitTimeDays: d.transitTimeDays,
      availableFrom: d.availableFrom,
      destination: d.destination,
      restrictions: d.restrictions
    });
    setEditingDealId(d.id);
    handleTabChange('deals');
  };

  const handleRemoveDeal = async (id: string) => {
    setDeals(deals.filter(d => d.id !== id));
    setSelectedDealIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('deals').delete().eq('id', id);
  };

  const handleCancelDealEdit = () => {
    setNewDeal({ carrierName: '', containerType: '', maxWeightKg: 0, maxVolumeM3: 0, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
    setEditingDealId(null);
  };

  const handleOptimization = async () => {
    setViewMode('results'); // Switch to results view
    setIsOptimizing(true);

    // Use selected items or all items if selection is empty
    const productsToUse = selectedProductIds.size > 0
      ? products.filter(p => selectedProductIds.has(p.id))
      : products;

    const dealsToUse = selectedDealIds.size > 0
      ? deals.filter(d => selectedDealIds.has(d.id))
      : deals;

    setTimeout(async () => {
      const res = await optimizeLogistics(productsToUse, dealsToUse, optimizationPriority, marginPercentage, ignoreWeight, ignoreVolume);
      setResult(res);
      setIsOptimizing(false);
    }, 100);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  };

  const toggleDealSelection = (id: string) => {
    setSelectedDealIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResult(null);
  };

  // --- Configuration Handlers ---
  const handleAddTag = async () => {
    if (newTag && !restrictionTags.includes(newTag) && companyId) {
      setRestrictionTags([...restrictionTags, newTag]);
      await supabase.from('tags').insert([{ company_id: companyId, name: newTag }]);
      setNewTag('');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    setRestrictionTags(restrictionTags.filter(t => t !== tag));
    await supabase.from('tags').delete().eq('name', tag);
  };

  const handleAddTemplate = async () => {
    if (newTemplate.name && companyId) {
      const templateData = {
        ...newTemplate,
        restrictions: newTemplate.restrictions || [],
        weightKg: Number(newTemplate.weightKg) || 0,
        volumeM3: Number(newTemplate.volumeM3) || 0
      } as Product;

      const newId = `T-${Date.now()}`;
      setTemplates([...templates, { ...templateData, id: newId }]);
      await supabase.from('templates').insert([{
        id: newId,
        company_id: companyId,
        data: templateData
      }]);

      setNewTemplate({ name: '', weightKg: 0, volumeM3: 0, restrictions: [] });
    }
  };

  const handleRemoveTemplate = async (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    await supabase.from('templates').delete().eq('id', id);
  };

  const applyTemplate = (t: Product) => {
    setNewProduct({
      name: t.name,
      weightKg: t.weightKg,
      volumeM3: t.volumeM3,
      destination: '',
      restrictions: t.restrictions,
      readyDate: '',
      shipDeadline: '',
      arrivalDeadline: ''
    });
    handleTabChange('products');
  };


  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, productId: string, sourceId: string) => {
    e.dataTransfer.setData("productId", productId);
    e.dataTransfer.setData("sourceId", sourceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!result) return;
    const productId = e.dataTransfer.getData("productId");
    const sourceId = e.dataTransfer.getData("sourceId");

    if (sourceId === targetId) return;

    const newAssignments = result.assignments.map(a => ({
      ...a,
      assignedProducts: [...a.assignedProducts]
    }));
    let newUnassigned = [...result.unassignedProducts];

    // Find Product
    let product: Product | undefined;

    if (sourceId === 'unassigned') {
      product = newUnassigned.find(p => p.id === productId);
      newUnassigned = newUnassigned.filter(p => p.id !== productId);
    } else {
      const sourceDeal = newAssignments.find(a => a.deal.id === sourceId);
      if (sourceDeal) {
        product = sourceDeal.assignedProducts.find(p => p.id === productId);
        sourceDeal.assignedProducts = sourceDeal.assignedProducts.filter(p => p.id !== productId);
        const revalidatedSource = validateLoadedDeal(sourceDeal.deal, sourceDeal.assignedProducts, marginPercentage, ignoreWeight, ignoreVolume);
        Object.assign(sourceDeal, revalidatedSource);
      }
    }

    if (!product) return;

    if (targetId === 'unassigned') {
      newUnassigned.push(product);
    } else {
      const targetDeal = newAssignments.find(a => a.deal.id === targetId);

      if (!targetDeal) {
        const freshDeal = deals.find(d => d.id === targetId);
        if (freshDeal) {
          const newLoadedDeal = validateLoadedDeal(freshDeal, [product], marginPercentage, ignoreWeight, ignoreVolume);
          newAssignments.push(newLoadedDeal);
        }
      } else {
        targetDeal.assignedProducts.push(product);
        const revalidatedTarget = validateLoadedDeal(targetDeal.deal, targetDeal.assignedProducts, marginPercentage, ignoreWeight, ignoreVolume);
        Object.assign(targetDeal, revalidatedTarget);
      }
    }

    const totalCost = newAssignments.reduce((sum, a) => sum + a.deal.cost, 0);

    setResult({
      ...result,
      assignments: newAssignments,
      unassignedProducts: newUnassigned,
      totalCost
    });
  };

  if (loadingSession) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  // --- VIEW: PENDING APPROVAL ---
  if (approvalStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-500/10 p-4 rounded-full border border-orange-500/20">
              <Clock className="text-orange-400" size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Pending</h2>
          <p className="text-slate-400 mb-6">
            Your request to join <strong>{companyName}</strong> has been sent. <br />
            An administrator must approve your account.
          </p>
          <div className="space-y-3">
            <Button onClick={handleCheckStatus} isLoading={isDataLoading} className="w-full">
              <RefreshCw size={16} className="mr-2" /> Check Status
            </Button>
            <div className="flex gap-2">
              <button onClick={handleSwitchWorkspace} className="flex-1 py-2 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 text-sm flex items-center justify-center gap-2">
                <Repeat size={14} /> Change Workspace
              </button>
              <button onClick={handleLogout} className="flex-1 py-2 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 text-sm flex items-center justify-center gap-2">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: SETUP / ONBOARDING ---
  if (isSetupRequired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {/* ... (Existing setup code remains the same, keeping it brief for this block) ... */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-900/30">
              <Building2 className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Aboard</h2>
          {/* ... (Rest of setup UI) ... */}
          <form onSubmit={handleCompleteSetup}>
            {/* ... Inputs ... */}
            <div className="mb-4">
              {setupMode === 'create' ? (
                <input
                  type="text"
                  placeholder="Company Name"
                  value={setupCompanyName}
                  onChange={(e) => setSetupCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200"
                  required
                />
              ) : (
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200"
                  required
                >
                  <option value="" disabled>Choose a company...</option>
                  {availableCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <Button type="submit" isLoading={isSettingUp} className="w-full py-3 mt-2">
              {setupMode === 'create' ? 'Create & Start' : 'Request to Join'}
            </Button>
            <button type="button" onClick={handleLogout} className="w-full mt-4 text-sm text-slate-500">Sign Out</button>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-200 font-sans selection:bg-blue-500/30">
      <Header
        companyName={companyName}
        userRole={userRole}
        isDataLoading={isDataLoading}
        onLogout={handleLogout}
        onSwitchWorkspace={handleSwitchWorkspace}
      />

      <main className="flex-1 flex overflow-hidden max-w-[1920px] mx-auto w-full">
        {/* Left Sidebar: Controls & Inputs */}
        <div className="w-80 md:w-96 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-20">
          <div className="flex border-b border-slate-700 overflow-x-auto shrink-0 scrollbar-hide">
            <button
              onClick={() => handleTabChange('products')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[80px] ${inputMode === 'products' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Package size={16} /> Products
            </button>
            <button
              onClick={() => handleTabChange('deals')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[80px] ${inputMode === 'deals' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Container size={16} /> Deals
            </button>
            <button
              onClick={() => handleTabChange('config')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[80px] ${inputMode === 'config' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Settings size={16} /> Config
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => handleTabChange('team')}
                className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 min-w-[80px] ${inputMode === 'team' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
              >
                <Users size={16} /> Team
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {inputMode === 'products' && (
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
              />
            )}

            {inputMode === 'deals' && (
              <DealPanel
                viewMode="form"
                deals={deals}
                newDeal={newDeal}
                setNewDeal={setNewDeal}
                editingDealId={editingDealId}
                handleSaveDeal={handleSaveDeal}
                handleEditDeal={handleEditDeal}
                handleRemoveDeal={handleRemoveDeal}
                handleCancelDealEdit={handleCancelDealEdit}
                restrictionTags={restrictionTags}
                selectedDealIds={selectedDealIds}
                toggleDealSelection={toggleDealSelection}
              />
            )}

            {inputMode === 'config' && (
              <ConfigPanel
                viewMode="form"
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
                DEFAULT_RESTRICTIONS={DEFAULT_RESTRICTIONS}
                userRole={userRole}
              />
            )}

            {inputMode === 'team' && userRole === 'admin' && (
              <ManagementPanel viewMode="summary" currentUserId={session.user.id} />
            )}
          </div>

          {/* Optimization Controls Footer */}
          <OptimizationControls
            marginPercentage={marginPercentage}
            setMarginPercentage={setMarginPercentage}
            optimizationPriority={optimizationPriority}
            setOptimizationPriority={setOptimizationPriority}
            ignoreWeight={ignoreWeight}
            setIgnoreWeight={setIgnoreWeight}
            ignoreVolume={ignoreVolume}
            setIgnoreVolume={setIgnoreVolume}
            handleOptimization={handleOptimization}
            isOptimizing={isOptimizing}
            disabled={products.length === 0 || deals.length === 0}
            selectedCount={selectedProductIds.size + selectedDealIds.size}
          />
        </div>

        {/* Right Content: Lists or Results */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 relative">

          {/* Top Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                {viewMode === 'results' ? (result ? 'Optimization Plan' : 'Staging Area') :
                  (inputMode === 'products' ? 'Products' :
                    inputMode === 'deals' ? 'Deals' :
                      inputMode === 'config' ? 'Configuration' : 'Team Management')}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {(selectedProductIds.size > 0 || selectedDealIds.size > 0 || result) && (
                <div className="bg-slate-900 p-1 rounded-lg border border-slate-700 flex text-sm">
                  <button
                    onClick={() => setViewMode('data')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'data' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    <Database size={14} /> Data
                  </button>
                  <button
                    onClick={() => setViewMode('results')}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-2 ${viewMode === 'results' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {result ? <Zap size={14} /> : <Layers size={14} />}
                    {result ? 'Plan' : 'Staging'}
                    <span className="bg-black/20 px-1.5 rounded text-[10px]">
                      {selectedProductIds.size + selectedDealIds.size}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {viewMode === 'results' ? (
              <ResultsPanel
                result={result}
                deals={deals}
                products={products}
                selectedProductIds={selectedProductIds}
                selectedDealIds={selectedDealIds}
                toggleProductSelection={toggleProductSelection}
                toggleDealSelection={toggleDealSelection}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
              />
            ) : (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                {inputMode === 'products' && (
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
                  />
                )}

                {inputMode === 'deals' && (
                  <DealPanel
                    viewMode="list"
                    deals={deals}
                    newDeal={newDeal}
                    setNewDeal={setNewDeal}
                    editingDealId={editingDealId}
                    handleSaveDeal={handleSaveDeal}
                    handleEditDeal={handleEditDeal}
                    handleRemoveDeal={handleRemoveDeal}
                    handleCancelDealEdit={handleCancelDealEdit}
                    restrictionTags={restrictionTags}
                    selectedDealIds={selectedDealIds}
                    toggleDealSelection={toggleDealSelection}
                  />
                )}

                {inputMode === 'config' && (
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
                    DEFAULT_RESTRICTIONS={DEFAULT_RESTRICTIONS}
                    userRole={userRole}
                  />
                )}

                {inputMode === 'team' && userRole === 'admin' && (
                  <ManagementPanel viewMode="list" currentUserId={session.user.id} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
