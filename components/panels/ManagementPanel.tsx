
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import { Check, X, Shield, User, Trash2, Briefcase, Loader2 } from 'lucide-react';

interface ManagementPanelProps {
    currentUserId: string;
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ currentUserId }) => {
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchMembers = async () => {
        setLoading(true);
        // Fetch all profiles in the same company
        // Note: RLS must allow this query (Select profiles where company_id matches auth.uid()'s company_id)
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

    if (loading) return <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading Team...</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-slate-900 p-4 space-y-6">

            {/* Pending Requests */}
            {pendingMembers.length > 0 && (
                <div className="bg-slate-800 rounded-lg border border-orange-500/30 overflow-hidden">
                    <div className="bg-orange-900/20 px-4 py-2 border-b border-orange-500/30 flex justify-between items-center">
                        <h3 className="text-orange-200 font-bold text-sm uppercase flex items-center gap-2">
                            <User size={16} /> Pending Requests
                        </h3>
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
                    </div>
                    <div className="divide-y divide-slate-700">
                        {pendingMembers.map(member => (
                            <div key={member.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-white font-medium">{member.email}</div>
                                    <div className="text-xs text-slate-500">Requested access</div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleUpdateStatus(member.id, 'active', 'standard')}
                                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                    >
                                        {actionLoading === member.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                        Accept
                                    </button>
                                    <button
                                        disabled={!!actionLoading}
                                        onClick={() => handleRemoveUser(member.id)}
                                        className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-900/50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-colors"
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
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-700">
                    <h3 className="text-slate-200 font-bold text-sm uppercase flex items-center gap-2">
                        <Shield size={16} className="text-blue-400" /> Active Members
                    </h3>
                </div>
                <div className="divide-y divide-slate-700">
                    {activeMembers.map(member => {
                        const isMe = member.id === currentUserId;
                        const isAdmin = member.role === 'admin';
                        const isManager = member.role === 'manager';

                        return (
                            <div key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between group gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAdmin ? 'bg-blue-600 text-white' : isManager ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                                        {member.email.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-slate-200 text-sm font-medium flex items-center gap-2">
                                            {member.email}
                                            {isMe && <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 rounded">You</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                            {isAdmin ? (
                                                <span className="text-blue-400 flex items-center gap-1"><Shield size={10} /> Admin</span>
                                            ) : isManager ? (
                                                <span className="text-purple-400 flex items-center gap-1"><Briefcase size={10} /> Manager</span>
                                            ) : (
                                                'Standard User'
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {!isMe && (
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <select
                                                disabled={!!actionLoading}
                                                value={member.role}
                                                onChange={(e) => handleUpdateStatus(member.id, 'active', e.target.value as 'admin' | 'manager' | 'standard')}
                                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                                <option value="standard">Standard</option>
                                                <option value="manager">Manager</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>

                                        <button
                                            disabled={!!actionLoading}
                                            onClick={() => handleRemoveUser(member.id)}
                                            className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-700/50"
                                            title="Remove User"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ManagementPanel;