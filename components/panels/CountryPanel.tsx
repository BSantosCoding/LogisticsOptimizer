import React, { useState } from 'react';
import { Container, ProductFormFactor, UserProfile } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Plus, Save, Pencil, Trash2, X, Globe, DollarSign, Search, Weight } from 'lucide-react';
import { supabase } from '../../services/supabase';
import ErrorModal from '../modals/ErrorModal';
import ConfirmModal from '../modals/ConfirmModal';
import { useTranslation } from 'react-i18next';

interface Country {
    id: string;
    code: string;
    name: string;
    containerCosts: Record<string, number>; // containerTemplateId -> cost
    weightLimits: Record<string, number>; // containerTemplateId -> weight limit in kg
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
    const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
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
            title: t('countries.confirmDelete', 'Delete Country'),
            message: t('countries.confirmDeleteMessage', 'Are you sure you want to delete this country?'),
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
        // Only show form to managers and above
        if (!canManage) {
            return null;
        }

        return (
            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                        <Plus size={16} className="text-blue-500" /> {t('countries.addCountry')}
                    </h3>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">{t('countries.code')}</label>
                        <input
                            value={newCountry.code}
                            onChange={e => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                            placeholder="CN"
                            maxLength={2}
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">{t('countries.name')}</label>
                        <input
                            value={newCountry.name}
                            onChange={e => setNewCountry({ ...newCountry, name: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                            placeholder="China"
                        />
                    </div>

                    <button
                        onClick={handleAddCountry}
                        disabled={!newCountry.code || !newCountry.name}
                        className="w-full py-2 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} className="mr-2" /> {t('countries.addCountry')}
                    </button>
                </div>
                <ErrorModal
                    isOpen={errorModal.isOpen}
                    message={errorModal.message}
                    onClose={() => setErrorModal({ isOpen: false, message: '' })}
                />
            </div >
        );
    }

    // LIST VIEW
    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Globe className="text-blue-500" /> {t('countries.configuration')}
                        <span className="text-sm font-normal text-slate-500 ml-2">({countries.length} {t('nav.countries')})</span>
                    </h2>
                </div>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder={t('countries.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 pl-9 text-xs text-slate-200 focus:border-blue-500 outline-none h-9"
                    />
                </div>

                {/* Country List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCountries.map(country => (
                        <div key={country.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {country.name} <span className="text-sm font-normal text-slate-500">({country.code})</span>
                                    </h3>
                                </div>
                                {canManage && (
                                    <button
                                        onClick={() => handleRemoveCountry(country.id)}
                                        className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="bg-slate-900/50 rounded p-3 border border-slate-700">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('countries.containerCosts')}</h4>
                                <div className="space-y-2">
                                    {containerTemplates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-slate-300 truncate flex-1">{template.name}</span>
                                            <div className="flex items-center gap-2 w-32">
                                                <DollarSign size={14} className="text-slate-500" />
                                                <input
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
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:border-blue-500 outline-none text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-900/50 rounded p-3 border border-slate-700 mt-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('countries.weightLimits')}</h4>
                                <div className="space-y-2">
                                    {containerTemplates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-slate-300 truncate flex-1">{template.name}</span>
                                            <div className="flex items-center gap-2 w-32">
                                                <Weight size={14} className="text-slate-500" />
                                                <input
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
                                                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 focus:border-blue-500 outline-none text-right"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredCountries.length === 0 && (
                        <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-xl col-span-full">
                            {t('countries.noCountries')}
                        </div>
                    )}
                </div>
            </div>
            <ErrorModal
                isOpen={errorModal.isOpen}
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
