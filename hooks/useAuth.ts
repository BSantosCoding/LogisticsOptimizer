import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Role } from '../utils/roles';
import { UserProfile } from '../types';

export interface AuthState {
    session: any;
    loadingSession: boolean;
    companyId: string | null;
    companyName: string;
    approvalStatus: 'active' | 'pending' | null;
    userRole: Role | null;
    userProfile: UserProfile | null;
    viewAsRole: Role | null;
    viewAsPermissions: Partial<UserProfile> | null;
    setViewAsRole: (role: Role | null, permissions?: Partial<UserProfile>) => void;
    isSetupRequired: boolean;
    setIsSetupRequired: (required: boolean) => void;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
}

export const useAuth = (): AuthState => {
    const [session, setSession] = useState<any>(null);
    const [loadingSession, setLoadingSession] = useState(true);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const [approvalStatus, setApprovalStatus] = useState<'active' | 'pending' | null>(null);
    const [userRole, setUserRole] = useState<Role | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [viewAsRole, setViewAsRoleState] = useState<Role | null>(null);
    const [viewAsPermissions, setViewAsPermissions] = useState<Partial<UserProfile> | null>(null);
    const [isSetupRequired, setIsSetupRequired] = useState(false);

    const setViewAsRole = (role: Role | null, permissions?: Partial<UserProfile>) => {
        setViewAsRoleState(role);
        setViewAsPermissions(permissions || null);
    };

    // Calculate effective profile based on viewAsRole
    const effectiveProfile = userProfile ? {
        ...userProfile,
        role: viewAsRole || userProfile.role,
        ...(viewAsRole === 'standard' && viewAsPermissions ? viewAsPermissions : {})
    } : null;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoadingSession(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadUserData = async () => {
        if (!session?.user) return;

        try {
            // 1. Get Profile & Company
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!profile) {
                setIsSetupRequired(true);
                return;
            }

            const status = profile.status || 'active';
            const role = profile.role || 'standard';

            setApprovalStatus(status as 'active' | 'pending');
            setUserRole(role as 'super_admin' | 'admin' | 'manager' | 'standard');
            setUserProfile(profile as UserProfile);

            // Super admins can work with their own company data if they have one
            // They still get access to the super admin panel, but can also manage their company
            if (role === 'super_admin' && !profile.company_id) {
                // Super admin with no company - super admin panel only
                setCompanyName('Super Admin');
                setIsSetupRequired(false);
                console.log('Super admin with no company detected');
                return;
            }

            // Continue loading company data (whether super admin or not)
            const { data: company } = await supabase
                .from('companies')
                .select('name, approval_status')
                .eq('id', profile.company_id)
                .single();

            if (company) {
                setCompanyName(company.name);

                // Check if company is approved
                if (company.approval_status !== 'approved') {
                    setApprovalStatus('pending'); // Treat unapproved company as pending user
                    setIsSetupRequired(false);
                    return; // Stop loading data if company not approved
                }
            }

            if (status === 'pending') {
                setIsSetupRequired(false);
                return; // Stop loading data if pending
            }

            // Valid active profile exists with approved company, load data
            setCompanyId(profile.company_id);
            setIsSetupRequired(false);

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    useEffect(() => {
        if (session?.user) {
            loadUserData();
        } else {
            // Reset state on logout
            setCompanyId(null);
            setCompanyName('');
            setApprovalStatus(null);
            setUserRole(null);
            setUserProfile(null);
            setIsSetupRequired(false);
        }
    }, [session]);

    const logout = async () => {
        await supabase.auth.signOut();
        // State reset is handled by useEffect on session change
    };

    return {
        session,
        loadingSession,
        companyId,
        companyName,
        approvalStatus,
        userRole,
        userProfile: effectiveProfile, // Return the effective profile
        viewAsRole,
        viewAsPermissions,
        setViewAsRole,
        isSetupRequired,
        setIsSetupRequired,
        logout,
        refreshAuth: loadUserData
    };
};
