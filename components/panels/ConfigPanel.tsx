
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
  newTag: string;
  setNewTag: (s: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (t: string) => void;
  DEFAULT_RESTRICTIONS: string[];
  userRole: Role | null;
  userProfile: UserProfile | null;
  csvMapping: CSVMapping;
  onUpdateCsvMapping: (mapping: CSVMapping) => void;
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
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  DEFAULT_RESTRICTIONS,
  userRole,
  userProfile,
  csvMapping,
  onUpdateCsvMapping
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

  const saveMapping = () => {
    onUpdateCsvMapping(editingMapping);
    setHasUnsavedChanges(false);
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

        {/* Add Tag Form */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-purple-500" /> {t('config.newTag')}
          </h3>
          {canManageTags ? (
            <div className="flex gap-2 items-center">
              <input
                placeholder={t('config.tagName')}
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 text-sm focus:border-blue-500 outline-none text-slate-200 h-9"
              />
              <button
                onClick={handleAddTag}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 h-9 rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus size={16} /> {t('common.add')}
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-2">
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

      {/* Right Column - Optimal Range + Tags stacked */}
      <div className="w-80 flex flex-col gap-4">
        {/* Restriction Tags Panel */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="text-purple-400" size={20} />
              {t('config.restrictionTags')}
            </h2>
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
              {restrictionTags.length}
            </span>
          </div>

          {/* Tag Creation Form - For Managers and Admins */}
          {canManageTags && (
            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{t('config.tagName')}</label>
                  <input
                    placeholder="e.g. Fragile"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={handleAddTag}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                >
                  <Plus size={16} /> {t('config.addTag')}
                </button>
              </div>
            </div>
          )}

          {/* Tags List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {restrictionTags.map(tag => (
              <div key={tag} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 group hover:border-purple-500/50 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-slate-200">{tag}</span>
                  {!DEFAULT_RESTRICTIONS.includes(tag) && canManageTags && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSV Import Configuration */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col mt-4 min-h-[400px]">
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
              <Lock size={12} /> {t('config.restrictedAccess')}
            </div>
          )}

          <div className={`space-y-4 ${!canManageImportConfig ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-1">Field Mapping (CSV Header Names)</h3>

              {[
                { key: 'customerNum', label: 'Customer Number' },
                { key: 'country', label: 'Country' },
                { key: 'shipToName', label: 'Ship To Name' },
                { key: 'incoterms', label: 'Incoterms' },
                { key: 'incoterms2', label: 'Incoterms 2' },
                { key: 'salesOrg', label: 'Sales Org' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'description', label: 'Description' },
                { key: 'tempControl', label: 'Temp Control' },
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
            </div>

            <div className="pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-2 mb-3">Grouping Fields (Destination Key)</h3>
              <div className="space-y-2">
                {[
                  'customerNum', 'country', 'shipToName', 'incoterms', 'incoterms2', 'salesOrg', 'tempControl'
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
              <p className="text-[10px] text-slate-500 mt-2">
                Selected fields will be combined to create unique destinations for container optimization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
