import React, { useState } from 'react';
import { Plus, Trash2, Box } from 'lucide-react';
import Button from '../Button';
import { ProductFormFactor } from '../../types';

interface FormFactorPanelProps {
    formFactors: ProductFormFactor[];
    onAdd: (name: string, description: string) => void;
    onRemove: (id: string) => void;
}

const FormFactorPanel: React.FC<FormFactorPanelProps> = ({ formFactors, onAdd, onRemove }) => {
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName) {
            onAdd(newName, newDesc);
            setNewName('');
            setNewDesc('');
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Box className="text-blue-400" size={20} />
                    Form Factors
                </h2>
                <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
                    {formFactors.length}
                </span>
            </div>

            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. OSB, IBC"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                        <input
                            type="text"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Optional description"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <Button type="submit" disabled={!newName} className="w-full">
                        <Plus size={16} className="mr-2" /> Add Form Factor
                    </Button>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {formFactors.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        No form factors defined.
                    </div>
                ) : (
                    formFactors.map(ff => (
                        <div key={ff.id} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 flex justify-between items-center group hover:border-slate-600 transition-colors">
                            <div>
                                <div className="font-medium text-slate-200">{ff.name}</div>
                                {ff.description && <div className="text-xs text-slate-500">{ff.description}</div>}
                            </div>
                            <button
                                onClick={() => onRemove(ff.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FormFactorPanel;
