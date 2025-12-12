import React, { useState } from 'react';
import { Plus, Trash2, Box, Pencil, Save, X, Weight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormFactor, UserProfile } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { useTranslation } from 'react-i18next';

interface FormFactorPanelProps {
    formFactors: ProductFormFactor[];
    onAdd: (name: string, description: string, palletWeight?: number, unitsPerPallet?: number) => void;
    onRemove: (id: string) => void;
    onEdit: (id: string, name: string, description: string, palletWeight?: number, unitsPerPallet?: number) => void;
    userRole: Role | null;
    userProfile: UserProfile | null;
}

const FormFactorPanel: React.FC<FormFactorPanelProps> = ({ formFactors, onAdd, onRemove, onEdit, userRole, userProfile }) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPalletWeight, setNewPalletWeight] = useState('');
    const [newUnitsPerPallet, setNewUnitsPerPallet] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPalletWeight, setEditPalletWeight] = useState('');
    const [editUnitsPerPallet, setEditUnitsPerPallet] = useState('');

    const canManage = hasRole(userRole, 'manager') || userProfile?.can_edit_form_factors;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName) {
            const palletWeight = newPalletWeight ? parseFloat(newPalletWeight) : undefined;
            const unitsPerPallet = newUnitsPerPallet ? parseInt(newUnitsPerPallet) : undefined;
            onAdd(newName, newDesc, palletWeight, unitsPerPallet);
            setNewName('');
            setNewDesc('');
            setNewPalletWeight('');
            setNewUnitsPerPallet('');
        }
    };

    const startEdit = (ff: ProductFormFactor) => {
        setEditingId(ff.id);
        setEditName(ff.name);
        setEditDesc(ff.description || '');
        setEditPalletWeight(ff.pallet_weight?.toString() || '');
        setEditUnitsPerPallet(ff.units_per_pallet?.toString() || '');
    };

    const saveEdit = () => {
        if (editingId && editName) {
            const palletWeight = editPalletWeight ? parseFloat(editPalletWeight) : undefined;
            const unitsPerPallet = editUnitsPerPallet ? parseInt(editUnitsPerPallet) : undefined;
            onEdit(editingId, editName, editDesc, palletWeight, unitsPerPallet);
            setEditingId(null);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
        setEditPalletWeight('');
        setEditUnitsPerPallet('');
    };

    const formatPalletConfig = (ff: ProductFormFactor) => {
        if (ff.pallet_weight && ff.units_per_pallet) {
            return `${ff.pallet_weight}kg / ${ff.units_per_pallet} ${t('common.units')}`;
        }
        return null;
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Box className="text-primary" size={16} />
                        {t('config.formFactors', 'Form Factors')}
                    </CardTitle>
                    <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {formFactors.length}
                    </div>
                </div>
            </CardHeader>

            {canManage && (
                <div className="p-4 border-b border-border bg-muted/5">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('config.name', 'Name')}</Label>
                                <Input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. OSB, IBC"
                                    className="h-8 bg-muted/30 border-input/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('config.description', 'Description')}</Label>
                                <Input
                                    type="text"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Optional"
                                    className="h-8 bg-muted/30 border-input/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('config.palletWeight')}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={newPalletWeight}
                                    onChange={(e) => setNewPalletWeight(e.target.value)}
                                    placeholder={t('config.palletWeightPlaceholder')}
                                    className="h-8 bg-muted/30 border-input/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{t('config.unitsPerPallet')}</Label>
                                <Input
                                    type="number"
                                    value={newUnitsPerPallet}
                                    onChange={(e) => setNewUnitsPerPallet(e.target.value)}
                                    placeholder={t('config.unitsPerPalletPlaceholder')}
                                    className="h-8 bg-muted/30 border-input/50"
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={!newName} className="w-full h-8" size="sm">
                            <Plus size={14} className="mr-1" /> {t('config.addFormFactor', 'Add Form Factor')}
                        </Button>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {formFactors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        {t('config.noFormFactors', 'No form factors defined.')}
                    </div>
                ) : (
                    formFactors.map(ff => (
                        <div key={ff.id} className="bg-muted/30 border border-border/50 rounded-lg p-3 group hover:border-primary/30 hover:bg-muted/50 transition-all">
                            {editingId === ff.id ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder={t('config.name')}
                                            className="h-7 bg-background border-input/50 text-sm"
                                        />
                                        <Input
                                            type="text"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                            placeholder={t('config.description')}
                                            className="h-7 bg-background border-input/50 text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={editPalletWeight}
                                            onChange={(e) => setEditPalletWeight(e.target.value)}
                                            placeholder={t('config.palletWeight')}
                                            className="h-7 bg-background border-input/50 text-xs"
                                        />
                                        <Input
                                            type="number"
                                            value={editUnitsPerPallet}
                                            onChange={(e) => setEditUnitsPerPallet(e.target.value)}
                                            placeholder={t('config.unitsPerPallet')}
                                            className="h-7 bg-background border-input/50 text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={saveEdit}
                                            size="sm"
                                            className="flex-1 h-7 text-xs"
                                        >
                                            <Save size={12} className="mr-1" /> {t('common.save')}
                                        </Button>
                                        <Button
                                            onClick={cancelEdit}
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1 h-7 text-xs"
                                        >
                                            <X size={12} className="mr-1" /> {t('common.cancel')}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium text-sm">{ff.name}</div>
                                        {ff.description && <div className="text-xs text-muted-foreground">{ff.description}</div>}
                                        {formatPalletConfig(ff) && (
                                            <div className="text-xs text-primary/70 flex items-center gap-1 mt-1">
                                                <Weight size={10} />
                                                {formatPalletConfig(ff)}
                                            </div>
                                        )}
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                onClick={() => startEdit(ff)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            >
                                                <Pencil size={14} />
                                            </Button>
                                            <Button
                                                onClick={() => onRemove(ff.id)}
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};

export default FormFactorPanel;
