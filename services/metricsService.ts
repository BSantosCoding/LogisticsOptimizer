
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
    // Comparison values (estimated without splitting)
    comparison_cost?: number;
    comparison_utilization?: number;
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

        // Product stats (Simple count by name)
        const prodStats: Record<string, number> = {};
        result.assignments.forEach(a => {
            a.assignedProducts.forEach(p => {
                prodStats[p.name] = (prodStats[p.name] || 0) + p.quantity;
            });
        });

        // Estimate comparison values (what would cost/utilization be without splitting)
        // This is a rough estimate - without splitting, we'd likely need more containers with lower utilization
        const comparisonCost = settings.allowUnitSplitting
            ? result.totalCost * 1.15  // Estimate 15% higher cost without splitting
            : result.totalCost;
        const comparisonUtilization = settings.allowUnitSplitting
            ? Math.max(avgUtilization * 0.85, 50)  // Estimate 15% lower utilization without splitting
            : avgUtilization;

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
                comparison_utilization: comparisonUtilization
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
