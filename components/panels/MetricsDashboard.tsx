
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
    Cell,
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

// Color palette for charts
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    // Prepare data for time-based trends with actual comparison values
    const trendData = useMemo(() => {
        return history.map((h) => ({
            date: formatDate(h.created_at),
            name: h.shipment_name,
            cost: Number(h.total_cost) || 0,
            utilization: Number(h.average_utilization) || 0,
            // Actual comparison values from optimizer (opposite split setting)
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

    // Products by selected destination (from historical data)
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
                .slice(0, 8);
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

    // Containers by destination from historical data (aggregated)
    const containersByDestination = useMemo(() => {
        const destCounts: Record<string, number> = {};
        history.forEach(h => {
            if (h.destination_stats) {
                Object.entries(h.destination_stats).forEach(([dest, stats]) => {
                    const typedStats = stats as { containers: number; products: number };
                    destCounts[dest] = (destCounts[dest] || 0) + typedStats.containers;
                });
            }
        });
        return Object.entries(destCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [history]);

    // Container type distribution from historical data
    const containerTypeData = useMemo(() => {
        const typeCounts: Record<string, Record<string, number>> = {};

        history.forEach(h => {
            if (h.container_type_stats) {
                Object.entries(h.container_type_stats).forEach(([dest, types]) => {
                    if (!typeCounts[dest]) typeCounts[dest] = {};
                    Object.entries(types).forEach(([type, count]) => {
                        typeCounts[dest][type] = (typeCounts[dest][type] || 0) + (count as number);
                    });
                });
            }
        });

        // Flatten for chart based on selected destination
        const targetDests = selectedDestination === 'all'
            ? Object.keys(typeCounts)
            : [selectedDestination];

        const aggregated: Record<string, number> = {};
        targetDests.forEach(dest => {
            if (typeCounts[dest]) {
                Object.entries(typeCounts[dest]).forEach(([type, count]) => {
                    aggregated[type] = (aggregated[type] || 0) + count;
                });
            }
        });

        return Object.entries(aggregated)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [history, selectedDestination]);

    // Use current result if available, otherwise show latest from history
    const displayCost = currentResult?.totalCost ?? historySummary?.totalCost ?? 0;
    const displayContainers = currentResult?.assignments.length ?? historySummary?.containerCount ?? 0;
    const displayUtilization = currentResult
        ? (currentResult.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / (currentResult.assignments.length || 1))
        : (historySummary?.avgUtilization ?? 0);
    const displayUnassigned = currentResult?.unassignedProducts.length ?? 0;

    // Calculate savings from current result if available
    const currentSavings = currentResult?.comparisonCost
        ? Math.abs(currentResult.comparisonCost - currentResult.totalCost)
        : 0;

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
                            {currentSavings > 0 && (
                                <p className="text-xs text-green-600">Est. savings: {currency}{currentSavings.toLocaleString()}</p>
                            )}
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

                {/* Historical Cost Trend - Time-Based */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.costTrend', 'Cost Trend Over Time')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Opposite Split Setting</p>
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
                                    <XAxis dataKey="date" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                    <YAxis fontSize={10} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                        formatter={(value: number, name: string) => [
                                            `${currency}${value.toLocaleString()}`,
                                            name === 'cost' ? 'Actual' : 'Alt. Setting'
                                        ]}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="comparisonCost" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" name="Alt. Setting" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Utilization Trend - Time-Based */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.utilizationTrend', 'Utilization Trend Over Time')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Solid = Actual, Dashed = Opposite Split Setting</p>
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
                                    <XAxis dataKey="date" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                    <YAxis domain={[0, 100]} fontSize={10} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                        formatter={(value: number, name: string) => [
                                            `${value.toFixed(1)}%`,
                                            name === 'utilization' ? 'Actual' : 'Alt. Setting'
                                        ]}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="comparisonUtilization" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" name="Alt. Setting" dot={false} />
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

            {/* Second Row - Containers by Destination & Container Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Containers by Destination - Historical */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.containersPerDest', 'Historical: Containers by Destination')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Aggregated from all saved shipments</p>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        {containersByDestination.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={containersByDestination}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                                    <YAxis allowDecimals={false} fontSize={11} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                    <Bar dataKey="count" fill="#3b82f6" name="Containers" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Container Type Distribution */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Box size={14} /> Container Type Distribution
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {selectedDestination === 'all' ? 'All destinations' : selectedDestination}
                        </p>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        {containerTypeData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                No container type data yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={containerTypeData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                                    <YAxis allowDecimals={false} fontSize={11} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                    <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} barSize={40}>
                                        {containerTypeData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

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
