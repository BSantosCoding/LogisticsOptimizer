import React from 'react';
import { Database, X, Zap } from 'lucide-react';

interface ImportConfirmModalProps {
    onConfirm: (saveToDb: boolean) => void;
    onCancel: () => void;
    productCount: number;
}

const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({ onConfirm, onCancel, productCount }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Import Products</h2>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-300">
                        Found <span className="font-bold text-blue-400">{productCount} products</span> to import.
                    </p>
                    <p className="text-slate-400 text-sm">
                        Would you like to save these products to your company database?
                    </p>

                    <div className="space-y-3 pt-2">
                        <button
                            onClick={() => onConfirm(true)}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            <Database size={18} />
                            Save to Database
                        </button>

                        <button
                            onClick={() => onConfirm(false)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Zap size={18} />
                            Session Only (Don't Save)
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white font-medium py-2 px-4 rounded-lg transition-all border border-slate-600"
                        >
                            Cancel Import
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportConfirmModal;
