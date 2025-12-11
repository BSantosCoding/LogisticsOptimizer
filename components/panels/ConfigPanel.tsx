
import React, { useState } from 'react';
import { Product, UserProfile, CSVMapping } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Copy, Plus, Trash2, Lock, Search, Settings, Save, Check, Filter } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

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
  supabase: any;
  session: any;
  companyId: string;
  setRestrictionTags: (tags: string[]) => void;
  allowUnitSplitting: boolean;
  setAllowUnitSplitting: (v: boolean) => void;
  shippingDateGroupingRange: number | undefined;
  setShippingDateGroupingRange: (v: number | undefined) => void;
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
  setRestrictionTags,
  allowUnitSplitting,
  setAllowUnitSplitting,
  shippingDateGroupingRange,
  setShippingDateGroupingRange
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  // Local state for CSV mapping editing
  const [editingMapping, setEditingMapping] = useState<CSVMapping>(csvMapping);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when prop changes (if not editing?)
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
  const canManageImportConfig = hasRole(userRole, 'manager') || userProfile?.can_edit_import_config;

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter ? t.restrictions.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
              <Copy size={16} className="text-primary" /> {t('config.newTemplate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {canManageTemplates ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('config.templateName')}
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>

                <div>
                  <span className="text-xs text-muted-foreground uppercase font-bold">{t('config.restrictions')}</span>
                  <RestrictionSelector
                    availableOptions={restrictionTags}
                    selected={newTemplate.restrictions || []}
                    onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                  />
                </div>

                <Button onClick={handleAddTemplate} className="w-full">
                  <Plus size={16} className="mr-2" /> {t('config.addTemplate')}
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-muted border rounded text-xs text-muted-foreground flex items-center gap-2">
                <Lock size={12} /> {t('config.restrictedAccess')}
              </div>
            )}
          </CardContent>
        </Card>
        <button
          onClick={handleAddTemplate}
          className="w-full py-2 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium"
        >
          <Plus size={16} className="mr-2" /> {t('config.addTemplate')}
        </button>
      </div >
    );
  }

  // LIST VIEW
  return (
    <div className="flex gap-4 h-full">
      {/* Left Panel: Templates + Optimization Settings */}
      <div className="w-96 flex-none flex flex-col gap-4 overflow-y-auto pr-1">

        {/* Product Templates Section */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Copy className="text-blue-400" size={20} />
              {t('config.productTemplates')}
            </h2>
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
              {filteredTemplates.length}
            </span>
          </div>

          <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
          </div>

          {/* Template Creation Form */}
          {canManageTemplates && (
            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
              <div className="space-y-3">
                <div>
                  <input
                    placeholder="New Template Name"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
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
          <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
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

        {/* Optimization Settings (Merged here) */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shrink-0">
          <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
            <Settings size={16} className="text-purple-400" /> Optimization
          </h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${allowUnitSplitting ? 'bg-blue-600 border-blue-600' : 'border-slate-500 bg-slate-800'}`}>
                {allowUnitSplitting && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1">
                <span className="block text-sm font-medium text-slate-200">Split Product Units</span>
                <span className="block text-xs text-slate-500 mt-1">Allow products to be split across multiple containers if needed.</span>
              </div>
              <input type="checkbox" className="hidden" checked={allowUnitSplitting} onChange={(e) => setAllowUnitSplitting(e.target.checked)} />
            </label>
          </div>
        </div>

        {/* Grouping Settings (Merged here) */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 shrink-0">
          <h3 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2">
            <Filter size={16} className="text-yellow-400" /> Grouping
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="block text-xs font-medium text-slate-400 mb-2">Shipping Available Date Grouping</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Don't group by date"
                  value={shippingDateGroupingRange === undefined ? '' : shippingDateGroupingRange}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShippingDateGroupingRange(val === '' ? undefined : parseInt(val));
                  }}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-sm text-slate-500">Days</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Products with dates more than X days apart will be grouped separately. Leave empty to ignore dates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: CSV Import Configuration (Flex-1) */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="text-green-400" size={20} />
            {t('config.csvMapping', 'CSV Import Configuration')}
          </h2>
          {hasUnsavedChanges && (
            <Button onClick={saveMapping} size="sm" className="h-7 bg-green-600 hover:bg-green-500 text-white">
              <Save size={14} className="mr-1" />
              {t('common.save', 'Save')}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!canManageImportConfig && (
            <div className="p-3 bg-muted border rounded text-xs text-muted-foreground flex items-center gap-2 mb-4">
              <Lock size={12} /> {t('config.restrictedAccessCSV')}
            </div>
          )}

          <div className={`space-y-4 ${!canManageImportConfig ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 gap-4">
              {/* Core Fields */}
              <h3 className="text-xs font-bold text-muted-foreground uppercase border-b pb-1">Core Fields (CSV Header Names)</h3>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'country', label: 'Country' },
                  { key: 'quantity', label: 'Quantity' },
                  { key: 'weight', label: t('products.weight') },
                  { key: 'formFactor', label: t('config.formFactorLabel') },
                  // New Field
                  { key: 'shippingAvailableBy', label: 'Shipping Available By (Date)' }
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

              {/* Incoterms Headers */}
              <div className="pt-2 border-t mt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Incoterms Headers</h4>
                {(editingMapping.incoterms || []).map((header, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <Input
                      value={header}
                      onChange={e => {
                        const newIncoterms = [...editingMapping.incoterms];
                        newIncoterms[idx] = e.target.value;
                        setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="CSV Header Name"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        const newIncoterms = editingMapping.incoterms.filter((_, i) => i !== idx);
                        setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                        setHasUnsavedChanges(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    setEditingMapping(prev => ({
                      ...prev,
                      incoterms: [...(prev.incoterms || []), '']
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus size={14} className="mr-1" /> Add Incoterms Header
                </Button>
              </div>

              {/* Restrictions Headers */}
              <div className="pt-2 border-t mt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Restriction Headers</h4>
                {(editingMapping.restrictions || []).map((header, idx) => (
                  <div key={idx} className="mb-2 flex gap-2">
                    <Input
                      value={header}
                      onChange={e => {
                        const newRestrictions = [...editingMapping.restrictions];
                        newRestrictions[idx] = e.target.value;
                        setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="CSV Header Name"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        const newRestrictions = editingMapping.restrictions.filter((_, i) => i !== idx);
                        setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                        setHasUnsavedChanges(true);
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={() => {
                    setEditingMapping(prev => ({
                      ...prev,
                      restrictions: [...(prev.restrictions || []), '']
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus size={14} className="mr-1" /> Add Restriction Header
                </Button>
              </div>

              {/* Custom Fields */}
              <div className="pt-2 border-t mt-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Custom Fields (Company-Specific)</h4>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Map additional CSV columns to internal field names. These can be used for grouping or display.
                </p>
                {Object.entries(editingMapping.customFields || {}).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs text-muted-foreground">{key}</Label>
                      <Button
                        onClick={() => {
                          const newCustom = { ...editingMapping.customFields };
                          delete newCustom[key];
                          setEditingMapping(prev => ({ ...prev, customFields: newCustom }));
                          if (editingMapping.groupingFields.includes(key)) {
                            toggleGroupingField(key);
                          }
                          setHasUnsavedChanges(true);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                    <Input
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
                    />
                  </div>
                ))}

                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder={t('config.newFieldKey')}
                    id="newCustomFieldInput"
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById('newCustomFieldInput') as HTMLInputElement;
                      const key = input.value.trim();
                      if (key && !editingMapping.customFields?.[key] && !['country', 'quantity', 'weight', 'formFactor', 'shippingAvailableBy'].includes(key)) {
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
                    size="sm"
                    className="h-8"
                  >
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase border-b pb-2 mb-3">Grouping Fields (Destination Key)</h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                Select which fields combine to create unique destinations for container optimization.
              </p>
              <div className="space-y-2">
                {[
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

            <div className="pt-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-700 pb-2 mb-3">Product Display Fields</h3>
              <p className="text-[10px] text-slate-500 mb-3">
                Select which extra fields should be shown on the Product cards and Results.
              </p>
              <div className="space-y-2">
                {[
                  // Custom fields only for display? Or allow core too? Usually custom.
                  ...Object.keys(editingMapping.customFields || {})
                ].map(field => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${editingMapping.displayFields?.includes(field)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-600 group-hover:border-slate-500'
                      }`}>
                      {editingMapping.displayFields?.includes(field) && <Check size={10} className="text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={editingMapping.displayFields?.includes(field) || false}
                      onChange={() => {
                        setEditingMapping(prev => {
                          const current = prev.displayFields || [];
                          const next = current.includes(field)
                            ? current.filter(f => f !== field)
                            : [...current, field];
                          return { ...prev, displayFields: next };
                        });
                        setHasUnsavedChanges(true);
                      }}
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
