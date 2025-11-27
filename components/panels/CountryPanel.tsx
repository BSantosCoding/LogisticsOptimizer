import React, { useState } from 'react';
import { Container, ProductFormFactor } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Globe, DollarSign, Search } from 'lucide-react';

interface Country {
    id: string;
    code: string;
    name: string;
    containerCosts: Record<string, number>; // containerTemplateId -> cost
}

interface CountryPanelProps {
    countries: Country[];
    setCountries: (countries: Country[]) => void;
    containerTemplates: Container[];
    userRole: 'admin' | 'manager' | 'standard' | null;
}

const CountryPanel: React.FC<CountryPanelProps> = ({
    countries,
    setCountries,
    containerTemplates,
    userRole
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
    const [newCountry, setNewCountry] = useState<Omit<Country, 'id'>>({
        code: '',
        name: '',
        containerCosts: {}
    });

    const canManage = userRole === 'admin' || userRole === 'manager';

    const handleAddCountry = () => {
        if (!newCountry.code || !newCountry.name) return;
        const country: Country = {
            id: `C-${Date.now()}`,
            ...newCountry
        };
        setCountries([...countries, country]);
        setNewCountry({ code: '', name: '', containerCosts: {} });
    };

    const handleUpdateCountry = (id: string, updates: Partial<Country>) => {
        setCountries(countries.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleRemoveCountry = (id: string) => {
        if (window.confirm('Are you sure you want to delete this country configuration?')) {
            setCountries(countries.filter(c => c.id !== id));
        }
    };

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                    <Globe className="text-blue-500" /> Country Configuration
                </h2>

                {/* Search */}
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search countries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 pl-9 text-xs text-slate-200 focus:border-blue-500 outline-none h-9"
                    />
                </div>

                {/* Add New Country */}
                {canManage && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6">
                        <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                            <Plus size={16} className="text-blue-500" /> Add Country
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Country Code (e.g. CN)</label>
                                <input
                                    value={newCountry.code}
                                    onChange={e => setNewCountry({ ...newCountry, code: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                    placeholder="CN"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Country Name</label>
                                <input
                                    value={newCountry.name}
                                    onChange={e => setNewCountry({ ...newCountry, name: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                                    placeholder="China"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddCountry}
                            disabled={!newCountry.code || !newCountry.name}
                            className="w-full py-2 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Country
                        </button>
                    </div>
                )}

                {/* Country List */}
                <div className="space-y-4">
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
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Container Costs</h4>
                                <div className="space-y-2">
                                    {containerTemplates.map(template => (
                                        <div key={template.id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm text-slate-300 truncate flex-1">{template.name}</span>
                                            <div className="flex items-center gap-2 w-32">
                                                <DollarSign size={14} className="text-slate-500" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Default"
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
                        </div>
                    ))}

                    {filteredCountries.length === 0 && (
                        <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-700 rounded-xl">
                            No countries configured.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CountryPanel;
