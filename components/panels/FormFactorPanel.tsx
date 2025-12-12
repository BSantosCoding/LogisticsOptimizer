import React, { useState } from 'react';
import { Plus, Trash2, Box, Pencil, Save, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ProductFormFactor, UserProfile } from '../../types';
import { Role, hasRole } from '../../utils/roles';

interface FormFactorPanelProps {
    formFactors: ProductFormFactor[];
    onAdd: (name: string, description: string) => void;
    onRemove: (id: string) => void;
    onEdit: (id: string, name: string, description: string) => void;
    userRole: Role | null;
    userProfile: UserProfile | null;
}

const FormFactorPanel: React.FC<FormFactorPanelProps> = ({ formFactors, onAdd, onRemove, onEdit, userRole, userProfile }) => {
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const canManage = hasRole(userRole, 'manager') || userProfile?.can_edit_form_factors;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName) {
            onAdd(newName, newDesc);
            setNewName('');
            setNewDesc('');
        }
    };

    const startEdit = (ff: ProductFormFactor) => {
        setEditingId(ff.id);
        setEditName(ff.name);
        setEditDesc(ff.description || '');
    };

    const saveEdit = () => {
        if (editingId && editName) {
            onEdit(editingId, editName, editDesc);
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
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

            {canManage && (
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
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {formFactors.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                        No form factors defined.
                    </div>
                ) : (
                    formFactors.map(ff => (
                        <div key={ff.id} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 group hover:border-slate-600 transition-colors">
                            {editingId === ff.id ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <input
                                        type="text"
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        placeholder="Description"
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={saveEdit}
                                            className="flex-1 text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded flex items-center justify-center gap-1"
                                        >
                                            <Save size={12} /> Save
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="flex-1 text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded flex items-center justify-center gap-1"
                                        >
                                            <X size={12} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-slate-200">{ff.name}</div>
                                        {ff.description && <div className="text-xs text-slate-500">{ff.description}</div>}
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => startEdit(ff)}
                                                className="text-slate-500 hover:text-blue-400 p-1 rounded hover:bg-blue-400/10 transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => onRemove(ff.id)}
                                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FormFactorPanel;
