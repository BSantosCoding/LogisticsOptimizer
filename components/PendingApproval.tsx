import React from 'react';
import { Clock, RefreshCw, Repeat, LogOut } from 'lucide-react';
import Button from './Button';

interface PendingApprovalProps {
    companyName: string;
    onCheckStatus: () => Promise<void>;
    onSwitchWorkspace: () => void;
    onLogout: () => Promise<void>;
    isDataLoading: boolean;
}

const PendingApproval: React.FC<PendingApprovalProps> = ({
    companyName,
    onCheckStatus,
    onSwitchWorkspace,
    onLogout,
    isDataLoading
}) => {
    const isPendingCompanyApproval = companyName && companyName !== 'Super Admin';

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-orange-500/10 p-4 rounded-full border border-orange-500/20">
                        <Clock className="text-orange-400" size={48} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isPendingCompanyApproval ? 'Company Awaiting Approval' : 'Access Pending'}
                </h2>
                <p className="text-slate-400 mb-6">
                    {isPendingCompanyApproval ? (
                        <>
                            Your company <strong>{companyName}</strong> is awaiting approval from a Super Admin. <br />
                            You'll be able to access the platform once approved.
                        </>
                    ) : (
                        <>
                            Your request to join <strong>{companyName}</strong> has been sent. <br />
                            An administrator must approve your account.
                        </>
                    )}
                </p>
                <div className="space-y-3">
                    <Button onClick={onCheckStatus} isLoading={isDataLoading} className="w-full">
                        <RefreshCw size={16} className="mr-2" /> Check Status
                    </Button>
                    <div className="flex gap-2">
                        <button onClick={onSwitchWorkspace} className="flex-1 py-2 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 text-sm flex items-center justify-center gap-2">
                            <Repeat size={14} /> Change Workspace
                        </button>
                        <button onClick={onLogout} className="flex-1 py-2 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 text-sm flex items-center justify-center gap-2">
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default PendingApproval;
