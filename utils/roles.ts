export type Role = 'super_admin' | 'admin' | 'manager' | 'standard';

const ROLE_HIERARCHY: Record<Role, number> = {
    'super_admin': 4,
    'admin': 3,
    'manager': 2,
    'standard': 1
};

export const hasRole = (currentRole: Role | null, requiredRole: Role): boolean => {
    if (!currentRole) return false;
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
};

export const getAvailableViewRoles = (currentRole: Role | null): Role[] => {
    if (!currentRole) return [];

    const currentLevel = ROLE_HIERARCHY[currentRole];
    return (Object.keys(ROLE_HIERARCHY) as Role[])
        .filter(role => ROLE_HIERARCHY[role] <= currentLevel)
        .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]); // Sort high to low
};

export const getRoleLabel = (role: Role): string => {
    switch (role) {
        case 'super_admin': return 'Super Admin';
        case 'admin': return 'Admin';
        case 'manager': return 'Manager';
        case 'standard': return 'Standard User';
        default: return role;
    }
};
