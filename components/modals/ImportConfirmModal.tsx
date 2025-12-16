import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Zap } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImportConfirmModalProps {
    onConfirm: (saveToDb: boolean) => void;
    onCancel: () => void;
    productCount: number;
}

const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({ onConfirm, onCancel, productCount }) => {
    const { t } = useTranslation();
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('modals.importTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('modals.found')} <span className="font-bold text-primary">{productCount} {t('shipments.items')}</span>.
                        {t('modals.foundSuffix')}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 w-full pt-4">
                    <Button onClick={() => onConfirm(true)} className="w-full">
                        <Database size={18} className="mr-2" />
                        {t('modals.saveProducts')}
                    </Button>
                    <Button onClick={() => onConfirm(false)} variant="secondary" className="w-full">
                        <Zap size={18} className="mr-2" />
                        {t('modals.quickAnalysis')}
                    </Button>
                    <Button onClick={onCancel} variant="outline" className="w-full">
                        {t('modals.cancelImport')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportConfirmModal;
