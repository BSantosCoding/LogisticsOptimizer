
import React, { useEffect, useState } from 'react';
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
import { RefreshCw, TrendingDown, TrendingUp, Box, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setIsLoading(true);
        const { data } = await metricsService.getMetrics(20); // Last 20 runs
        if (data) {
            setHistory(data.reverse()); // Show oldest to newest
        }
        setIsLoading(false);
    };

    // Prepare data for "Splitting Impact" chart
    // Group history by shipment name (or just sequential) and compare
    const splittingImpactData = history.map((h, idx) => ({
        name: h.shipment_name || `Run ${idx + 1}`,
        cost: h.total_cost,
        utilization: h.average_utilization,
        splitEnabled: h.settings?.allowUnitSplitting ? 'Yes' : 'No'
    }));

    // Prepare data for Destination Breakdown (Current Result)
    const destinationData = React.useMemo(() => {
        if (!currentResult) return [];
        const stats: Record<string, number> = {};
        currentResult.assignments.forEach(a => {
            const dest = a.container.destination || 'Unspecified';
            stats[dest] = (stats[dest] || 0) + 1; // Count containers
        });
        return Object.entries(stats).map(([name, count]) => ({ name, count }));
    }, [currentResult]);

    return (
        <div className="flex flex-col h-full overflow-y-auto p-4 gap-6 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('metrics.dashboardTitle', 'Optimization Metrics')}</h2>
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {t('common.refresh', 'Refresh History')}
                </Button>
            </div>

            {/* Top Cards - Summary of CURRENT Result */}
            {currentResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Historical Cost Trend */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">{t('metrics.costTrend', 'Cost Efficiency Trend (Last 20 Runs)')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={splittingImpactData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Cost']}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={2} name="Total Cost" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Utilization Trend */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">{t('metrics.utilizationTrend', 'Average Utilization Trend')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={splittingImpactData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                                <YAxis domain={[0, 100]} fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Utilization']}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Avg Utilization %" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Current: Containers per Destination */}
                {currentResult && (
                    <Card className="col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">{t('metrics.containersPerDest', 'Current: Containers by Destination')}</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={destinationData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                                        cursor={{ fill: 'var(--muted)' }}
                                    />
                                    <Bar dataKey="count" fill="#8884d8" name="Containers" radius={[4, 4, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

            </div>
        </div>
    );
};
