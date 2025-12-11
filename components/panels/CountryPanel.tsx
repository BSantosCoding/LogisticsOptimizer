
import React, { useState } from 'react';
import { Container, ProductFormFactor, UserProfile } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Plus, Globe, DollarSign, Search, Weight, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import ErrorModal from '../modals/ErrorModal';
import ConfirmModal from '../modals/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Country {
    id: string;
    code: string;
    name: string;
    containerCosts: Record<string, number>;
    weightLimits: Record<string, number>;
}

interface CountryPanelProps {
    viewMode: 'form' | 'list';
    countries: Country[];
    setCountries: (countries: Country[]) => void;
    containerTemplates: Container[];
    userRole: Role | null;
    userProfile: UserProfile | null;
    companyId?: string | null;
}

const CountryPanel: React.FC<CountryPanelProps> = ({
    viewMode,
    countries,
    setCountries,
    containerTemplates,
    userRole,
    userProfile,
    companyId
}) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [newCountry, setNewCountry] = useState<Omit<Country, 'id'>>({
        code: '',
        name: '',
        containerCosts: {},
        weightLimits: {}
    });
    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const canManage = hasRole(userRole, 'admin') || userRole === 'manager' || userProfile?.can_edit_countries;

    const handleAddCountry = async () => {
        if (!newCountry.code || !newCountry.name || !companyId) return;

        try {
            const { data, error } = await supabase
                .from('countries')
                .insert([{
                    company_id: companyId,
                    code: newCountry.code,
                    name: newCountry.name,
                    container_costs: newCountry.containerCosts,
                    weight_limits: newCountry.weightLimits
                }])
                .select()
                .single();

            if (error) throw error;

            const country: Country = {
                id: data.id,
                code: data.code,
                name: data.name,
                containerCosts: data.container_costs || {},
                weightLimits: data.weight_limits || {}
            };
            setCountries([...countries, country]);
            setNewCountry({ code: '', name: '', containerCosts: {}, weightLimits: {} });
        } catch (error) {
            console.error('Error adding country:', error);
            setErrorModal({ isOpen: true, message: t('countries.errorAdd') });
        }
    };

    const handleUpdateCountry = async (id: string, updates: Partial<Country>) => {
        try {
            const { error } = await supabase
                .from('countries')
                .update({
                    code: updates.code,
                    name: updates.name,
                    container_costs: updates.containerCosts,
                    weight_limits: updates.weightLimits
                })
                .eq('id', id);

            if (error) throw error;

            setCountries(countries.map(c => c.id === id ? { ...c, ...updates } : c));
        } catch (error) {
            console.error('Error updating country:', error);
            setErrorModal({ isOpen: true, message: t('countries.errorUpdate') });
        }
    };

    const handleRemoveCountry = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: t('modals.deleteCountryTitle'),
            message: t('modals.deleteCountryMessage'),
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('countries')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;

                    setCountries(countries.filter(c => c.id !== id));
                } catch (error) {
                    console.error('Error deleting country:', error);
                    setErrorModal({ isOpen: true, message: t('countries.errorDelete') });
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (viewMode === 'form') {
        if (!canManage) return null;

        return (
            <div className="p-4 border-b border-border bg-muted/20">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm uppercase">
                            <Plus size={16} className="text-primary" /> {t('countries.addCountry')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">{t('countries.code')}</Label>
                            <Input
                                value={newCountry.code}
                                onChange={e => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                                placeholder="CN"
                                maxLength={2}
                            />
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">{t('countries.name')}</Label>
                            <Input
                                value={newCountry.name}
                                onChange={e => setNewCountry({ ...newCountry, name: e.target.value })}
                                placeholder="China"
                            />
                        </div>

                        <Button
                            onClick={handleAddCountry}
                            disabled={!newCountry.code || !newCountry.name}
                            className="w-full"
                        >
                            <Plus size={16} className="mr-2" /> {t('countries.addCountry')}
                        </Button>
                    </CardContent>
                </Card>
                <ErrorModal
                    isOpen={errorModal.isOpen}
                    title={t('modals.errorTitle')}
                    message={errorModal.message}
                    onClose={() => setErrorModal({ isOpen: false, message: '' })}
                />
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="h-full flex flex-col p-2">
            <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Globe className="text-primary" /> {t('countries.configuration')}
                        <Badge variant="outline" className="ml-2">
                            {countries.length} {t('nav.countries')}
                        </Badge>
                    </h2>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                        type="text"
                        placeholder={t('countries.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Country List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                {filteredCountries.map(country => (
                    <Card key={country.id} className="group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                {country.name} <span className="text-xs font-normal text-muted-foreground">({country.code})</span>
                            </CardTitle>
                            {canManage && (
                                <Button
                                    onClick={() => handleRemoveCountry(country.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Container Costs */}
                            <div className="bg-muted/10 rounded-lg p-3 border">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">{t('countries.containerCosts')}</h4>
                                <div className="space-y-2">
                                    {containerTemplates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm truncate flex-1">{template.name}</span>
                                            <div className="flex items-center gap-2 w-32 relative">
                                                <DollarSign size={12} className="absolute left-2 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder={t('countries.default')}
                                                    value={country.containerCosts[template.id] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        const newCosts = { ...country.containerCosts };
                                                        if (isNaN(val)) {
                                                            delete newCosts[template.id];
                                                        } else {
                                                            newCosts[template.id] = val;
                                                        }
                                                        handleUpdateCountry(country.id, { containerCosts: newCosts });
                                                    }}
                                                    className="h-7 text-right pl-6 text-xs"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Weight Limits */}
                            <div className="bg-muted/10 rounded-lg p-3 border">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">{t('countries.weightLimits')}</h4>
                                <div className="space-y-2">
                                    {containerTemplates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm truncate flex-1">{template.name}</span>
                                            <div className="flex items-center gap-2 w-32 relative">
                                                <Weight size={12} className="absolute left-2 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder={t('countries.noLimit')}
                                                    value={country.weightLimits?.[template.id] || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        const newLimits = { ...country.weightLimits };
                                                        if (isNaN(val)) {
                                                            delete newLimits[template.id];
                                                        } else {
                                                            newLimits[template.id] = val;
                                                        }
                                                        handleUpdateCountry(country.id, { weightLimits: newLimits });
                                                    }}
                                                    className="h-7 text-right pl-6 text-xs"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredCountries.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground italic col-span-full border-2 border-dashed rounded-xl bg-muted/5">
                        {t('countries.noCountries')}
                    </div>
                )}
            </div>

            <ErrorModal
                isOpen={errorModal.isOpen}
                title={t('modals.errorTitle')}
                message={errorModal.message}
                onClose={() => setErrorModal({ isOpen: false, message: '' })}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                isDestructive={true}
            />
        </div >
    );
};

export default CountryPanel;
