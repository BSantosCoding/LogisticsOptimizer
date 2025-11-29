import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Product, Container, ProductFormFactor, Shipment, OptimizationResult } from '../types';

const DEFAULT_RESTRICTIONS = [
    "Temperature Control"
];

export const useAppData = (companyId: string | null, userId: string | undefined) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [containers, setContainers] = useState<Container[]>([]);
    const [templates, setTemplates] = useState<Product[]>([]);
    const [formFactors, setFormFactors] = useState<ProductFormFactor[]>([]);
    const [countries, setCountries] = useState<any[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [restrictionTags, setRestrictionTags] = useState<string[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);

    const loadData = useCallback(async () => {
        if (!companyId || !userId) return;

        setIsDataLoading(true);
        try {
            // Load Data from Supabase
            const { data: productsData } = await supabase
                .from('products')
                .select('*')
                .eq('company_id', companyId)
                .eq('created_by', userId);

            const { data: containersData } = await supabase.from('containers').select('*').eq('company_id', companyId);
            const { data: templatesData } = await supabase.from('templates').select('*').eq('company_id', companyId);
            const { data: tagsData } = await supabase.from('tags').select('*').eq('company_id', companyId);
            const { data: ffData } = await supabase.from('form_factors').select('*').eq('company_id', companyId);

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
                    name: r.data.carrierName ? `${r.data.carrierName} ${r.data.containerType}` : r.data.name, // Migration fallback
                    capacities: r.capacities || r.data.capacities || {}
                })));
            }

            if (templatesData) setTemplates(templatesData.map((r: any) => ({ ...r.data, id: r.id })));
            if (ffData) setFormFactors(ffData);

            const dbTags = tagsData?.map((t: any) => t.name) || [];
            setRestrictionTags([...new Set([...DEFAULT_RESTRICTIONS, ...dbTags])]);

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
            const { data: shipmentsData } = await supabase.from('shipments').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
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
        addShipment
    };
};
