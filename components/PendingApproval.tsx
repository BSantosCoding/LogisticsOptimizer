import React from 'react';
import { Clock, RefreshCw, Repeat, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTranslation, Trans } from 'react-i18next';

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
    const { t } = useTranslation();
    const isPendingCompanyApproval = companyName && companyName !== 'Super Admin';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-card p-8 rounded-2xl shadow-2xl border border-border w-full max-w-md text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-orange-500/10 p-4 rounded-full border border-orange-500/20">
                        <Clock className="text-orange-400" size={48} />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isPendingCompanyApproval ? t('pendingApproval.companyAwaiting') : t('pendingApproval.accessPending')}
                </h2>
                <div className="text-muted-foreground mb-6">
                    {isPendingCompanyApproval ? (
                        <div className="space-y-1">
                            <Trans
                                i18nKey="pendingApproval.messageAwaiting"
                                values={{ companyName }}
                                components={{ strong: <strong /> }}
                            />
                            <br />
                            {t('pendingApproval.messageAwaitingSub')}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <Trans
                                i18nKey="pendingApproval.messageSent"
                                values={{ companyName }}
                                components={{ strong: <strong /> }}
                            />
                            <br />
                            {t('pendingApproval.messageSentSub')}
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                    <Button onClick={onCheckStatus} isLoading={isDataLoading} className="w-full">
                        <RefreshCw size={16} className="mr-2" /> {t('pendingApproval.checkStatus')}
                    </Button>
                    <div className="flex gap-2">
                        <button onClick={onSwitchWorkspace} className="flex-1 py-2 text-muted-foreground border border-border rounded hover:bg-muted text-sm flex items-center justify-center gap-2">
                            <Repeat size={14} /> {t('pendingApproval.switchWorkspace')}
                        </button>
                        <button onClick={onLogout} className="flex-1 py-2 text-muted-foreground border border-border rounded hover:bg-muted text-sm flex items-center justify-center gap-2">
                            <LogOut size={14} /> {t('pendingApproval.logout')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
