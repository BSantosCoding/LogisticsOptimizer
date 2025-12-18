import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportSummaryModalProps {
    totalImported: number;
    savedToDb: boolean;
    productsWithIssues: string[];
    onClose: () => void;
}

const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({
    totalImported,
    savedToDb,
    productsWithIssues,
    onClose
}) => {
    const { t } = useTranslation();
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        {productsWithIssues.length > 0 && (
                            <div className="bg-amber-500/20 p-2 rounded-lg">
                                <AlertTriangle className="text-amber-500" size={24} />
                            </div>
                        )}
                        <DialogTitle>{t('modals.importSummaryTitle')}</DialogTitle>
                    </div>
                    <DialogDescription>
                        {t('modals.importedSuccess')} <span className="font-bold text-primary">{totalImported} {t('shipments.items')}</span>
                        {savedToDb ? t('modals.toDatabase') : t('modals.sessionOnly')}.
                    </DialogDescription>
                </DialogHeader>

                {productsWithIssues.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="text-amber-500" size={18} />
                            <h3 className="font-semibold text-amber-500">
                                {t('modals.productsNeedAttention', { count: productsWithIssues.length })}
                            </h3>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                            {t('modals.unknownIssues')}
                        </p>

                        <ScrollArea className="h-48 bg-muted/30 rounded-lg p-3">
                            <ul className="space-y-2">
                                {productsWithIssues.map((product, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        <span className="flex-1">{product}</span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={onClose} className="w-full">
                        {t('modals.gotIt')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImportSummaryModal;
