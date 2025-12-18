import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ErrorModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, title, message, onClose }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <DialogTitle>{title || t('modals.errorTitle')}</DialogTitle>
                    </div>
                    <DialogDescription className="text-destructive">
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onClose} variant="secondary">
                        {t('modals.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ErrorModal;
