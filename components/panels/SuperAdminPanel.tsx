import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { supabase } from '../../services/supabase';
import { Building2, Check, X, Clock, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import ErrorModal from '../modals/ErrorModal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

interface SuperAdminPanelProps {
    onRefresh?: () => void;
}

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ onRefresh }) => {
    const { t } = useTranslation();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setCompanies(data);
        } catch (error) {
            console.error('Error loading companies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const handleApprove = async (companyId: string) => {
        setProcessingId(companyId);
        try {
            const { error } = await supabase
                .from('companies')
                .update({ approval_status: 'approved' })
                .eq('id', companyId);

            if (error) throw error;
            await loadCompanies();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error approving company:', error);
            setErrorModal({ isOpen: true, message: t('superAdmin.errorApprove') });
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (companyId: string) => {
        if (!confirm(t('superAdmin.confirmReject'))) {
            return;
        }

        setProcessingId(companyId);
        try {
            const { error } = await supabase
                .from('companies')
                .update({ approval_status: 'rejected' })
                .eq('id', companyId);

            if (error) throw error;
            await loadCompanies();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error rejecting company:', error);
            setErrorModal({ isOpen: true, message: t('superAdmin.errorReject') });
        } finally {
            setProcessingId(null);
        }
    };

    const filteredCompanies = companies.filter(company => {
        if (filter === 'all') return true;
        return company.approval_status === filter;
    });

    const statusCounts = {
        pending: companies.filter(c => c.approval_status === 'pending').length,
        approved: companies.filter(c => c.approval_status === 'approved').length,
        rejected: companies.filter(c => c.approval_status === 'rejected').length,
    };

    return (
        <div className="h-full flex flex-col p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{t('superAdmin.title')}</h1>
                <p className="text-muted-foreground">{t('superAdmin.desc')}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-card">
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">{t('superAdmin.totalCompanies')}</div>
                        <div className="text-2xl font-bold">{companies.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-500/10 border-orange-500/30">
                    <CardContent className="p-4">
                        <div className="text-sm text-orange-500 mb-1 flex items-center gap-2">
                            <Clock size={14} />
                            {t('superAdmin.pendingCompanies')}
                        </div>
                        <div className="text-2xl font-bold text-orange-500">{statusCounts.pending}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-4">
                        <div className="text-sm text-green-500 mb-1 flex items-center gap-2">
                            <Check size={14} />
                            {t('superAdmin.approvedCompanies')}
                        </div>
                        <div className="text-2xl font-bold text-green-500">{statusCounts.approved}</div>
                    </CardContent>
                </Card>
                <Card className="bg-destructive/10 border-destructive/30">
                    <CardContent className="p-4">
                        <div className="text-sm text-destructive mb-1 flex items-center gap-2">
                            <X size={14} />
                            {t('superAdmin.rejectedCompanies')}
                        </div>
                        <div className="text-2xl font-bold text-destructive">{statusCounts.rejected}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-muted-foreground" />
                    <div className="flex gap-2">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                            <Button
                                key={f}
                                onClick={() => setFilter(f)}
                                variant={filter === f ? "default" : "secondary"}
                                size="sm"
                                className="h-8"
                            >
                                {f === 'all' ? t('products.filterAll') :
                                    f === 'pending' ? t('superAdmin.pendingCompanies') :
                                        f === 'approved' ? t('superAdmin.approvedCompanies') :
                                            t('superAdmin.rejectedCompanies')}
                            </Button>
                        ))}
                    </div>
                </div>
                <Button
                    onClick={loadCompanies}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                >
                    <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {t('superAdmin.refresh')}
                </Button>
            </div>

            {/* Companies List */}
            <Card className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                            <RefreshCw className="animate-spin mr-2" size={20} />
                            {t('superAdmin.loading')}
                        </div>
                    ) : filteredCompanies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p>{t('superAdmin.noCompanies', { status: filter })}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredCompanies.map((company) => {
                                const isProcessing = processingId === company.id;
                                const isPending = company.approval_status === 'pending';
                                const isApproved = company.approval_status === 'approved';
                                const isRejected = company.approval_status === 'rejected';

                                return (
                                    <div
                                        key={company.id}
                                        className={`p-4 hover:bg-muted/30 transition-colors ${isPending ? 'bg-orange-500/5' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-lg ${isPending ? 'bg-orange-500/20 text-orange-500' :
                                                    isApproved ? 'bg-green-500/20 text-green-500' :
                                                        'bg-destructive/20 text-destructive'
                                                    }`}>
                                                    <Building2 size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold">{company.name}</h3>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-xs text-muted-foreground font-mono">
                                                            {t('superAdmin.idLabel')}: {company.id.substring(0, 8)}...
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {t('superAdmin.createdLabel')}: {new Date(company.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Status Badge */}
                                                <Badge variant={isPending ? "outline" : isApproved ? "default" : "destructive"} className={`uppercase text-xs ${isPending ? 'border-amber-500 text-amber-500 bg-amber-500/10' : isApproved ? 'bg-green-600 hover:bg-green-600' : ''}`}>
                                                    {isPending ? t('superAdmin.pendingCompanies') : isApproved ? t('superAdmin.approvedCompanies') : t('superAdmin.rejectedCompanies')}
                                                </Badge>

                                                {/* Action Buttons */}
                                                {isPending && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleApprove(company.id)}
                                                            disabled={isProcessing}
                                                            size="sm"
                                                            className="h-8 bg-green-600 hover:bg-green-500 text-white"
                                                        >
                                                            <Check size={14} className="mr-1" />
                                                            {t('superAdmin.approve')}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleReject(company.id)}
                                                            disabled={isProcessing}
                                                            variant="destructive"
                                                            size="sm"
                                                            className="h-8"
                                                        >
                                                            <X size={14} className="mr-1" />
                                                            {t('superAdmin.reject')}
                                                        </Button>
                                                    </div>
                                                )}

                                                {isApproved && (
                                                    <Button
                                                        onClick={() => handleReject(company.id)}
                                                        disabled={isProcessing}
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-8"
                                                    >
                                                        <X size={14} className="mr-1" />
                                                        {t('superAdmin.revoke')}
                                                    </Button>
                                                )}

                                                {isRejected && (
                                                    <Button
                                                        onClick={() => handleApprove(company.id)}
                                                        disabled={isProcessing}
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-8"
                                                    >
                                                        <Check size={14} className="mr-1" />
                                                        {t('superAdmin.approve')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
            <ErrorModal
                isOpen={errorModal.isOpen}
                message={errorModal.message}
                onClose={() => setErrorModal({ isOpen: false, message: '' })}
            />
        </div>
    );
};

export default SuperAdminPanel;
