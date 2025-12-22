
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OptimizationResult, Container } from '../../types';
import { metricsService, OptimizationMetric } from '../../services/metricsService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, TrendingUp, Box, DollarSign, MapPin, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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

    // Global Date Filter
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Per-Chart Destination Filters
    const [productsDest, setProductsDest] = useState<string>('all');
    const [containersDest, setContainersDest] = useState<string>('all');
    const [typesDest, setTypesDest] = useState<string>('all');

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

    // --- AGGREGATED SUMMARY STATS ---
    const aggregatedStats = useMemo(() => {
        if (filteredHistory.length === 0) return null;

        let totalActualCost = 0;
        let totalOptimalCost = 0;

        let totalActualUtil = 0;
        let totalOptimalUtil = 0;

        let totalContainers = 0;

        filteredHistory.forEach(h => {
            const actualCost = Number(h.total_cost) || 0;
            const compCost = Number(h.comparison_cost) || actualCost; // Default to actual if missing
            // Optimal cost is the lower of the two (assuming we want to show potential savings)
            // Or typically "comparison" is the "Alternative". 
            // The user asked for "lowest total cost we could have achieved".
            const bestCost = Math.min(actualCost, compCost);

            const actualUtil = Number(h.average_utilization) || 0;
            const compUtil = Number(h.comparison_utilization) || actualUtil;
            // "Highest utilization % avg we could have achieved"
            const bestUtil = Math.max(actualUtil, compUtil);

            totalActualCost += actualCost;
            totalOptimalCost += bestCost;

            totalActualUtil += actualUtil;
            totalOptimalUtil += bestUtil;

            totalContainers += (h.container_count || 0);
        });

        const count = filteredHistory.length;
        const avgActualUtil = totalActualUtil / count;
        const avgOptimalUtil = totalOptimalUtil / count;

        return {
            totalActualCost,
            totalOptimalCost,
            avgActualUtil,
            avgOptimalUtil,
            totalContainers,
            shipmentCount: count
        };

    }, [filteredHistory]);


    // --- HELPER FOR CHARTS ---
    const getProductData = (targetDest: string) => {
        const productMap: Record<string, number> = {};
        filteredHistory.forEach(h => {
            const hStats = h.destination_stats || {};
            const hProdStats = h.product_stats || {};
            const shouldInclude = targetDest === 'all' || !!hStats[targetDest];
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
    };

    const getContainerByDestData = (targetDest: string) => {
        const destCounts: Record<string, number> = {};
        filteredHistory.forEach(h => {
            if (h.destination_stats) {
                Object.entries(h.destination_stats).forEach(([dest, stats]) => {
                    if (targetDest !== 'all' && dest !== targetDest) return;
                    const typedStats = stats as { containers: number; products: number };
                    destCounts[dest] = (destCounts[dest] || 0) + typedStats.containers;
                });
            }
        });
        return Object.entries(destCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    };

    const getContainerTypeData = (targetDest: string) => {
        const typeCounts: Record<string, number> = {};
        filteredHistory.forEach(h => {
            if (h.container_type_stats) {
                Object.entries(h.container_type_stats).forEach(([dest, types]) => {
                    if (targetDest !== 'all' && dest !== targetDest) return;
                    Object.entries(types).forEach(([type, count]) => {
                        typeCounts[type] = (typeCounts[type] || 0) + (count as number);
                    });
                });
            }
        });
        return Object.entries(typeCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Memoize the chart data based on their specific selection
    const productsData = useMemo(() => getProductData(productsDest), [filteredHistory, productsDest]);
    const containersData = useMemo(() => getContainerByDestData(containersDest), [filteredHistory, containersDest]);
    const typesData = useMemo(() => getContainerTypeData(typesDest), [filteredHistory, typesDest]);

    // Display values Logic:
    // If currentResult exists, show THAT. 
    // If NOT, show aggregated history stats.

    // Total Cost
    const displayCost = currentResult
        ? currentResult.totalCost
        : aggregatedStats?.totalActualCost ?? 0;

    // Optimal Cost (comparison)
    const displayOptimalCost = currentResult
        ? (currentResult.comparisonCost ? Math.min(currentResult.totalCost, currentResult.comparisonCost) : currentResult.totalCost)
        : aggregatedStats?.totalOptimalCost ?? 0;

    // Avg Utilization
    const displayUtil = currentResult
        ? (currentResult.assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / (currentResult.assignments.length || 1))
        : aggregatedStats?.avgActualUtil ?? 0;

    // Optimal Utilization
    const displayOptimalUtil = currentResult
        ? (currentResult.comparisonUtilization ? Math.max(displayUtil, currentResult.comparisonUtilization) : displayUtil)
        : aggregatedStats?.avgOptimalUtil ?? 0;

    // Count
    const displayCountLabel = currentResult ? t('results.totalContainers') : 'Total Shipments';
    const displayCountValue = currentResult ? currentResult.assignments.length : aggregatedStats?.shipmentCount ?? 0;
    const secondaryCountLabel = currentResult ? null : `Total Containers: ${aggregatedStats?.totalContainers ?? 0}`;

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
                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading} className="h-8">
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('common.refresh', 'Refresh')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* COST CARD */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">
                                    {currentResult ? t('results.totalCost') : 'Total Actual Cost'}
                                </p>
                                <div className="text-3xl font-bold text-blue-600 mt-1">
                                    {currency}{displayCost.toLocaleString()}
                                </div>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <DollarSign className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                    Potential Lowest
                                </p>
                                <div className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                                    {currency}{displayOptimalCost.toLocaleString()}
                                    {displayCost > displayOptimalCost && (
                                        <span className="text-[10px] font-normal text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                                            -{((1 - displayOptimalCost / displayCost) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            {displayCost > displayOptimalCost ? (
                                <ArrowDownRight size={16} className="text-emerald-500" />
                            ) : (
                                <Box size={16} className="text-muted-foreground opacity-20" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* UTILIZATION CARD */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">
                                    {currentResult ? 'Avg Utilization' : 'Historical Avg Util.'}
                                </p>
                                <div className="text-3xl font-bold text-emerald-600 mt-1">
                                    {displayUtil.toFixed(1)}%
                                </div>
                            </div>
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                    Potential Highest
                                </p>
                                <div className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                    {displayOptimalUtil.toFixed(1)}%
                                    {displayOptimalUtil > displayUtil && (
                                        <span className="text-[10px] font-normal text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                                            +{((displayOptimalUtil - displayUtil)).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            {displayOptimalUtil > displayUtil ? (
                                <ArrowUpRight size={16} className="text-blue-500" />
                            ) : (
                                <Box size={16} className="text-muted-foreground opacity-20" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* VOLUME/COUNT CARD */}
                <Card>
                    <CardContent className="pt-6 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">
                                    {displayCountLabel}
                                </p>
                                <div className="text-3xl font-bold text-primary mt-1">
                                    {displayCountValue}
                                </div>
                            </div>
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <Box className="text-slate-500" size={24} />
                            </div>
                        </div>
                        {secondaryCountLabel && (
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs text-muted-foreground font-medium">
                                    {secondaryCountLabel}
                                </p>
                            </div>
                        )}
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
                        <Select value={productsDest} onValueChange={setProductsDest}>
                            <SelectTrigger className="w-full h-7 text-xs mt-1">
                                <SelectValue placeholder="All Destinations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Destinations</SelectItem>
                                {availableDestinations.map(dest => (
                                    <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {productsData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={productsData} layout="vertical" margin={{ left: 0, right: 10 }}>
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
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Containers by Destination</CardTitle>
                            <Select value={containersDest} onValueChange={setContainersDest}>
                                <SelectTrigger className="w-40 h-7 text-xs">
                                    <SelectValue placeholder="All Destinations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Destinations</SelectItem>
                                    {availableDestinations.map(dest => (
                                        <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={containersData}>
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
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Box size={14} /> Container Types
                            </CardTitle>
                            <Select value={typesDest} onValueChange={setTypesDest}>
                                <SelectTrigger className="w-40 h-7 text-xs">
                                    <SelectValue placeholder="All Destinations" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Destinations</SelectItem>
                                    {availableDestinations.map(dest => (
                                        <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typesData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={50} />
                                <YAxis allowDecimals={false} fontSize={11} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }} />
                                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]} barSize={40}>
                                    {typesData.map((_, index) => (
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
