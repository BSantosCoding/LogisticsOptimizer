import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Product, Container, ProductFormFactor, Shipment, OptimizationResult, CSVMapping, OptimizerSettings } from '../types';

const DEFAULT_CSV_MAPPING: CSVMapping = {
    // Core fields
    formFactor: "Form Factor",
    country: "Ship To: Country",
    quantity: "Number of Packages",
    weight: "Gross Weight",
    restrictions: ["Temp. Control (Description)"],
    incoterms: ["Incoterms", "Incoterms (Part 2)"],
    groupingFields: ["customerNum", "incoterms", "salesOrg"],
    // Custom fields - company-specific
    customFields: {
        customerNum: "Ship To: Customer Number",
        shipToName: "Ship To: Name",
        salesOrg: "Sales Organization",
        description: "Material Description"
    },
    displayFields: ["customerNum", "shipToName"],
    shippingAvailableBy: "First Date",
    currentContainer: "Shipping Type: Description",
    assignmentReference: "Shipment Number"
};




export const useAppData = (companyId: string | null, userId: string | undefined) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [containers, setContainers] = useState<Container[]>([]);
    const [templates, setTemplates] = useState<Product[]>([]);
    const [formFactors, setFormFactors] = useState<ProductFormFactor[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [restrictionTags, setRestrictionTags] = useState<string[]>([]);
    const [csvMapping, setCsvMapping] = useState<CSVMapping>(DEFAULT_CSV_MAPPING);
    const [optimizerSettings, setOptimizerSettings] = useState<OptimizerSettings>({ allowUnitSplitting: true, shippingDateGroupingRange: undefined });
    const [isDataLoading, setIsDataLoading] = useState(false);

    const loadData = useCallback(async () => {
        if (!companyId || !userId) return;

        setIsDataLoading(true);
        try {
            // Load Data from Supabase
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('created_by', userId);

            const { data: containersData } = await supabase.from('containers').select('*').eq('company_id', companyId);
            const { data: templatesData } = await supabase.from('templates').select('*').eq('company_id', companyId);
            const { data: tagsData } = await supabase.from('tags').select('*').eq('company_id', companyId);
            const { data: ffData } = await supabase.from('form_factors').select('*').eq('company_id', companyId);

            // Try to load import config, but don't fail if table doesn't exist
            try {
                const { data: configData } = await supabase.from('import_configs').select('*').eq('company_id', companyId).eq('config_key', 'product_import_mapping').single();
                if (configData) {
                    const loadedConfig = configData.config_value;
                    // Migration: Ensure incoterms is an array
                    if (typeof loadedConfig.incoterms === 'string') {
                        loadedConfig.incoterms = [loadedConfig.incoterms];
                        if (loadedConfig.incoterms2) {
                            loadedConfig.incoterms.push(loadedConfig.incoterms2);
                            delete loadedConfig.incoterms2;
                        }
                    }

                    // Migration: Convert tempControl to restrictions
                    if (loadedConfig.tempControl) {
                        if (!loadedConfig.restrictions || !Array.isArray(loadedConfig.restrictions)) {
                            loadedConfig.restrictions = [loadedConfig.tempControl];
                        } else if (loadedConfig.restrictions.length === 0) {
                            loadedConfig.restrictions = [loadedConfig.tempControl];
                        } else if (!loadedConfig.restrictions.includes(loadedConfig.tempControl)) {
                            loadedConfig.restrictions.push(loadedConfig.tempControl);
                        }
                        delete loadedConfig.tempControl;
                    }

                    // Migration: Move old top-level fields to customFields
                    if (!loadedConfig.customFields) {
                        loadedConfig.customFields = {};
                    }
                    const oldFields = ['customerNum', 'shipToName', 'salesOrg', 'description'];
                    for (const field of oldFields) {
                        if (loadedConfig[field] && typeof loadedConfig[field] === 'string') {
                            loadedConfig.customFields[field] = loadedConfig[field];
                            delete loadedConfig[field];
                        }
                    }

                    // Ensure weight field exists
                    if (!loadedConfig.weight) {
                        loadedConfig.weight = '';
                    }

                    // Ensure formFactor field exists
                    if (!loadedConfig.formFactor) {
                        loadedConfig.formFactor = "Form Factor";
                    }

                    setCsvMapping(loadedConfig);
                } else {
                    setCsvMapping(DEFAULT_CSV_MAPPING);
                }
            } catch (error) {
                console.warn('import_configs table not found, using default mapping');
                setCsvMapping(DEFAULT_CSV_MAPPING);
            }

            // Load Optimizer Settings
            try {
                const { data: configData } = await supabase.from('import_configs').select('*').eq('company_id', companyId).eq('config_key', 'optimizer_settings').single();
                if (configData) {
                    setOptimizerSettings(configData.config_value);
                } else {
                    setOptimizerSettings({ allowUnitSplitting: true, shippingDateGroupingRange: undefined });
                }
            } catch (error) {
                console.warn('optimizer_settings config not found, using default');
                setOptimizerSettings({ allowUnitSplitting: true, shippingDateGroupingRange: undefined });
            }

            // Products are processed below with shipments to group by shipmentId

            if (containersData) {
                setContainers(containersData.map((r: any) => ({
                    ...r.data,
                    id: r.id,
                    name: r.data.carrierName ? `${r.data.carrierName} ${r.data.containerType}` : r.data.name,
                    capacities: r.capacities || r.data.capacities || {}
                })));
            }

            if (tagsData) {
                setRestrictionTags(tagsData.map((t: any) => t.name));
            } else {
                setRestrictionTags([]);
            }

            if (ffData) {
                setFormFactors(ffData);
            }

            // Load countries
            const { data: countriesData } = await supabase.from('countries').select('*').eq('company_id', companyId);
            if (countriesData) {
                setCountries(countriesData.map((r: any) => ({
                    id: r.id,
                    code: r.code,
                    name: r.name,
                    containerCosts: r.container_costs || {},
                    weightLimits: r.weight_limits || {}
                })));
            }

            // Load Shipments
            const { data: shipmentsData } = await supabase
                .from('shipments')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });

            // Group products by shipmentId for reconstruction
            const productsByShipment = new Map<string, Product[]>();
            if (productsData) {
                const mappedProducts = productsData.map((r: any) => ({
                    ...r.data,
                    id: r.id,
                    formFactorId: r.form_factor_id || r.data?.formFactorId,
                    quantity: r.quantity || r.data?.quantity || 1,
                    weight: r.weight ?? r.data?.weight,
                    shipmentId: r.shipment_id,
                    status: r.status || 'available',
                    data: r.data  // Preserve raw JSONB for fallback access
                }));

                setProducts(mappedProducts);

                // Group shipped products by shipment
                mappedProducts.forEach((p: Product) => {
                    if (p.shipmentId) {
                        const existing = productsByShipment.get(p.shipmentId) || [];
                        existing.push(p);
                        productsByShipment.set(p.shipmentId, existing);
                    }
                });
            }

            if (shipmentsData) {
                setShipments(shipmentsData.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    status: r.status,
                    totalCost: r.total_cost,
                    containerCount: r.container_count,
                    products: productsByShipment.get(r.id) || [],
                    createdAt: r.created_at
                })).filter(s => s.products.length > 0));
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsDataLoading(false);
        }
    }, [companyId, userId]);

    useEffect(() => {
        if (companyId && userId) {
            loadData();
        } else {
            setProducts([]);
            setContainers([]);
            setTemplates([]);
            setFormFactors([]);
            setCountries([]);
            setShipments([]);
            setRestrictionTags([]);
            setCsvMapping(DEFAULT_CSV_MAPPING);
        }
    }, [companyId, userId, loadData]);

    // CRUD Helpers
    const addProduct = (product: Product) => {
        setProducts(prev => [...prev, product]);
    };

    const updateProduct = (product: Product) => {
        setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    };

    const removeProduct = (id: string) => {
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    const addContainer = (container: Container) => {
        setContainers(prev => [...prev, container]);
    };

    const updateContainer = (container: Container) => {
        setContainers(prev => prev.map(c => c.id === container.id ? container : c));
    };

    const removeContainer = (id: string) => {
        setContainers(prev => prev.filter(c => c.id !== id));
    };

    const addFormFactor = (ff: ProductFormFactor) => {
        setFormFactors(prev => [...prev, ff]);
    };

    const updateFormFactor = (ff: ProductFormFactor) => {
        setFormFactors(prev => prev.map(f => f.id === ff.id ? ff : f));
    };

    const removeFormFactor = (id: string) => {
        setFormFactors(prev => prev.filter(f => f.id !== id));
    };

    const addShipment = (shipment: Shipment) => {
        setShipments(prev => [shipment, ...prev]);
    };

    const updateCsvMapping = async (newMapping: CSVMapping) => {
        if (!companyId) return;
        setCsvMapping(newMapping);

        // Auto-create tags for any new restriction headers
        if (newMapping.restrictions) {

            const newTags: string[] = [];
            for (const header of newMapping.restrictions) {
                if (header && header.trim().length > 0) {
                    const tagName = header.trim();
                    if (!restrictionTags.includes(tagName)) {
                        newTags.push(tagName);
                    }
                }
            }

            if (newTags.length > 0) {
                // Add to local state immediately
                setRestrictionTags(prev => [...prev, ...newTags]);

                // Add to database
                const tagsToInsert = newTags.map(tagName => ({
                    company_id: companyId,
                    name: tagName
                }));

                const { error: tagError } = await supabase
                    .from('tags')
                    .insert(tagsToInsert);

                if (tagError) {
                    console.error('[updateCsvMapping] Error creating tags:', tagError);
                }
            }
        }

        const { error } = await supabase
            .from('import_configs')
            .upsert({
                company_id: companyId,
                config_key: 'product_import_mapping',
                config_value: newMapping
            }, { onConflict: 'company_id, config_key' });

        if (error) {
            console.error('Error saving CSV mapping:', error);
            // Revert on error? For now just log.
        }
    };

    const updateOptimizerSettings = async (newSettings: OptimizerSettings) => {
        if (!companyId) return;
        setOptimizerSettings(newSettings);

        const { error } = await supabase
            .from('import_configs')
            .upsert({
                company_id: companyId,
                config_key: 'optimizer_settings',
                config_value: newSettings
            }, { onConflict: 'company_id, config_key' });

        if (error) {
            console.error('Error saving optimizer settings:', error);
        }
    };

    return {
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
        setRestrictionTags,
        isDataLoading,
        refreshData: loadData,
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
    };
};
