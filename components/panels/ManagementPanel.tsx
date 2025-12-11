
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import { Role } from '../../utils/roles';
import { Check, X, Shield, User, Trash2, Loader2, Users, Search } from 'lucide-react';
import ConfirmModal from '../modals/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ManagementPanelProps {
    viewMode?: 'summary' | 'list';
    companyId: string | null;
    currentUserRole: Role | null;
    currentUserId: string;
}

const ManagementPanel: React.FC<ManagementPanelProps> = ({ viewMode = 'list', companyId, currentUserRole, currentUserId }) => {
    const { t } = useTranslation();
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

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
        setConfirmModal({
            isOpen: true,
            title: t('modals.removeUserTitle'),
            message: t('modals.removeUserMessage'),
            onConfirm: async () => {
                setActionLoading(userId);
                try {
                    await supabase.from('profiles').delete().eq('id', userId);
                    await fetchMembers();
                } finally {
                    setActionLoading(null);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const pendingMembers = members.filter(m => m.status === 'pending');
    const activeMembers = members
        .filter(m => m.status === 'active')
        .filter(m => m.email.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20} /></div>;

    if (viewMode === 'summary') {
        return (
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-2 text-primary-foreground">
                        <Users size={16} className="text-primary" /> {t('team.overview')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="flex gap-2">
                        <div className="bg-muted rounded p-3 flex-1 flex flex-col items-center">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold">{t('team.active')}</div>
                            <div className="text-2xl font-bold">{activeMembers.length}</div>
                        </div>
                        <div className="bg-muted rounded p-3 flex-1 flex flex-col items-center">
                            <div className="text-[10px] text-muted-foreground uppercase font-bold">{t('team.pending')}</div>
                            <div className={`text-2xl font-bold ${pendingMembers.length > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{pendingMembers.length}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // LIST VIEW
    return (
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-4 z-10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{t('team.userManagement')}</h2>
                            <p className="text-xs text-muted-foreground">{activeMembers.length} {t('team.activeMembers')}</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <Input
                            type="text"
                            className="pl-9"
                            placeholder={t('team.searchUsers')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {/* Pending Requests */}
                    {pendingMembers.length > 0 && (
                        <Card className="border-orange-500/30 bg-orange-900/5">
                            <CardHeader className="bg-orange-900/10 px-4 py-3 border-b border-orange-500/30 flex flex-row justify-between items-center space-y-0">
                                <CardTitle className="text-orange-500 font-bold text-sm uppercase flex items-center gap-2">
                                    <User size={16} /> {t('team.pendingRequests')}
                                </CardTitle>
                                <Badge variant="secondary" className="bg-orange-900/20 text-orange-500">
                                    {pendingMembers.length}
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0 divide-y divide-border">
                                {pendingMembers.map(member => (
                                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                        <div className="text-sm font-medium">{member.email}</div>
                                        <div className="flex gap-2">
                                            <Button
                                                disabled={!!actionLoading}
                                                onClick={() => handleUpdateProfile(member.id, { status: 'active', role: 'standard' })}
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-500 text-white"
                                            >
                                                {actionLoading === member.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                                                {t('team.accept')}
                                            </Button>
                                            <Button
                                                disabled={!!actionLoading}
                                                onClick={() => handleRemoveUser(member.id)}
                                                variant="destructive"
                                                size="sm"
                                            >
                                                <X size={12} className="mr-1" /> {t('team.reject')}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Active Team */}
                    <div>
                        <h3 className="text-muted-foreground font-bold text-sm uppercase mb-3 flex items-center gap-2">
                            <Shield size={16} className="text-primary" /> {t('team.active')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeMembers.map(member => {
                                const isMe = member.id === currentUserId;
                                const isSuperAdmin = member.role === 'super_admin';
                                const isAdmin = member.role === 'admin';
                                const isManager = member.role === 'manager';

                                return (
                                    <Card key={member.id} className="flex flex-col gap-3 transition-colors hover:border-primary/50">
                                        <CardContent className="p-4 flex flex-col gap-3 h-full">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback className={`${isSuperAdmin ? 'bg-indigo-600 text-white' : isAdmin ? 'bg-blue-600 text-white' : isManager ? 'bg-purple-600 text-white' : 'bg-slate-600 text-white'}`}>
                                                        {member.email.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium truncate text-sm" title={member.email}>
                                                        {member.email}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                        {isMe && <Badge variant="secondary" className="text-[10px] px-1 py-0 mr-1">{t('team.you')}</Badge>}
                                                        <span className={isSuperAdmin ? 'text-indigo-500' : isAdmin ? 'text-blue-500' : isManager ? 'text-purple-500' : ''}>
                                                            {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : isManager ? 'Manager' : 'Standard'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 pt-3 border-t mt-auto">
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        disabled={isMe || !!actionLoading}
                                                        value={member.role}
                                                        onValueChange={(val) => handleUpdateProfile(member.id, { role: val as any })}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="standard">Standard</SelectItem>
                                                            <SelectItem value="manager">Manager</SelectItem>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                                                        </SelectContent>
                                                    </Select>

                                                    {!isMe && (
                                                        <Button
                                                            disabled={!!actionLoading}
                                                            onClick={() => handleRemoveUser(member.id)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    )}
                                                </div>

                                                {member.role === 'standard' && (
                                                    <div className={`rounded p-3 border ${isMe ? 'bg-muted/30' : 'bg-muted/50'}`}>
                                                        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-2">
                                                            <Shield size={10} /> {t('team.permissions')}
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {[
                                                                { key: 'can_edit_countries', label: t('team.permCountries') },
                                                                { key: 'can_edit_form_factors', label: t('team.permFormFactors') },
                                                                { key: 'can_edit_containers', label: t('team.permContainers') },
                                                                { key: 'can_edit_templates', label: t('team.permTemplates') },
                                                                { key: 'can_edit_tags', label: t('team.permTags') },
                                                                { key: 'can_edit_import_config', label: t('team.permImportConfig') },
                                                            ].map(perm => (
                                                                <div key={perm.key} className="flex items-center justify-between space-x-2">
                                                                    <Label htmlFor={`perm-${member.id}-${perm.key}`} className="text-xs text-muted-foreground flex-1 cursor-pointer">
                                                                        {perm.label}
                                                                    </Label>
                                                                    <Switch
                                                                        id={`perm-${member.id}-${perm.key}`}
                                                                        checked={!!(member as any)[perm.key]}
                                                                        onCheckedChange={(checked) => handleUpdateProfile(member.id, { [perm.key]: checked })}
                                                                        disabled={isMe || !!actionLoading}
                                                                        className="scale-75"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                isDestructive={true}
            />
        </div>
    );
};

export default ManagementPanel;
