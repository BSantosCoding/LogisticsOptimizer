
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizationResult, Container } from '../../types';
import { metricsService, OptimizationMetric } from '../../services/metricsService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, TrendingUp, Box, Package, DollarSign, MapPin, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input'; // Assuming Input component exists, if not will use native input

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

    // Global Filters
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedDestination, setSelectedDestination] = useState<string>('all');

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await metricsService.getMetrics(50); // Increased limit for better trends
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

    // Derived: Filtered History based on Date Range
    const filteredHistory = useMemo(() => {
        if (!startDate && !endDate) return history;
        return history.filter(h => {
            const date = h.created_at.split('T')[0];
            const afterStart = !startDate || date >= startDate;
            const beforeEnd = !endDate || date <= endDate;
            return afterStart && beforeEnd;
        });
    }, [history, startDate, endDate]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Get unique destinations from FILTERED history
    const availableDestinations = useMemo(() => {
        const allDests = new Set<string>();
        filteredHistory.forEach(h => {
            if (h.destination_stats) {
                Object.keys(h.destination_stats).forEach(d => allDests.add(d));
            }
        });
        return Array.from(allDests).sort();
    }, [filteredHistory]);

    // Prepare data for time-based trends (always use filtered history)
    const trendData = useMemo(() => {
        return filteredHistory.map((h) => ({
            date: formatDate(h.created_at),
            name: h.shipment_name,
            cost: Number(h.total_cost) || 0,
            utilization: Number(h.average_utilization) || 0,
            comparisonCost: Number(h.comparison_cost) || Number(h.total_cost) || 0,
            comparisonUtilization: Number(h.comparison_utilization) || Number(h.average_utilization) || 0,
            splitEnabled: h.settings?.allowUnitSplitting ? 'Yes' : 'No'
        }));
    }, [filteredHistory]);

    // Summary calculation
    const historySummary = useMemo(() => {
        if (filteredHistory.length === 0) return null;
        const latest = filteredHistory[filteredHistory.length - 1];
        return {
            totalCost: Number(latest.total_cost) || 0,
            containerCount: latest.container_count || 0,
            avgUtilization: Number(latest.average_utilization) || 0,
            totalItems: latest.total_items || 0
        };
    }, [filteredHistory]);

    // Products by Destination (Filtered by Global Dest)
    const productsByDestination = useMemo(() => {
        const productMap: Record<string, number> = {};

        filteredHistory.forEach(h => {
            const hStats = h.destination_stats || {};
            const hProdStats = h.product_stats || {};

            // If filtering by specific dest, check if this record HAS that dest data
            // Note: metricsService only saves simplified aggregated product_stats, 
            // but we can infer somewhat. However, metricsService DOES NOT preserve product-per-destination mapping
            // in `product_stats`. It only has `destination_stats` (counts) and `product_stats` (total counts).
            // Current limitation: access to per-destination product breakdown is limited if not fully granular.
            // Wait, looking at metricsService logic: `destStats` has total products count. `prodStats` has total count.
            // We cannot strictly filter products by destination from the current `product_stats` structure 
            // unless we change how we store it. 
            // BUT, the key requirement is "same destination dropdown".
            // Previous logic for productsByDestination:
            // if (selectedDestination !== 'all') { check if h.destination_stats[selected] exists }
            // If it exists, it adds ALL products from that shipment. 
            // This is an approximation (if shipment has multiple dests, we can't separate products).
            // We will stick to this logic for now as data structure limits us.

            const shouldInclude = selectedDestination === 'all' || !!hStats[selectedDestination];

            if (shouldInclude) {
                Object.entries(hProdStats).forEach(([name, qty]) => {
                    productMap[name] = (productMap[name] || 0) + (qty as number);
                });
            }
        });

        return Object.entries(productMap)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);
    }, [filteredHistory, selectedDestination]);

    // Containers by Destination (Filtered by Global Dest)
    const containersByDestination = useMemo(() => {
        const destCounts: Record<string, number> = {};
        filteredHistory.forEach(h => {
            if (h.destination_stats) {
                Object.entries(h.destination_stats).forEach(([dest, stats]) => {
                    if (selectedDestination !== 'all' && dest !== selectedDestination) return;

                    const typedStats = stats as { containers: number; products: number };
                    destCounts[dest] = (destCounts[dest] || 0) + typedStats.containers;
                });
            }
        });
        return Object.entries(destCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredHistory, selectedDestination]);

    // Container Type Distribution (Filtered by Global Dest)
    const containerTypeData = useMemo(() => {
        const typeCounts: Record<string, number> = {};

        filteredHistory.forEach(h => {
            if (h.container_type_stats) {
                Object.entries(h.container_type_stats).forEach(([dest, types]) => {
                    if (selectedDestination !== 'all' && dest !== selectedDestination) return;

                    Object.entries(types).forEach(([type, count]) => {
                        typeCounts[type] = (typeCounts[type] || 0) + (count as number);
                    });
                });
            }
        });

        return Object.entries(typeCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredHistory, selectedDestination]);

    // Display values
    const displayCost = currentResult?.totalCost ?? historySummary?.totalCost ?? 0;
    const displayContainers = currentResult?.assignments.length ?? historySummary?.containerCount ?? 0;
    const displayUtilization = currentResult
        ? (currentResult.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / (currentResult.assignments.length || 1))
        : (historySummary?.avgUtilization ?? 0);
    const displayUnassigned = currentResult?.unassignedProducts.length ?? 0;
    const currentSavings = currentResult?.comparisonCost
        ? Math.abs(currentResult.comparisonCost - currentResult.totalCost)
        : 0;

    return (
        <div className="flex flex-col h-full overflow-y-auto p-6 gap-6 bg-background">

            {/* Header with Title and Global Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">{t('metrics.dashboardTitle', 'Optimization Metrics')}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-muted-foreground" />
                        <Input
                            type="date"
                            className="w-36 h-8 text-xs"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                            type="date"
                            className="w-36 h-8 text-xs"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    {/* Destination Filter */}
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                        <SelectTrigger className="w-48 h-8 text-xs">
                            <SelectValue placeholder="All Destinations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Destinations</SelectItem>
                            {availableDestinations.map(dest => (
                                <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading} className="h-8">
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh', 'Refresh')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
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

            {!currentResult && filteredHistory.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                    <AlertCircle size={16} />
                    Showing historical data {startDate || endDate ? `from ${startDate || 'beginning'} to ${endDate || 'now'}` : 'from last saved shipments'}.
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Historical Cost Trend */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.costTrend', 'Cost Trend')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Actual vs. Opposite Split Setting</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="date" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                <YAxis fontSize={10} tickFormatter={(v) => `${currency}${(v / 1000).toFixed(0)}k`} domain={['auto', 'auto']} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                    formatter={(value: number, name: string) => [
                                        `${currency}${value.toLocaleString()}`,
                                        name // Just use the label we passed to the Line component
                                    ]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="comparisonCost" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" name="Alt. Setting" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Utilization Trend */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.utilizationTrend', 'Utilization Trend')}</CardTitle>
                        <p className="text-xs text-muted-foreground">Actual vs. Opposite Split Setting</p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ left: 10, right: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="date" fontSize={10} angle={-30} textAnchor="end" height={50} interval={0} />
                                <YAxis domain={[0, 100]} fontSize={10} tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', fontSize: 12 }}
                                    formatter={(value: number, name: string) => [
                                        `${value.toFixed(1)}%`,
                                        name // Use provided label
                                    ]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
                                />
                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Actual" dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="comparisonUtilization" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" name="Alt. Setting" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin size={14} /> Top Products
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {selectedDestination === 'all' ? 'All destinations' : selectedDestination}
                        </p>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {productsByDestination.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
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
                                    <Bar dataKey="quantity" fill="#3b82f6" name="Qty" radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Containers by Destination & Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{t('metrics.containersPerDest', 'Containers by Destination')}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {selectedDestination === 'all' ? 'All destinations' : selectedDestination}
                        </p>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={containersByDestination}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                                <YAxis allowDecimals={false} fontSize={11} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                <Bar dataKey="count" fill="#3b82f6" name="Containers" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Box size={14} /> Container Types
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {selectedDestination === 'all' ? 'All destinations' : selectedDestination}
                        </p>
                    </CardHeader>
                    <CardContent className="h-[200px]">
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
