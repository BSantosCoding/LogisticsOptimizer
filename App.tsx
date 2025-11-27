import React, { useState, useEffect } from 'react';
import {
  Package,
  Container as ContainerIcon,
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
  Zap,
  Box,
  BarChart3,
  PenLine
} from 'lucide-react';
import Auth from './components/Auth';
import Button from './components/Button';
import ProductPanel from './components/panels/ProductPanel';
import ContainerPanel from './components/panels/DealPanel'; // Renamed component, file kept for now
import ConfigPanel from './components/panels/ConfigPanel';
import FormFactorPanel from './components/panels/FormFactorPanel';
import ResultsPanel from './components/panels/ResultsPanel';

import { validateLoadedContainer, calculatePacking } from './services/logisticsEngine';
import { supabase } from './services/supabase';
import ImportConfirmModal from './components/ImportConfirmModal';
import ImportSummaryModal from './components/ImportSummaryModal';
import { Product, Container, OptimizationPriority, OptimizationResult, ProductFormFactor } from './types';

// Default options
const DEFAULT_RESTRICTIONS = [
  "Temperature Control"
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
  const [inputMode, setInputMode] = useState<'products' | 'containers' | 'config' | 'team'>('products');
  const [viewMode, setViewMode] = useState<'data' | 'results'>('data');

  // Data
  const [restrictionTags, setRestrictionTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [formFactors, setFormFactors] = useState<ProductFormFactor[]>([]);

  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [optimalUtilizationRange, setOptimalUtilizationRange] = useState<{ min: number; max: number }>({ min: 85, max: 100 });

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

  // Settings
  const [results, setResults] = useState<Record<OptimizationPriority, OptimizationResult> | null>(null);
  const [activePriority, setActivePriority] = useState<OptimizationPriority>(OptimizationPriority.BALANCE);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<{ products: Product[], productsWithMissingFF: string[] } | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummaryData, setImportSummaryData] = useState<{ total: number, savedToDb: boolean, issues: string[] } | null>(null);

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
      const { data: ffData } = await supabase.from('form_factors').select('*').eq('company_id', profile.company_id);

      if (productsData) {
        setProducts(productsData.map((r: any) => ({
          ...r.data,
          id: r.id,
          // Map legacy fields if needed, or rely on new fields
          formFactorId: r.form_factor_id || r.data.formFactorId,
          quantity: r.quantity || r.data.quantity || 1
        })));
      }

      if (dealsData) {
        setContainers(dealsData.map((r: any) => ({
          ...r.data,
          id: r.id,
          name: r.data.carrierName ? `${r.data.carrierName} ${r.data.containerType}` : r.data.name, // Migration fallback
          capacities: r.capacities || r.data.capacities || {}
        })));
      }

      if (templatesData) setTemplates(templatesData.map((r: any) => ({ ...r.data, id: r.id })));
      if (ffData) setFormFactors(ffData);

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
    setContainers([]);
    setTemplates([]);
    setResults(null);
    setApprovalStatus(null);
    setSetupError(null);
    setUserRole(null);
    setSelectedProductIds(new Set());
    setSelectedContainerIds(new Set());

    // Trigger setup UI
    setSetupMode('join');
    setIsSetupRequired(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProducts([]);
    setContainers([]);
    setResults(null);
    setIsSetupRequired(false);
    setApprovalStatus(null);
    setSetupError(null);
    setUserRole(null);
  };

  // --- Navigation Helpers ---
  const handleTabChange = (tab: 'products' | 'containers' | 'config' | 'team') => {
    setInputMode(tab);
    setViewMode('data');
  };

  const handleViewResults = () => {
    setViewMode('results');
  };

  // --- DB Handlers ---
  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.formFactorId || !companyId) return;

    let updatedProducts = [...products];
    const productData = { ...newProduct };

    if (editingProductId) {
      updatedProducts = products.map((p: { id: any; }) => p.id === editingProductId ? { ...productData, id: editingProductId } : p);
      await supabase.from('products').update({
        data: productData,
        form_factor_id: productData.formFactorId,
        quantity: productData.quantity
      }).eq('id', editingProductId);
      setEditingProductId(null);
    } else {
      const newId = `P-${Date.now()}`;
      const newProdWithId = { ...productData, id: newId };
      updatedProducts = [...products, newProdWithId];
      await supabase.from('products').insert([{
        id: newId,
        company_id: companyId,
        created_by: session.user.id,
        data: productData,
        form_factor_id: productData.formFactorId,
        quantity: productData.quantity
      }]);
    }

    setProducts(updatedProducts);
    setNewProduct({ name: '', formFactorId: '', quantity: 1, destination: '', restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '' });
  };

  const handleImportProducts = async (csvContent: string) => {
    if (!companyId) return;

    const lines = csvContent.split('\n');
    const newProducts: Product[] = [];
    const productsWithMissingFF: string[] = []; // Track products with missing form factors

    // Sort form factors by length (descending) to match longest name first
    const sortedFormFactors = [...formFactors].sort((a, b) => b.name.length - a.name.length);

    // Helper to parse CSV line handling quotes
    const parseCSVLine = (text: string) => {
      const result = [];
      let cell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          cell = '';
        } else {
          cell += char;
        }
      }
      result.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);

      // Extract fields based on CSV structure
      // Index 4: Ship To: Customer Number
      // Index 5: Ship To: Country
      // Index 6: Incoterms
      // Index 7: Incoterms (Part 2)
      // Index 13: Sales Organization
      // Index 25: Number of Packages
      // Index 26: Material Description
      // Index 30: Temp. Control

      if (cols.length < 27) continue; // Skip malformed lines

      const customerNum = cols[4];
      const country = cols[2]?.trim(); // Ship To: Country (Index 2)

      if (i < 5) {
        console.log(`Row ${i}: Country='${country}', Cols[2]='${cols[2]}'`, cols);
      }

      const incoterms = cols[6];
      const incoterms2 = cols[7];
      const salesOrg = cols[13];
      const numPackagesStr = cols[25];
      const description = cols[26];
      const tempControl = cols[30];

      // 1. Grouping Key -> Destination
      const destination = `${customerNum}|${incoterms}|${incoterms2}|${salesOrg}`;

      // 2. Quantity
      // Remove commas from number string (e.g. "7,760" -> 7760)
      const quantity = parseInt(numPackagesStr.replace(/,/g, ''), 10) || 0;
      if (quantity <= 0) continue;

      // 3. Form Factor Matching
      let matchedFFId = '';
      for (const ff of sortedFormFactors) {
        if (description.toLowerCase().includes(ff.name.toLowerCase())) {
          matchedFFId = ff.id;
          break;
        }
      }

      // If no form factor matched, flag it
      if (!matchedFFId) {
        console.warn(`Could not match form factor for: ${description}`);
        productsWithMissingFF.push(description);
        // Use a placeholder or empty string, UI will handle it
      }

      // 4. Restrictions
      const restrictions: string[] = [];
      if (tempControl && tempControl.trim().length > 0) {
        restrictions.push('Temperature Control');
      }

      const newProduct: Product = {
        id: `P-${Date.now()}-${i}`,
        name: description.substring(0, 50), // Truncate name if too long
        formFactorId: matchedFFId,
        quantity: quantity,
        destination: destination,
        country: country, // Map country
        restrictions: restrictions,
        readyDate: '',
        shipDeadline: '',
        arrivalDeadline: ''
      };

      newProducts.push(newProduct);
    }

    if (newProducts.length > 0) {
      // Store parsed data and show modal
      setPendingImportData({ products: newProducts, productsWithMissingFF });
      setShowImportModal(true);
    }
  };

  const confirmImport = async (saveToDb: boolean) => {
    if (!pendingImportData || !companyId) return;

    const { products: newProducts, productsWithMissingFF } = pendingImportData;

    // Add products to state (session)
    setProducts(prev => [...prev, ...newProducts]);

    // Optionally save to database
    if (saveToDb) {
      const { error } = await supabase.from('products').insert(
        newProducts.map(p => ({
          id: p.id,
          company_id: companyId,
          name: p.name,
          form_factor_id: p.formFactorId || null,
          quantity: p.quantity,
          destination: p.destination,
          restrictions: p.restrictions,
          ready_date: null,
          ship_deadline: null,
          arrival_deadline: null
        }))
      );

      if (error) console.error('Error importing products:', error);
    }

    // Show summary if there are products with missing form factors
    if (productsWithMissingFF.length > 0) {
      setImportSummaryData({
        total: newProducts.length,
        savedToDb: saveToDb,
        issues: productsWithMissingFF
      });
      setShowImportSummary(true);
    }

    // Close modal and clear pending data
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
    setProducts(products.filter((p: { id: string; }) => p.id !== id));
    setSelectedProductIds((prev: Iterable<unknown>) => {
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

    let updatedContainers = [...containers];
    const containerData = { ...newContainer };

    if (editingContainerId) {
      updatedContainers = containers.map((d: { id: any; }) => d.id === editingContainerId ? { ...containerData, id: editingContainerId } : d);
      await supabase.from('deals').update({
        data: containerData,
        capacities: containerData.capacities
      }).eq('id', editingContainerId);
      setEditingContainerId(null);
    } else {
      const newId = `C-${Date.now()}`;
      const newContainerWithId = { ...containerData, id: newId };
      updatedContainers = [...containers, newContainerWithId];
      await supabase.from('deals').insert([{
        id: newId,
        company_id: companyId,
        data: containerData,
        capacities: containerData.capacities
      }]);
    }

    setContainers(updatedContainers);
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
    setContainers(containers.filter((c: { id: string; }) => c.id !== id));
    setSelectedContainerIds((prev: Iterable<unknown>) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await supabase.from('deals').delete().eq('id', id);
  };

  const handleCancelContainerEdit = () => {
    setNewContainer({ name: '', capacities: {}, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
    setEditingContainerId(null);
  };

  const handleAddFormFactor = async (name: string, description: string) => {
    if (!companyId) return;
    const newId = `FF-${Date.now()}`;
    const newFF = { id: newId, name, description };
    setFormFactors([...formFactors, newFF]);

    await supabase.from('form_factors').insert([{
      id: newId,
      company_id: companyId,
      name,
      description
    }]);
  };

  const handleRemoveFormFactor = async (id: string) => {
    setFormFactors(formFactors.filter(f => f.id !== id));
    await supabase.from('form_factors').delete().eq('id', id);
  };

  const handleEditFormFactor = async (id: string, name: string, description: string) => {
    setFormFactors(formFactors.map(f => f.id === id ? { ...f, name, description } : f));
    await supabase.from('form_factors').update({ name, description }).eq('id', id);
  };

  const handleOptimization = async () => {
    setViewMode('results');
    setIsOptimizing(true);

    const productsToUse = selectedProductIds.size > 0
      ? products.filter((p: { id: any; }) => selectedProductIds.has(p.id))
      : products;

    const containersToUse = selectedContainerIds.size > 0
      ? containers.filter((d: { id: any; }) => selectedContainerIds.has(d.id))
      : containers;

    setTimeout(async () => {
      const priority = OptimizationPriority.UTILIZATION;
      const { assignments, unassigned } = calculatePacking(
        productsToUse,
        containersToUse,
        priority,
        optimalUtilizationRange.min
      );

      const totalCost = assignments.reduce((sum, a) => sum + a.container.cost, 0);
      const avgUtilization = assignments.length > 0
        ? assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / assignments.length
        : 0;

      const newResults: Record<OptimizationPriority, OptimizationResult> = {
        [OptimizationPriority.UTILIZATION]: {
          assignments,
          unassignedProducts: unassigned,
          totalCost,
          reasoning: `Optimization complete.\n${assignments.length} containers used (avg ${avgUtilization.toFixed(1)}% full). ${unassigned.length} items unassigned.`
        },
        // Dummy entries for other priorities (not used)
        [OptimizationPriority.COST]: {
          assignments: [],
          unassignedProducts: [],
          totalCost: 0,
          reasoning: ''
        },
        [OptimizationPriority.TIME]: {
          assignments: [],
          unassignedProducts: [],
          totalCost: 0,
          reasoning: ''
        },
        [OptimizationPriority.BALANCE]: {
          assignments: [],
          unassignedProducts: [],
          totalCost: 0,
          reasoning: ''
        }
      };

      setResults(newResults);
      setActivePriority(OptimizationPriority.UTILIZATION);
      setIsOptimizing(false);
    }, 100);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds((prev: Iterable<unknown>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setResults(null);
  };

  const toggleContainerSelection = (id: string) => {
    setSelectedContainerIds((prev: Iterable<unknown>) => {
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
      setRestrictionTags([...restrictionTags, newTag]);
      await supabase.from('tags').insert([{ company_id: companyId, name: newTag }]);
      setNewTag('');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    setRestrictionTags(restrictionTags.filter((t: string) => t !== tag));
    await supabase.from('tags').delete().eq('name', tag);
  };

  const handleAddTemplate = async () => {
    if (newTemplate.name && companyId) {
      const templateData = {
        ...newTemplate,
        restrictions: newTemplate.restrictions || []
      } as Product;

      const newId = `T-${Date.now()}`;
      setTemplates([...templates, { ...templateData, id: newId }]);
      await supabase.from('templates').insert([{
        id: newId,
        company_id: companyId,
        data: templateData
      }]);

      setNewTemplate({ name: '', restrictions: [] });
    }
  };

  const handleRemoveTemplate = async (id: string) => {
    setTemplates(templates.filter((t: { id: string; }) => t.id !== id));
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

    await supabase.from('products').delete().eq('company_id', companyId);
  };

  const handleImportDeals = async (csvContent: string) => {
    // TODO: Update CSV parser
    alert("CSV Import needs update for new format");
  };

  const handleClearDeals = async () => {
    if (!companyId) return;
    if (!window.confirm('Are you sure you want to delete ALL containers? This cannot be undone.')) return;

    setContainers([]);
    setSelectedContainerIds(new Set());
    setResults(null);

    await supabase.from('deals').delete().eq('company_id', companyId);
  };


  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, productId: string, sourceId: string) => {
    e.dataTransfer.setData("productId", productId);
    e.dataTransfer.setData("sourceId", sourceId);
    setDraggedProductId(productId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!results) return;

    const currentResult = results[activePriority];
    if (!currentResult) return;

    const productId = e.dataTransfer.getData("productId");
    const sourceId = e.dataTransfer.getData("sourceId");

    if (sourceId === targetId) return;

    const newAssignments = currentResult.assignments.map((a: { assignedProducts: any; }) => ({
      ...a,
      assignedProducts: [...a.assignedProducts]
    }));
    let newUnassigned = [...currentResult.unassignedProducts];

    // Find Product
    let product: Product | undefined;

    if (sourceId === 'unassigned') {
      product = newUnassigned.find(p => p.id === productId);
      newUnassigned = newUnassigned.filter(p => p.id !== productId);
    } else {
      const sourceContainer = newAssignments.find((a: { container: { id: any; }; }) => a.container.id === sourceId);
      if (sourceContainer) {
        product = sourceContainer.assignedProducts.find((p: { id: any; }) => p.id === productId);
        sourceContainer.assignedProducts = sourceContainer.assignedProducts.filter((p: { id: any; }) => p.id !== productId);
        const revalidatedSource = validateLoadedContainer(sourceContainer.container, sourceContainer.assignedProducts);
        Object.assign(sourceContainer, revalidatedSource);
      }
    }

    if (!product) return;

    if (targetId === 'unassigned') {
      newUnassigned.push(product);
    } else {
      const targetContainer = newAssignments.find((a: { container: { id: string; }; }) => a.container.id === targetId);

      if (!targetContainer) {
        const freshContainer = containers.find((d: { id: string; }) => d.id === targetId);
        if (freshContainer) {
          const newLoadedContainer = validateLoadedContainer(freshContainer, [product]);
          newAssignments.push(newLoadedContainer);
        }
      } else {
        targetContainer.assignedProducts.push(product);
        const revalidatedTarget = validateLoadedContainer(targetContainer.container, targetContainer.assignedProducts);
        Object.assign(targetContainer, revalidatedTarget);
      }
    }

    setDraggedProductId(null);

    const totalCost = newAssignments.reduce((sum: any, a: { container: { cost: any; }; }) => sum + a.container.cost, 0);

    setResults({
      ...results,
      [activePriority]: {
        ...currentResult,
        assignments: newAssignments,
        unassignedProducts: newUnassigned,
        totalCost
      }
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
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-900/30">
              <Building2 className="text-white" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Aboard</h2>
          <form onSubmit={handleCompleteSetup}>
            <div className="mb-4">
              {setupMode === 'create' ? (
                <input
                  type="text"
                  placeholder="Company Name"
                  value={setupCompanyName}
                  onChange={(e: { target: { value: any; }; }) => setSetupCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200"
                  required
                />
              ) : (
                <select
                  value={selectedCompanyId}
                  onChange={(e: { target: { value: any; }; }) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200"
                  required
                >
                  <option value="" disabled>Choose a company...</option>
                  {availableCompanies.map((c: { id: any; name: any; }) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

  // --- MAIN APP VIEW ---
  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/30 mb-4">
          <Package className="text-white" size={24} />
        </div>

        <nav className="flex flex-col gap-4 w-full px-2">
          <button
            onClick={() => setViewMode('data')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${viewMode === 'data' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Data Input"
          >
            <PenLine size={20} />
            <span className="text-[10px] font-medium">Input</span>
          </button>
          {results && (
            <button
              onClick={() => setViewMode('results')}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${viewMode === 'results' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
              title="Results"
            >
              <BarChart3 size={20} />
              <span className="text-[10px] font-medium">Results</span>
            </button>
          )}
          <button
            onClick={() => handleTabChange('products')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'products' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Products"
          >
            <Box size={20} />
            <span className="text-[10px] font-medium">Items</span>
          </button>
          <button
            onClick={() => handleTabChange('containers')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'containers' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Containers"
          >
            <ContainerIcon size={20} />
            <span className="text-[10px] font-medium">Containers</span>
          </button>
          <button
            onClick={() => handleTabChange('config')}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${inputMode === 'config' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
            title="Configuration"
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Config</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 transition-colors p-2">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white tracking-tight">{companyName}</h1>
            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-500 border border-slate-700">{userRole}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Optimize Button */}
            <button
              onClick={handleOptimization}
              disabled={products.length === 0 || containers.length === 0 || isOptimizing}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg ${products.length > 0 && containers.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
              {isOptimizing ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex">
          {viewMode === 'results' && results ? (
            <div className="absolute inset-0 z-30 bg-slate-900 p-6">
              <ResultsPanel
                results={results}
                activePriority={activePriority}
                setActivePriority={setActivePriority}
                containers={containers}
                onClose={() => setViewMode('data')}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                draggedProductId={draggedProductId}
                optimalRange={optimalUtilizationRange}
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
                    />
                  </div>
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
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <ConfigPanel
                      viewMode="form"
                      templates={templates}
                      newTemplate={newTemplate}
                      setNewTemplate={setNewTemplate}
                      handleAddTemplate={handleAddTemplate}
                      handleRemoveTemplate={handleRemoveTemplate}
                      applyTemplate={applyTemplate}
                      optimalRange={optimalUtilizationRange}
                      setOptimalRange={setOptimalUtilizationRange}
                      restrictionTags={restrictionTags}
                      newTag={newTag}
                      setNewTag={setNewTag}
                      handleAddTag={handleAddTag}
                      handleRemoveTag={handleRemoveTag}
                      DEFAULT_RESTRICTIONS={DEFAULT_RESTRICTIONS}
                      userRole={userRole}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Import Confirmation Modal */}
      {showImportModal && pendingImportData && (
        <ImportConfirmModal
          productCount={pendingImportData.products.length}
          onConfirm={confirmImport}
          onCancel={() => {
            setShowImportModal(false);
            setPendingImportData(null);
          }}
        />
      )}

      {/* Import Summary Modal */}
      {showImportSummary && importSummaryData && (
        <ImportSummaryModal
          totalImported={importSummaryData.total}
          savedToDb={importSummaryData.savedToDb}
          productsWithIssues={importSummaryData.issues}
          onClose={() => {
            setShowImportSummary(false);
            setImportSummaryData(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
