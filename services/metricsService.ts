
import { supabase } from './supabase';
import { OptimizationResult, OptimizerSettings } from '../types';

export interface OptimizationMetric {
    id: string;
    created_at: string;
    company_id: string;
    shipment_name: string;
    total_cost: number;
    container_count: number;
    total_items: number;
    total_weight: number;
    average_utilization: number;
    low_utilization_count: number;
    optimization_priority: string;
    settings: OptimizerSettings;
    destination_stats: Record<string, { containers: number; products: number }>;
    product_stats: Record<string, number>;
    // Comparison values (result with opposite split setting)
    comparison_cost?: number;
    comparison_utilization?: number;
    // Container type distribution per destination
    container_type_stats?: Record<string, Record<string, number>>;
}

export const metricsService = {
    /**
     * Save optimization results to the history table
     */
    async saveMetrics(
        shipmentName: string,
        result: OptimizationResult,
        priority: string,
        settings: OptimizerSettings,
        companyId: string
    ): Promise<{ error: any }> {
        // 1. Calculate derived stats
        const totalItems = result.assignments.reduce((sum, a) => sum + a.assignedProducts.reduce((pSum, p) => pSum + p.quantity, 0), 0);
        const totalWeight = result.assignments.reduce((sum, a) => sum + a.assignedProducts.reduce((pSum, p) => pSum + (p.weight || 0), 0), 0);

        // Utilization stats
        const avgUtilization = result.assignments.length > 0
            ? result.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / result.assignments.length
            : 0;

        const lowUtilizationCount = result.assignments.filter(a => a.totalUtilization < 85).length;

        // Destination stats
        const destStats: Record<string, { containers: number; products: number }> = {};
        result.assignments.forEach(a => {
            const dest = a.container.destination || 'Unspecified';
            if (!destStats[dest]) destStats[dest] = { containers: 0, products: 0 };
            destStats[dest].containers += 1;
            destStats[dest].products += a.assignedProducts.reduce((sum, p) => sum + p.quantity, 0);
        });

        // Container type stats per destination (destination → container type → count)
        const containerTypeStats: Record<string, Record<string, number>> = {};
        result.assignments.forEach(a => {
            const dest = a.container.destination || 'Unspecified';
            // Get container type name (strip instance suffix)
            const containerType = a.container.name || a.container.id.replace(/-instance-\d+$/, '');

            if (!containerTypeStats[dest]) containerTypeStats[dest] = {};
            containerTypeStats[dest][containerType] = (containerTypeStats[dest][containerType] || 0) + 1;
        });

        // Product stats (Simple count by name)
        const prodStats: Record<string, number> = {};
        result.assignments.forEach(a => {
            a.assignedProducts.forEach(p => {
                const name = p.name || p.data?.name || 'Unknown';
                prodStats[name] = (prodStats[name] || 0) + p.quantity;
            });
        });

        // Use actual comparison values from the optimizer result
        // These represent the cost/utilization with the opposite split setting
        const comparisonCost = result.comparisonCost ?? result.totalCost;
        const comparisonUtilization = result.comparisonUtilization ?? avgUtilization;

        // 2. Insert into Supabase
        const { error } = await supabase
            .from('optimization_metrics')
            .insert({
                company_id: companyId,
                shipment_name: shipmentName,
                total_cost: result.totalCost,
                container_count: result.assignments.length,
                total_items: totalItems,
                total_weight: totalWeight,
                average_utilization: avgUtilization,
                low_utilization_count: lowUtilizationCount,
                optimization_priority: priority,
                settings: settings,
                destination_stats: destStats,
                product_stats: prodStats,
                comparison_cost: comparisonCost,
                comparison_utilization: comparisonUtilization,
                container_type_stats: containerTypeStats
            });

        return { error };
    },

    /**
     * Fetch historical metrics for the user's company
     * RLS will automatically filter to the user's company
     */
    async getMetrics(limit = 50): Promise<{ data: OptimizationMetric[] | null; error: any }> {
        const { data, error } = await supabase
            .from('optimization_metrics')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        return { data: data as OptimizationMetric[] | null, error };
    }
};
