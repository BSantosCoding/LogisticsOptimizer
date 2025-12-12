import React from 'react';
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
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Products</DialogTitle>
                    <DialogDescription>
                        Found <span className="font-bold text-primary">{productCount} products</span> to import.
                        Would you like to save these products to your company database?
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 w-full pt-4">
                    <Button onClick={() => onConfirm(true)} className="w-full">
                        <Database size={18} className="mr-2" />
                        Save to Database
                    </Button>
                    <Button onClick={() => onConfirm(false)} variant="secondary" className="w-full">
                        <Zap size={18} className="mr-2" />
                        Session Only (Don't Save)
                    </Button>
                    <Button onClick={onCancel} variant="outline" className="w-full">
                        Cancel Import
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportConfirmModal;
