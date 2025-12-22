
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizationResult, Container } from '../../types';
import { metricsService, OptimizationMetric } from '../../services/metricsService';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, TrendingUp, Box, Package, DollarSign, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MetricsDashboardProps {
    currentResult: OptimizationResult | null;
    containers: Container[];
    currency?: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
    currentResult,
    containers,
    currency = '€'
}) => {
    const { t } = useTranslation();
    const [history, setHistory] = useState<OptimizationMetric[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDestination, setSelectedDestination] = useState<string>('all');

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await metricsService.getMetrics(20);
            if (error) {
                console.error('Error fetching metrics:', error);
            }
            if (data) {
                setHistory(data.reverse()); // Show oldest to newest
            }
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        }
        setIsLoading(false);
    };

    // Get unique destinations from history for dropdown
    const availableDestinations = useMemo(() => {
        const allDests = new Set<string>();
        history.forEach(h => {
            if (h.destination_stats) {
                Object.keys(h.destination_stats).forEach(d => allDests.add(d));
            }
        });
        return Array.from(allDests).sort();
    }, [history]);

    // Prepare data for trends with split vs non-split comparison
    const trendData = useMemo(() => {
        return history.map((h, idx) => ({
            name: h.shipment_name || `Run ${idx + 1}`,
            cost: h.total_cost,
            utilization: h.average_utilization,
            // Comparison values (estimated without splitting)
            comparisonCost: h.comparison_cost ?? h.total_cost,
            comparisonUtilization: h.comparison_utilization ?? h.average_utilization,
            splitEnabled: h.settings?.allowUnitSplitting ? 'Yes' : 'No'
        }));
    }, [history]);

    // Products by selected destination
    const productsByDestination = useMemo(() => {
        if (selectedDestination === 'all') {
            // Aggregate all products
            const allProducts: Record<string, number> = {};
            history.forEach(h => {
                if (h.product_stats) {
                    Object.entries(h.product_stats).forEach(([name, qty]) => {
                        allProducts[name] = (allProducts[name] || 0) + (qty as number);
                    });
                }
            });
            return Object.entries(allProducts)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
        }

        // Filter by specific destination - need to look at destination_stats
        const productMap: Record<string, number> = {};
        history.forEach(h => {
            if (h.destination_stats?.[selectedDestination] && h.product_stats) {
                // For now, we show all products from shipments that included this destination
                Object.entries(h.product_stats).forEach(([name, qty]) => {
                    productMap[name] = (productMap[name] || 0) + (qty as number);
                });
            }
        });
        return Object.entries(productMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    }, [history, selectedDestination]);

    // Prepare data for Destination Breakdown (Current Result)
    const destinationData = useMemo(() => {
        if (!currentResult) return [];
        const stats: Record<string, number> = {};
        currentResult.assignments.forEach(a => {
            const dest = a.container.destination || 'Unspecified';
            stats[dest] = (stats[dest] || 0) + 1;
        });
        return Object.entries(stats).map(([name, count]) => ({ name, count }));
    }, [currentResult]);

    return (
        <div className="flex flex-col h-full overflow-y-auto p-6 gap-6 bg-background">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t('metrics.dashboardTitle', 'Optimization Metrics')}</h2>
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Refresh History')}
                </Button>
            </div>

            {/* Top Cards - Summary of CURRENT Result */}
            {currentResult && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">{t('results.totalCost')}</p>
                                <div className="text-2xl font-bold text-blue-600">{currency}{currentResult.totalCost.toLocaleString()}</div>
                            </div>
                            <DollarSign className="text-blue-200" size={32} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">{t('results.totalContainers')}</p>
                                <div className="text-2xl font-bold">{currentResult.assignments.length}</div>
                            </div>
                            <Box className="text-slate-200" size={32} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">{t('metrics.avgUtilization', 'Avg Utilization')}</p>
                                <div className="text-2xl font-bold text-green-600">
                                    {(currentResult.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / (currentResult.assignments.length || 1)).toFixed(1)}%
                                </div>
                            </div>
                            <TrendingUp className="text-green-200" size={32} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">{t('metrics.unassigned', 'Unassigned Items')}</p>
                                <div className="text-2xl font-bold text-red-500">{currentResult.unassignedProducts.length}</div>
                            </div>
                            <Package className="text-red-200" size={32} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Charts Section - 3 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Historical Cost Trend - With Split Comparison */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.costTrend', 'Cost Trend (Last 20)')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Estimated (No Split)</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={9} angle={-45} textAnchor="end" height={50} interval={0} />
                                <YAxis fontSize={11} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    formatter={(value: number, name: string) => [
                                        `${currency}${value.toLocaleString()}`,
                                        name.includes('Comparison') ? 'Est. No Split' : 'Actual'
                                    ]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} name="Actual Cost" dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="comparisonCost" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" name="Est. No Split" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Utilization Trend - With Split Comparison */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.utilizationTrend', 'Utilization Trend')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Estimated (No Split)</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={9} angle={-45} textAnchor="end" height={50} interval={0} />
                                <YAxis domain={[0, 100]} fontSize={11} tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    formatter={(value: number, name: string) => [
                                        `${value.toFixed(1)}%`,
                                        name.includes('Comparison') ? 'Est. No Split' : 'Actual'
                                    ]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Actual Util %" dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="comparisonUtilization" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Est. No Split" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Destination Product Analytics */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <MapPin size={16} /> {t('metrics.productsByDest', 'Products by Destination')}
                            </CardTitle>
                        </div>
                        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                            <SelectTrigger className="w-full h-8 text-xs mt-2">
                                <SelectValue placeholder="Select destination..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Destinations</SelectItem>
                                {availableDestinations.map(dest => (
                                    <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="h-[240px]">
                        {productsByDestination.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No product data available
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productsByDestination} layout="vertical" margin={{ left: 10, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" fontSize={10} />
                                    <YAxis dataKey="name" type="category" fontSize={9} width={80} tickFormatter={(val) => val.length > 12 ? val.slice(0, 12) + '...' : val} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    />
                                    <Bar dataKey="quantity" fill="#8b5cf6" name="Total Qty" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Current: Containers per Destination - Full Width */}
            {currentResult && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.containersPerDest', 'Current Run: Containers by Destination')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={destinationData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={11} />
                                <YAxis allowDecimals={false} fontSize={11} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    cursor={{ fill: 'var(--muted)' }}
                                />
                                <Bar dataKey="count" fill="#8884d8" name="Containers" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {history.length === 0 && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                    <Package size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No historical data yet</p>
                    <p className="text-sm">Save a shipment to start tracking metrics</p>
                </div>
            )}
        </div>
    );
};
