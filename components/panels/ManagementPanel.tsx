
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import { Role } from '../../utils/roles';
import { Check, X, Shield, User, Trash2, Briefcase, Loader2, Users } from 'lucide-react';

interface ManagementPanelProps {
    viewMode?: 'summary' | 'list';
    companyId: string | null;
    currentUserRole: Role | null;
    currentUserId: string;
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ viewMode = 'list', companyId, currentUserRole, currentUserId }) => {
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleUpdateProfile = async (userId: string, updates: Partial<UserProfile>) => {
        setActionLoading(userId);
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
    const activeMembers = members
        .filter(m => m.status === 'active')
        .filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase()));

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
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 z-10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/10 p-2 rounded-lg border border-blue-500/20">
                            <Users className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">User Management</h2>
                            <p className="text-xs text-slate-500">{activeMembers.length} active members</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-blue-500 sm:text-sm transition-colors"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* Pending Requests */}
                    {pendingMembers.length > 0 && (
                        <div className="w-full md:w-1/2 bg-orange-900/10 rounded-lg border border-orange-500/30 overflow-hidden">
                            <div className="bg-orange-900/20 px-4 py-3 border-b border-orange-500/30 flex justify-between items-center">
                                <h3 className="text-orange-200 font-bold text-sm uppercase flex items-center gap-2">
                                    <User size={16} /> Pending Requests
                                </h3>
                                <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded-full">
                                    {pendingMembers.length}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-700/50">
                                {pendingMembers.map(member => (
                                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                        <div className="text-sm text-white font-medium">{member.email}</div>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={!!actionLoading}
                                                onClick={() => handleUpdateProfile(member.id, { status: 'active', role: 'standard' })}
                                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                                            >
                                                {actionLoading === member.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                Accept
                                            </button>
                                            <button
                                                disabled={!!actionLoading}
                                                onClick={() => handleRemoveUser(member.id)}
                                                className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-900/50 px-4 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
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
                        <div className="flex items-center gap-4 mb-3">
                            <h3 className="text-slate-400 font-bold text-sm uppercase flex items-center gap-2">
                                <Shield size={16} className="text-blue-500" /> Active Members
                            </h3>
                            <div className="h-px bg-slate-700 flex-1 max-w-[200px]"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeMembers.map(member => {
                                const isMe = member.id === currentUserId;
                                const isSuperAdmin = member.role === 'super_admin';
                                const isAdmin = member.role === 'admin';
                                const isManager = member.role === 'manager';

                                return (
                                    <div key={member.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col gap-3 shadow-sm hover:border-slate-600 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isSuperAdmin ? 'bg-indigo-600 text-white' : isAdmin ? 'bg-blue-600 text-white' : isManager ? 'bg-purple-600 text-white' : 'bg-slate-600 text-slate-300'}`}>
                                                {member.email.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-slate-200 text-sm font-medium truncate" title={member.email}>
                                                    {member.email}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    {isMe && <span className="text-[9px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold mr-1">You</span>}
                                                    <span className={isSuperAdmin ? 'text-indigo-400' : isAdmin ? 'text-blue-400' : isManager ? 'text-purple-400' : ''}>
                                                        {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : isManager ? 'Manager' : 'Standard'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-3 border-t border-slate-700/50">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    disabled={isMe || !!actionLoading}
                                                    value={member.role}
                                                    onChange={(e) => handleUpdateProfile(member.id, { role: e.target.value as any })}
                                                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer hover:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="standard">Standard</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="admin">Admin</option>
                                                    {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                                                </select>

                                                {!isMe && (
                                                    <button
                                                        disabled={!!actionLoading}
                                                        onClick={() => handleRemoveUser(member.id)}
                                                        className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-700/50 transition-colors"
                                                        title="Remove User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {member.role === 'standard' && (
                                                <div className={`rounded p-3 border ${isMe ? 'bg-slate-900/30 border-slate-700/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
                                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 flex items-center gap-2">
                                                        <Shield size={10} /> Permissions
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {[
                                                            { key: 'can_edit_countries', label: 'Countries' },
                                                            { key: 'can_edit_form_factors', label: 'Form Factors' },
                                                            { key: 'can_edit_containers', label: 'Containers' },
                                                            { key: 'can_edit_templates', label: 'Templates' },
                                                            { key: 'can_edit_tags', label: 'Tags' },
                                                        ].map(perm => (
                                                            <label key={perm.key} className={`flex items-center gap-2 ${isMe ? 'cursor-default' : 'cursor-pointer group'}`}>
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer sr-only"
                                                                        checked={!!(member as any)[perm.key]}
                                                                        onChange={(e) => handleUpdateProfile(member.id, { [perm.key]: e.target.checked })}
                                                                        disabled={isMe || !!actionLoading}
                                                                    />
                                                                    <div className="w-7 h-3.5 bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors peer-disabled:opacity-50"></div>
                                                                    <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-slate-400 rounded-full transition-transform peer-checked:translate-x-3.5 peer-checked:bg-white peer-disabled:bg-slate-300"></div>
                                                                </div>
                                                                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{perm.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagementPanel;
