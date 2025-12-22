
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
import { RefreshCw, TrendingUp, Box, Package, DollarSign, MapPin, AlertCircle } from 'lucide-react';
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
            cost: Number(h.total_cost) || 0,
            utilization: Number(h.average_utilization) || 0,
            // Comparison values (estimated without splitting)
            comparisonCost: Number(h.comparison_cost) || Number(h.total_cost) || 0,
            comparisonUtilization: Number(h.comparison_utilization) || Number(h.average_utilization) || 0,
            splitEnabled: h.settings?.allowUnitSplitting ? 'Yes' : 'No'
        }));
    }, [history]);

    // Calculate summary from history when no current result
    const historySummary = useMemo(() => {
        if (history.length === 0) return null;
        const latest = history[history.length - 1];
        return {
            totalCost: Number(latest.total_cost) || 0,
            containerCount: latest.container_count || 0,
            avgUtilization: Number(latest.average_utilization) || 0,
            totalItems: latest.total_items || 0
        };
    }, [history]);

    // Products by selected destination
    const productsByDestination = useMemo(() => {
        if (selectedDestination === 'all') {
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
                .slice(0, 8); // Reduced to 8 for better readability
        }

        const productMap: Record<string, number> = {};
        history.forEach(h => {
            if (h.destination_stats?.[selectedDestination] && h.product_stats) {
                Object.entries(h.product_stats).forEach(([name, qty]) => {
                    productMap[name] = (productMap[name] || 0) + (qty as number);
                });
            }
        });
        return Object.entries(productMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);
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

    // Use current result if available, otherwise show latest from history
    const displayCost = currentResult?.totalCost ?? historySummary?.totalCost ?? 0;
    const displayContainers = currentResult?.assignments.length ?? historySummary?.containerCount ?? 0;
    const displayUtilization = currentResult
        ? (currentResult.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / (currentResult.assignments.length || 1))
        : (historySummary?.avgUtilization ?? 0);
    const displayUnassigned = currentResult?.unassignedProducts.length ?? 0;

    return (
        <div className="flex flex-col h-full overflow-y-auto p-6 gap-6 bg-background">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t('metrics.dashboardTitle', 'Optimization Metrics')}</h2>
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Refresh History')}
                </Button>
            </div>

            {/* Top Cards - Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                                {currentResult ? t('results.totalCost') : 'Last Saved Cost'}
                            </p>
                            <div className="text-2xl font-bold text-blue-600">{currency}{displayCost.toLocaleString()}</div>
                        </div>
                        <DollarSign className="text-blue-200" size={32} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                                {currentResult ? t('results.totalContainers') : 'Last Containers'}
                            </p>
                            <div className="text-2xl font-bold">{displayContainers}</div>
                        </div>
                        <Box className="text-slate-300" size={32} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">
                                {currentResult ? t('metrics.avgUtilization', 'Avg Utilization') : 'Last Utilization'}
                            </p>
                            <div className="text-2xl font-bold text-green-600">{displayUtilization.toFixed(1)}%</div>
                        </div>
                        <TrendingUp className="text-green-200" size={32} />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">{t('metrics.unassigned', 'Unassigned Items')}</p>
                            <div className="text-2xl font-bold text-red-500">{displayUnassigned}</div>
                        </div>
                        <Package className="text-red-200" size={32} />
                    </CardContent>
                </Card>
            </div>

            {/* Info banner when showing historical data */}
            {!currentResult && history.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                    <AlertCircle size={16} />
                    Showing data from last saved shipment. Run an optimization to see current results.
                </div>
            )}

            {/* Charts Section - 3 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Historical Cost Trend */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.costTrend', 'Cost Trend')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Est. No Split</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {trendData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                    <YAxis fontSize={10} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                        formatter={(value: number, name: string) => [
                                            `${currency}${value.toLocaleString()}`,
                                            name.includes('Comparison') ? 'Est. No Split' : 'Actual'
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="comparisonCost" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" name="Est. No Split" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Utilization Trend */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.utilizationTrend', 'Utilization Trend')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Est. No Split</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {trendData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                    <YAxis domain={[0, 100]} fontSize={10} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                        formatter={(value: number, name: string) => [
                                            `${value.toFixed(1)}%`,
                                            name.includes('Comparison') ? 'Est. No Split' : 'Actual'
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="comparisonUtilization" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" name="Est. No Split" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Destination Product Analytics */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin size={14} /> Top Products
                        </CardTitle>
                        <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                            <SelectTrigger className="w-full h-8 text-xs mt-1">
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
                    <CardContent className="h-[220px]">
                        {productsByDestination.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No product data
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productsByDestination} layout="vertical" margin={{ left: 0, right: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                                    <XAxis type="number" fontSize={9} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        fontSize={9}
                                        width={100}
                                        tickFormatter={(val) => val.length > 15 ? val.slice(0, 15) + '…' : val}
                                        tick={{ fill: 'var(--foreground)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 11 }}
                                        formatter={(value: number) => [value.toLocaleString(), 'Qty']}
                                    />
                                    <Bar dataKey="quantity" fill="#8b5cf6" name="Qty" radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Current Run: Containers per Destination */}
            {currentResult && destinationData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.containersPerDest', 'Current Run: Containers by Destination')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={destinationData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={11} />
                                <YAxis allowDecimals={false} fontSize={11} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                <Bar dataKey="count" fill="#3b82f6" name="Containers" radius={[4, 4, 0, 0]} barSize={40} />
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
