import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/20 p-2 rounded-lg">
                            <AlertTriangle className="text-yellow-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Import Summary</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <p className="text-slate-300">
                            Successfully imported <span className="font-bold text-green-400">{totalImported} products</span>
                            {savedToDb ? ' to database' : ' (session only)'}.
                        </p>
                    </div>

                    {productsWithIssues.length > 0 && (
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="text-yellow-400" size={18} />
                                <h3 className="font-semibold text-yellow-400">
                                    {productsWithIssues.length} Product{productsWithIssues.length !== 1 ? 's' : ''} Need Attention
                                </h3>
                            </div>

                            <p className="text-sm text-slate-300 mb-3">
                                The following products have <span className="font-semibold text-yellow-400">UNKNOWN form factors</span> and need to be assigned before optimization:
                            </p>

                            <div className="bg-slate-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                                <ul className="space-y-2">
                                    {productsWithIssues.map((product, idx) => (
                                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                                            <span className="text-yellow-500 mt-0.5">•</span>
                                            <span className="flex-1">{product}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-all"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportSummaryModal;
