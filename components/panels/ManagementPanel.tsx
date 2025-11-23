
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import { Check, X, Shield, User, Trash2, Briefcase, Loader2, Users } from 'lucide-react';

interface ManagementPanelProps {
    viewMode: 'summary' | 'list';
    currentUserId: string;
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ viewMode, currentUserId }) => {
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchMembers = async () => {
        setLoading(true);
        const { data: userData } = await supabase.from('profiles').select('*');
        if (userData) {
            setMembers(userData as UserProfile[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleUpdateStatus = async (userId: string, status: 'active' | 'pending', role?: 'admin' | 'manager' | 'standard') => {
        setActionLoading(userId);
        const updates: any = { status };
        if (role) updates.role = role;

        await supabase.from('profiles').update(updates).eq('id', userId);
        await fetchMembers();
        setActionLoading(null);
    };

    const handleRemoveUser = async (userId: string) => {
        if (!window.confirm("Are you sure you want to remove this user from the workspace?")) return;

        setActionLoading(userId);
        await supabase.from('profiles').delete().eq('id', userId);
        await fetchMembers();
        setActionLoading(null);
    };

    const pendingMembers = members.filter(m => m.status === 'pending');
    const activeMembers = members.filter(m => m.status === 'active');

    if (loading) return <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /></div>;

    if (viewMode === 'summary') {
        return (
            <div className="p-4 bg-slate-800 z-10">
                <h3 className="text-sm font-bold text-white uppercase mb-2 flex items-center gap-2">
                    <Users size={16} className="text-blue-500" /> Team Overview
                </h3>

                <div className="flex gap-2 mt-3">
                    <div className="bg-slate-900 rounded p-3 flex-1 border border-slate-600 flex flex-col items-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Active</div>
                        <div className="text-2xl font-bold text-white">{activeMembers.length}</div>
                    </div>
                    <div className="bg-slate-900 rounded p-3 flex-1 border border-slate-600 flex flex-col items-center">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Pending</div>
                        <div className={`text-2xl font-bold ${pendingMembers.length > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{pendingMembers.length}</div>
                    </div>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                    Manage team access and roles in the main panel.
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="h-full flex flex-col">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                <Users className="text-blue-500" /> Team Management
            </h2>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">

                {/* Pending Requests */}
                {pendingMembers.length > 0 && (
                    <div className="bg-slate-800/50 rounded-lg border border-orange-500/30 overflow-hidden">
                        <div className="bg-orange-900/20 px-4 py-3 border-b border-orange-500/30 flex justify-between items-center">
                            <h3 className="text-orange-200 font-bold text-sm uppercase flex items-center gap-2">
                                <User size={16} /> Pending Requests
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-700/50">
                            {pendingMembers.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between">
                                    <div className="text-sm text-white font-medium">{member.email}</div>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={!!actionLoading}
                                            onClick={() => handleUpdateStatus(member.id, 'active', 'standard')}
                                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            {actionLoading === member.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            Accept
                                        </button>
                                        <button
                                            disabled={!!actionLoading}
                                            onClick={() => handleRemoveUser(member.id)}
                                            className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-900/50 px-4 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <X size={12} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Team */}
                <div>
                    <h3 className="text-slate-400 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-blue-500" /> Active Members
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeMembers.map(member => {
                            const isMe = member.id === currentUserId;
                            const isAdmin = member.role === 'admin';
                            const isManager = member.role === 'manager';

                            return (
                                <div key={member.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col gap-3 shadow-sm hover:border-slate-500 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isAdmin ? 'bg-blue-600 text-white' : isManager ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                                            {member.email.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-slate-200 text-sm font-medium truncate" title={member.email}>
                                                {member.email}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                {isMe && <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded uppercase font-bold mr-1">You</span>}
                                                {isAdmin ? 'Admin' : isManager ? 'Manager' : 'Standard'}
                                            </div>
                                        </div>
                                    </div>

                                    {!isMe && (
                                        <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                                            <select
                                                disabled={!!actionLoading}
                                                value={member.role}
                                                onChange={(e) => handleUpdateStatus(member.id, 'active', e.target.value as 'admin' | 'manager' | 'standard')}
                                                className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                                <option value="standard">Standard</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>

                                            <button
                                                disabled={!!actionLoading}
                                                onClick={() => handleRemoveUser(member.id)}
                                                className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-700/50"
                                                title="Remove User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagementPanel;
