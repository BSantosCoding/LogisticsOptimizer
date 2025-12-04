import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Product, Container, ProductFormFactor, Shipment, OptimizationResult, CSVMapping } from '../types';

const DEFAULT_CSV_MAPPING: CSVMapping = {
    customerNum: "Ship To: Customer Number",
    country: "Ship To: Country",
    shipToName: "Ship To: Name",
    incoterms: ["Incoterms", "Incoterms (Part 2)"],
    salesOrg: "Sales Organization",
    quantity: "Number of Packages",
    description: "Material Description",
    restrictions: ["Temp. Control (Description)"],
    groupingFields: ["customerNum", "incoterms", "salesOrg"]
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

                    setCsvMapping(loadedConfig);
                } else {
                    setCsvMapping(DEFAULT_CSV_MAPPING);
                }
            } catch (error) {
                console.warn('import_configs table not found, using default mapping');
                setCsvMapping(DEFAULT_CSV_MAPPING);
            }

            // Process loaded data
            if (productsData) {
                setProducts(productsData.map((r: any) => ({
                    ...r.data,
                    id: r.id,
                    formFactorId: r.form_factor_id || r.data.formFactorId,
                    quantity: r.quantity || r.data.quantity || 1,
                    shipmentId: r.shipment_id,
                    status: r.status || 'available'
                })));
            }

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
                    containerCosts: r.container_costs || {}
                })));
            }

            // Load Shipments
            const { data: shipmentsData } = await supabase
                .from('shipments')
                .select('*')
                .eq('created_by', userId)
                .order('created_at', { ascending: false });
            if (shipmentsData) {
                setShipments(shipmentsData.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    status: r.status,
                    totalCost: r.total_cost,
                    containerCount: r.container_count,
                    snapshot: r.snapshot,
                    createdAt: r.created_at
                })));
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
        updateCsvMapping
    };
};
