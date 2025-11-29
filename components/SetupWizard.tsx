import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import Button from './Button';
import { supabase } from '../services/supabase';

interface SetupWizardProps {
    session: any;
    onComplete: () => Promise<void>;
    onLogout: () => Promise<void>;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ session, onComplete, onLogout }) => {
    const [setupMode, setSetupMode] = useState<'create' | 'join'>('create');
    const [setupCompanyName, setSetupCompanyName] = useState('');
    const [availableCompanies, setAvailableCompanies] = useState<{ id: string, name: string }[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [setupError, setSetupError] = useState<string | null>(null);

    useEffect(() => {
        if (setupMode === 'join') {
            fetchCompanies();
        }
    }, [setupMode]);

    const fetchCompanies = async () => {
        const { data } = await supabase.from('companies').select('id, name').order('name');
        if (data) setAvailableCompanies(data);
    };

    const handleCompleteSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSettingUp(true);
        setSetupError(null);

        try {
            let targetCompanyId = selectedCompanyId;
            let initialStatus = 'active';
            let initialRole = 'standard';

            if (setupMode === 'create') {
                if (!setupCompanyName) return;
                // Create Company with pending approval status
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .insert([{
                        name: setupCompanyName,
                        approval_status: 'pending' // New companies need super admin approval
                    }])
                    .select()
                    .single();

                if (companyError) throw companyError;
                targetCompanyId = companyData.id;
                initialStatus = 'pending'; // Creator waits for company approval
                initialRole = 'admin';    // Creator will be Admin once approved
            } else {
                if (!selectedCompanyId) return;
                initialStatus = 'pending'; // Joiners must be approved
                initialRole = 'standard';
            }

            // Check if profile exists (upsert) or insert new
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert([{
                    id: session.user.id,
                    email: session.user.email,
                    company_id: targetCompanyId,
                    status: initialStatus,
                    role: initialRole
                }]);

            if (profileError) throw profileError;

            // Reload
            await onComplete();

        } catch (err: any) {
            console.error("Setup failed:", err);
            if (err.message && err.message.includes("infinite recursion")) {
                setSetupError("Database Policy Error: Infinite Recursion. Please run the provided 'get_my_company_id' SQL fix in Supabase.");
            } else if (err.message && err.message.includes("row-level security")) {
                setSetupError("Database permissions denied. Please run the SQL policies.");
            } else {
                setSetupError("Failed to setup workspace: " + err.message);
            }
        } finally {
            setIsSettingUp(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="bg-purple-600 p-3 rounded-xl shadow-lg shadow-purple-900/30">
                        <Building2 className="text-white" size={32} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Aboard</h2>
                <p className="text-slate-400 text-sm text-center mb-6">
                    {setupMode === 'create' ? 'Create a new workspace' : 'Join an existing workspace'}
                </p>

                {setupError && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
                        {setupError}
                    </div>
                )}

                <form onSubmit={handleCompleteSetup}>
                    <div className="mb-4">
                        {setupMode === 'create' ? (
                            <input
                                type="text"
                                placeholder="Company Name"
                                value={setupCompanyName}
                                onChange={(e) => setSetupCompanyName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200 focus:border-blue-500 outline-none transition-colors"
                                required
                            />
                        ) : (
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 text-slate-200 focus:border-blue-500 outline-none transition-colors cursor-pointer"
                                required
                            >
                                <option value="" disabled>Choose a company...</option>
                                {availableCompanies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} (ID: {c.id.substring(0, 8)})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="flex gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setSetupMode('create')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${setupMode === 'create'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                        >
                            Create New
                        </button>
                        <button
                            type="button"
                            onClick={() => setSetupMode('join')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${setupMode === 'join'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                }`}
                        >
                            Join Existing
                        </button>
                    </div>
                    <Button type="submit" isLoading={isSettingUp} className="w-full py-3 mt-2">
                        {setupMode === 'create' ? 'Create & Start' : 'Request to Join'}
                    </Button>
                    <button type="button" onClick={onLogout} className="w-full mt-4 text-sm text-slate-500">Sign Out</button>
                </form>
            </div>
        </div>
    );
};

export default SetupWizard;
