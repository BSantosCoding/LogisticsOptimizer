
import React, { useState } from 'react';
import { Product, UserProfile, CSVMapping } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Copy, Plus, ShieldAlert, Trash2, Lock, Search, Filter, ChevronDown, Settings, Save, Check } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { useTranslation } from 'react-i18next';

interface ConfigPanelProps {
  viewMode: 'form' | 'list';
  templates: Product[];
  newTemplate: Partial<Product>;
  setNewTemplate: (t: Partial<Product>) => void;
  handleAddTemplate: () => void;
  handleRemoveTemplate: (id: string) => void;
  applyTemplate: (t: Product) => void;
  restrictionTags: string[];
  userRole: Role | null;
  userProfile: UserProfile | null;
  csvMapping: CSVMapping;
  onUpdateCsvMapping: (mapping: CSVMapping) => void;
  supabase: any; // Assuming 'any' type for supabase, adjust if a specific type is available
  session: any; // Assuming 'any' type for session, adjust if a specific type is available
  companyId: string;
  setRestrictionTags: (tags: string[]) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  viewMode,
  templates,
  newTemplate,
  setNewTemplate,
  handleAddTemplate,
  handleRemoveTemplate,
  applyTemplate,
  restrictionTags,
  userRole,
  userProfile,
  csvMapping,
  onUpdateCsvMapping,
  supabase,
  session,
  companyId,
  setRestrictionTags
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  // Local state for CSV mapping editing
  const [editingMapping, setEditingMapping] = useState<CSVMapping>(csvMapping);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when prop changes (if not editing?)
  // Actually, we want to initialize it. If prop updates from DB, we might overwrite changes if we are not careful.
  // But since we are the only editor, it's fine to sync on mount or when prop changes if we haven't touched it.
  // For simplicity, let's just sync when prop changes if !hasUnsavedChanges
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      setEditingMapping(csvMapping);
    }
  }, [csvMapping, hasUnsavedChanges]);

  const handleMappingChange = (field: keyof CSVMapping, value: string) => {
    setEditingMapping(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const toggleGroupingField = (field: string) => {
    setEditingMapping(prev => {
      const current = prev.groupingFields;
      const next = current.includes(field)
        ? current.filter(f => f !== field)
        : [...current, field];
      return { ...prev, groupingFields: next };
    });
    setHasUnsavedChanges(true);
  };

  const saveMapping = async () => {
    try {
      await onUpdateCsvMapping(editingMapping);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save mapping:", error);
    }
  };

  const canManageTemplates = hasRole(userRole, 'manager') || userProfile?.can_edit_templates;
  const canManageTags = hasRole(userRole, 'manager') || userProfile?.can_edit_tags;
  const canManageImportConfig = hasRole(userRole, 'manager') || userProfile?.can_edit_import_config;
  const canManageConfig = canManageTemplates || canManageTags || canManageImportConfig; // Fallback for general UI, but specific actions should check specific flags

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter ? t.restrictions.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Template Creation Form */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
            <Copy size={16} className="text-blue-500" /> {t('config.newTemplate')}
          </h3>
          {canManageTemplates ? (
            <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder={t('config.templateName')}
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 min-w-0"
                />
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase font-bold">{t('config.restrictions')}</span>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
              </div>

              <button
                onClick={handleAddTemplate}
                className="w-full py-2 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium"
              >
                <Plus size={16} className="mr-2" /> {t('config.addTemplate')}
              </button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-400 flex items-center gap-2">
              <Lock size={12} /> {t('config.restrictedAccess')}
            </div>
          )}
        </div>

      </div>
    );
  }

  // LIST VIEW - Templates left, Optimal Range + Tags stacked right
  return (
    <div className="flex gap-4 h-full">
      {/* Product Templates Panel - Takes most space */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Copy className="text-blue-400" size={20} />
            {t('config.productTemplates')}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
              {filteredTemplates.length}
            </span>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder={t('common.search') + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 pl-9 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-8"
              />
            </div>
          </div>
        </div>

        {/* Template Creation Form - For Managers and Admins */}
        {canManageTemplates && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/30">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('config.templateName')}</label>
                <input
                  placeholder="e.g. Standard Product"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">{t('config.restrictions')}</label>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
              </div>

              <button
                onClick={handleAddTemplate}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
              >
                <Plus size={16} /> {t('config.addTemplate')}
              </button>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {t('config.noTemplates')}
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 group hover:border-slate-600 transition-colors">
                <div className="font-semibold text-slate-200 mb-2">{template.name}</div>
                {template.restrictions.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {template.restrictions.map(r => (
                      <span key={r} className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700/50">
                  <button
                    onClick={() => applyTemplate(template)}
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded transition-colors text-center font-medium"
                  >
                    {t('config.useTemplate')}
                  </button>
                  {canManageTemplates && (
                    <button
                      onClick={() => handleRemoveTemplate(template.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>



      {/* CSV Import Configuration */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="text-green-400" size={20} />
            {t('config.csvMapping', 'CSV Import Configuration')}
          </h2>
          {hasUnsavedChanges && (
            <button
              onClick={saveMapping}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              <Save size={14} />
              {t('common.save', 'Save')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!canManageImportConfig && (
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-400 flex items-center gap-2 mb-4">
              <Lock size={12} /> {t('config.restrictedAccessCSV')}
            </div>
          )}

          <div className={`space-y-4 ${!canManageImportConfig ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 gap-4">
              {/* Core Fields */}
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-1">Core Fields (CSV Header Names)</h3>

              {[
                { key: 'country', label: 'Country' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'weight', label: 'Weight (kg)' },
                { key: 'formFactor', label: 'Form Factor (Or Description for partial match)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
                  <input
                    value={(editingMapping as any)[key] || ''}
                    onChange={e => handleMappingChange(key as keyof CSVMapping, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}

              {/* Incoterms Headers */}
              <div className="pt-2 border-t border-slate-700 mt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Incoterms Headers</h4>
                {(editingMapping.incoterms || []).map((header, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex gap-2">
                      <input
                        value={header}
                        onChange={e => {
                          const newIncoterms = [...editingMapping.incoterms];
                          newIncoterms[idx] = e.target.value;
                          setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="CSV Header Name"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newIncoterms = editingMapping.incoterms.filter((_, i) => i !== idx);
                          setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setEditingMapping(prev => ({
                      ...prev,
                      incoterms: [...(prev.incoterms || []), '']
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Incoterms Header
                </button>
              </div>

              {/* Restrictions Headers */}
              <div className="pt-2 border-t border-slate-700 mt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Restriction Headers</h4>
                {(editingMapping.restrictions || []).map((header, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="flex gap-2">
                      <input
                        value={header}
                        onChange={e => {
                          const newRestrictions = [...editingMapping.restrictions];
                          newRestrictions[idx] = e.target.value;
                          setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="CSV Header Name"
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newRestrictions = editingMapping.restrictions.filter((_, i) => i !== idx);
                          setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-red-400 hover:text-red-300 p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setEditingMapping(prev => ({
                      ...prev,
                      restrictions: [...(prev.restrictions || []), '']
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={14} /> Add Restriction Header
                </button>
              </div>

              {/* Custom Fields */}
              <div className="pt-2 border-t border-slate-700 mt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Custom Fields (Company-Specific)</h4>
                <p className="text-[10px] text-slate-500 mb-3">
                  Map additional CSV columns to internal field names. These can be used for grouping or display.
                </p>
                {Object.entries(editingMapping.customFields || {}).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-slate-400">{key}</label>
                      <button
                        onClick={() => {
                          const newCustom = { ...editingMapping.customFields };
                          delete newCustom[key];
                          setEditingMapping(prev => ({ ...prev, customFields: newCustom }));
                          // Also remove from grouping if present
                          if (editingMapping.groupingFields.includes(key)) {
                            toggleGroupingField(key);
                          }
                          setHasUnsavedChanges(true);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <input
                      value={value}
                      onChange={e => {
                        setEditingMapping(prev => ({
                          ...prev,
                          customFields: {
                            ...prev.customFields,
                            [key]: e.target.value
                          }
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="CSV Header Name"
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ))}

                <div className="flex gap-2 mt-2">
                  <input
                    placeholder={t('config.newFieldKey')}
                    id="newCustomFieldInput"
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('newCustomFieldInput') as HTMLInputElement;
                      const key = input.value.trim();
                      if (key && !editingMapping.customFields?.[key] && !['country', 'quantity', 'weight', 'formFactor'].includes(key)) {
                        setEditingMapping(prev => ({
                          ...prev,
                          customFields: {
                            ...prev.customFields,
                            [key]: ''
                          }
                        }));
                        setHasUnsavedChanges(true);
                        input.value = '';
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-2 mb-3">Grouping Fields (Destination Key)</h3>
              <p className="text-[10px] text-slate-500 mb-3">
                Select which fields combine to create unique destinations for container optimization.
              </p>
              <div className="space-y-2">
                {[
                  // Core groupable fields
                  'country', 'incoterms',
                  // Custom fields
                  ...Object.keys(editingMapping.customFields || {})
                ].map(field => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${editingMapping.groupingFields.includes(field)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-600 group-hover:border-slate-500'
                      }`}>
                      {editingMapping.groupingFields.includes(field) && <Check size={10} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editingMapping.groupingFields.includes(field)}
                      onChange={() => toggleGroupingField(field)}
                    />
                    <span className="text-sm text-slate-300 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default ConfigPanel;
