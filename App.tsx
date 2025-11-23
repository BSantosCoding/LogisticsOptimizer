
import React, { useState, useEffect } from 'react';
import { 
  Package,
  Container,
  Settings,
} from 'lucide-react';
import Auth from './components/Auth';
import Header from './components/Header';
import ProductPanel from './components/panels/ProductPanel';
import DealPanel from './components/panels/DealPanel';
import ConfigPanel from './components/panels/ConfigPanel';
import OptimizationControls from './components/panels/OptimizationControls';
import ResultsPanel from './components/panels/ResultsPanel';
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

  // --- App State ---
  const [inputMode, setInputMode] = useState<'products' | 'deals' | 'config'>('products');

  // Data
  const [restrictionTags, setRestrictionTags] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  // Forms
  const [newTag, setNewTag] = useState('');
  const [newTemplate, setNewTemplate] = useState<Partial<Product>>({ name: '', weightKg: 0, volumeM3: 0, restrictions: [], hazardClass: '', unNumber: '' });
  
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    weightKg: 0,
    volumeM3: 0,
    restrictions: [],
    readyDate: '',
    shipDeadline: '',
    arrivalDeadline: '',
    unNumber: '',
    hazardClass: ''
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

  const loadUserData = async () => {
    setIsDataLoading(true);
    try {
      // 1. Get Profile & Company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setCompanyId(profile.company_id);

        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        if (company) setCompanyName(company.name);

        // 2. Load Data from Supabase
        const { data: productsData } = await supabase.from('products').select('*').eq('company_id', profile.company_id);
        const { data: dealsData } = await supabase.from('deals').select('*').eq('company_id', profile.company_id);
        const { data: templatesData } = await supabase.from('templates').select('*').eq('company_id', profile.company_id);
        const { data: tagsData } = await supabase.from('tags').select('*').eq('company_id', profile.company_id);

        if (productsData) setProducts(productsData.map((r: any) => ({ ...r.data, id: r.id })));
        if (dealsData) setDeals(dealsData.map((r: any) => ({ ...r.data, id: r.id })));
        if (templatesData) setTemplates(templatesData.map((r: any) => ({ ...r.data, id: r.id })));
        
        // Merge DB tags with default tags
        const dbTags = tagsData?.map((t: any) => t.name) || [];
        setRestrictionTags([...new Set([...DEFAULT_RESTRICTIONS, ...dbTags])]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProducts([]);
    setDeals([]);
    setResult(null);
  };


  // --- DB Handlers ---

  const handleSaveProduct = async () => {
    if (!newProduct.name || newProduct.weightKg <= 0 || !companyId) return;
    
    let updatedProducts = [...products];
    const productData = { ...newProduct };
    
    if (editingProductId) {
      // Update
      updatedProducts = products.map(p => p.id === editingProductId ? { ...productData, id: editingProductId } : p);
      await supabase.from('products').update({ data: productData }).eq('id', editingProductId);
      setEditingProductId(null);
    } else {
      // Create
      const newId = `P-${Date.now()}`;
      const newProdWithId = { ...productData, id: newId };
      updatedProducts = [...products, newProdWithId];
      await supabase.from('products').insert([{ 
        id: newId, 
        company_id: companyId,
        data: productData 
      }]);
    }

    setProducts(updatedProducts);
    setNewProduct({ name: '', weightKg: 0, volumeM3: 0, restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '', unNumber: '', hazardClass: '' });
  };

  const handleEditProduct = (p: Product) => {
    setNewProduct({
        name: p.name,
        weightKg: p.weightKg,
        volumeM3: p.volumeM3,
        restrictions: p.restrictions,
        readyDate: p.readyDate || '',
        shipDeadline: p.shipDeadline || '',
        arrivalDeadline: p.arrivalDeadline || '',
        unNumber: p.unNumber || '',
        hazardClass: p.hazardClass || ''
    });
    setEditingProductId(p.id);
    setInputMode('products');
  };

  const handleRemoveProduct = async (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    await supabase.from('products').delete().eq('id', id);
  };

  const handleCancelProductEdit = () => {
      setNewProduct({ name: '', weightKg: 0, volumeM3: 0, restrictions: [], readyDate: '', shipDeadline: '', arrivalDeadline: '', unNumber: '', hazardClass: '' });
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
    setInputMode('deals');
  };

  const handleRemoveDeal = async (id: string) => {
    setDeals(deals.filter(d => d.id !== id));
    await supabase.from('deals').delete().eq('id', id);
  };

   const handleCancelDealEdit = () => {
      setNewDeal({ carrierName: '', containerType: '', maxWeightKg: 0, maxVolumeM3: 0, cost: 0, transitTimeDays: 0, availableFrom: new Date().toISOString().split('T')[0], destination: '', restrictions: [] });
      setEditingDealId(null);
  };

  const handleOptimization = async () => {
    setIsOptimizing(true);
    // Add small delay to allow UI to update to loading state
    setTimeout(async () => {
        const res = await optimizeLogistics(products, deals, optimizationPriority, marginPercentage, ignoreWeight, ignoreVolume);
        setResult(res);
        setIsOptimizing(false);
    }, 100);
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
      
      setNewTemplate({ name: '', weightKg: 0, volumeM3: 0, restrictions: [], hazardClass: '', unNumber: '' });
    }
  };

  const applyTemplate = (t: Product) => {
    setNewProduct({
      name: t.name,
      weightKg: t.weightKg,
      volumeM3: t.volumeM3,
      restrictions: t.restrictions,
      readyDate: '',
      shipDeadline: '',
      arrivalDeadline: '',
      unNumber: t.unNumber || '',
      hazardClass: t.hazardClass || ''
    });
    setInputMode('products');
  };


  // --- Drag & Drop Handlers (Manual Override) ---
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

    // Deep copy result to mutate
    const newAssignments = result.assignments.map(a => ({
        ...a,
        assignedProducts: [...a.assignedProducts]
    }));
    let newUnassigned = [...result.unassignedProducts];

    // Find Product
    let product: Product | undefined;
    
    // Remove from Source
    if (sourceId === 'unassigned') {
        product = newUnassigned.find(p => p.id === productId);
        newUnassigned = newUnassigned.filter(p => p.id !== productId);
    } else {
        const sourceDeal = newAssignments.find(a => a.deal.id === sourceId);
        if (sourceDeal) {
            product = sourceDeal.assignedProducts.find(p => p.id === productId);
            sourceDeal.assignedProducts = sourceDeal.assignedProducts.filter(p => p.id !== productId);
            // Re-validate source
            const revalidatedSource = validateLoadedDeal(sourceDeal.deal, sourceDeal.assignedProducts, marginPercentage, ignoreWeight, ignoreVolume);
            Object.assign(sourceDeal, revalidatedSource);
        }
    }

    if (!product) return;

    // Add to Target
    if (targetId === 'unassigned') {
        newUnassigned.push(product);
    } else {
        const targetDeal = newAssignments.find(a => a.deal.id === targetId);
        
        // If target is a new deal not currently in assignments (from unused list)
        if (!targetDeal) {
            const freshDeal = deals.find(d => d.id === targetId);
            if (freshDeal) {
                const newLoadedDeal = validateLoadedDeal(freshDeal, [product], marginPercentage, ignoreWeight, ignoreVolume);
                newAssignments.push(newLoadedDeal);
            }
        } else {
            targetDeal.assignedProducts.push(product);
            // Re-validate target
            const revalidatedTarget = validateLoadedDeal(targetDeal.deal, targetDeal.assignedProducts, marginPercentage, ignoreWeight, ignoreVolume);
            Object.assign(targetDeal, revalidatedTarget);
        }
    }

    // Recalculate Totals
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

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-200 font-sans selection:bg-blue-500/30">
      <Header companyName={companyName} isDataLoading={isDataLoading} onLogout={handleLogout} />

      <main className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        {/* Left Sidebar: Inputs */}
        <div className="w-80 md:w-96 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-10">
          <div className="flex border-b border-slate-700">
            <button 
              onClick={() => setInputMode('products')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${inputMode === 'products' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Package size={16} /> Products
            </button>
            <button 
              onClick={() => setInputMode('deals')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${inputMode === 'deals' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Container size={16} /> Deals
            </button>
            <button 
              onClick={() => setInputMode('config')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${inputMode === 'config' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'}`}
            >
              <Settings size={16} /> Config
            </button>
          </div>

          {inputMode === 'products' && (
            <ProductPanel 
              products={products}
              newProduct={newProduct}
              setNewProduct={setNewProduct}
              editingProductId={editingProductId}
              handleSaveProduct={handleSaveProduct}
              handleEditProduct={handleEditProduct}
              handleRemoveProduct={handleRemoveProduct}
              handleCancelProductEdit={handleCancelProductEdit}
              restrictionTags={restrictionTags}
            />
          )}

          {inputMode === 'deals' && (
            <DealPanel 
               deals={deals}
               newDeal={newDeal}
               setNewDeal={setNewDeal}
               editingDealId={editingDealId}
               handleSaveDeal={handleSaveDeal}
               handleEditDeal={handleEditDeal}
               handleRemoveDeal={handleRemoveDeal}
               handleCancelDealEdit={handleCancelDealEdit}
               restrictionTags={restrictionTags}
            />
          )}

          {inputMode === 'config' && (
            <ConfigPanel 
              templates={templates}
              newTemplate={newTemplate}
              setNewTemplate={setNewTemplate}
              handleAddTemplate={handleAddTemplate}
              applyTemplate={applyTemplate}
              restrictionTags={restrictionTags}
              newTag={newTag}
              setNewTag={setNewTag}
              handleAddTag={handleAddTag}
              handleRemoveTag={handleRemoveTag}
              DEFAULT_RESTRICTIONS={DEFAULT_RESTRICTIONS}
            />
          )}
        </div>

        {/* Right Content: Optimization & Results */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900 relative">
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
             <div className="flex flex-col md:flex-row gap-6 items-start">
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
                />
                
                <div className="flex-1 w-full space-y-4">
                   <ResultsPanel 
                      result={result}
                      deals={deals}
                      handleDragStart={handleDragStart}
                      handleDragOver={handleDragOver}
                      handleDrop={handleDrop}
                   />
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
