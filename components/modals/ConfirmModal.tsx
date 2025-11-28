import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4">
                    {isDestructive && <AlertTriangle className="text-red-400" size={24} />}
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>

                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${isDestructive
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'bg-blue-600 text-white hover:bg-blue-500'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
