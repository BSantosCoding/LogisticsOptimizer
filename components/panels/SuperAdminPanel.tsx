import React, { useState, useEffect } from 'react';
import { Company } from '../../types';
import { supabase } from '../../services/supabase';
import { Building2, Check, X, Clock, AlertCircle, RefreshCw, Filter } from 'lucide-react';

interface SuperAdminPanelProps {
    onRefresh?: () => void;
}

const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ onRefresh }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);

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
            alert('Failed to approve company');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (companyId: string) => {
        if (!confirm('Are you sure you want to reject this company? Users will not be able to access it.')) {
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
            alert('Failed to reject company');
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
        <div className="h-full flex flex-col p-6 bg-slate-900">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Super Admin Panel</h1>
                <p className="text-slate-400">Manage company approvals and system settings</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">Total Companies</div>
                    <div className="text-2xl font-bold text-white">{companies.length}</div>
                </div>
                <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-700/30">
                    <div className="text-sm text-orange-400 mb-1 flex items-center gap-2">
                        <Clock size={14} />
                        Pending
                    </div>
                    <div className="text-2xl font-bold text-orange-400">{statusCounts.pending}</div>
                </div>
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-700/30">
                    <div className="text-sm text-green-400 mb-1 flex items-center gap-2">
                        <Check size={14} />
                        Approved
                    </div>
                    <div className="text-2xl font-bold text-green-400">{statusCounts.approved}</div>
                </div>
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-700/30">
                    <div className="text-sm text-red-400 mb-1 flex items-center gap-2">
                        <X size={14} />
                        Rejected
                    </div>
                    <div className="text-2xl font-bold text-red-400">{statusCounts.rejected}</div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-slate-400" />
                    <div className="flex gap-2">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filter === f
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={loadCompanies}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Companies List */}
            <div className="flex-1 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-700">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        <RefreshCw className="animate-spin mr-2" size={20} />
                        Loading companies...
                    </div>
                ) : filteredCompanies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <AlertCircle size={48} className="mb-4 opacity-50" />
                        <p>No companies found with status: {filter}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700">
                        {filteredCompanies.map((company) => {
                            const isProcessing = processingId === company.id;
                            const isPending = company.approval_status === 'pending';
                            const isApproved = company.approval_status === 'approved';
                            const isRejected = company.approval_status === 'rejected';

                            return (
                                <div
                                    key={company.id}
                                    className={`p-4 hover:bg-slate-800/50 transition-colors ${isPending ? 'bg-orange-900/10' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${isPending ? 'bg-orange-900/30 text-orange-400' :
                                                    isApproved ? 'bg-green-900/30 text-green-400' :
                                                        'bg-red-900/30 text-red-400'
                                                }`}>
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        ID: {company.id.substring(0, 8)}...
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        Created: {new Date(company.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Status Badge */}
                                            <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${isPending ? 'bg-orange-900/30 text-orange-400 border border-orange-700/30' :
                                                    isApproved ? 'bg-green-900/30 text-green-400 border border-green-700/30' :
                                                        'bg-red-900/30 text-red-400 border border-red-700/30'
                                                }`}>
                                                {company.approval_status}
                                            </div>

                                            {/* Action Buttons */}
                                            {isPending && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(company.id)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Check size={16} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(company.id)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <X size={16} />
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            {isApproved && (
                                                <button
                                                    onClick={() => handleReject(company.id)}
                                                    disabled={isProcessing}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-50"
                                                >
                                                    <X size={16} />
                                                    Revoke
                                                </button>
                                            )}

                                            {isRejected && (
                                                <button
                                                    onClick={() => handleApprove(company.id)}
                                                    disabled={isProcessing}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-50"
                                                >
                                                    <Check size={16} />
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminPanel;
