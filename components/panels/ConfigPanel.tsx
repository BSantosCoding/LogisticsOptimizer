
import React, { useState } from 'react';
import { Product, UserProfile, CSVMapping } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Copy, Plus, Trash2, Lock, Search, Settings, Save } from 'lucide-react';
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
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  // Local state for CSV mapping editing
  const [editingMapping, setEditingMapping] = useState<CSVMapping>(csvMapping);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="flex gap-4 h-full">
      {/* Product Templates Panel */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border">
        <CardHeader className="py-4 px-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Copy className="text-primary" size={20} />
            {t('config.productTemplates')}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-xs">
              {filteredTemplates.length}
            </Badge>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                type="text"
                placeholder={t('common.search') + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        {/* Template Creation Form */}
        {canManageTemplates && (
          <div className="p-4 border-b bg-muted/10 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t('config.templateName')}</Label>
              <Input
                placeholder="e.g. Standard Product"
                value={newTemplate.name}
                onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t('config.restrictions')}</Label>
              <RestrictionSelector
                availableOptions={restrictionTags}
                selected={newTemplate.restrictions || []}
                onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
              />
            </div>
            <Button onClick={handleAddTemplate} className="w-full h-9">
              <Plus size={16} className="mr-2" /> {t('config.addTemplate')}
            </Button>
          </div>
        )}

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('config.noTemplates')}
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className="bg-card border rounded-lg p-3 group hover:border-primary/50 transition-colors">
                <div className="font-semibold mb-2">{template.name}</div>
                {template.restrictions.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {template.restrictions.map(r => (
                      // @ts-ignore
                      <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-2 pt-3 border-t">
                  <Button
                    onClick={() => applyTemplate(template)}
                    size="sm"
                    className="flex-1 h-7 text-xs"
                  >
                    {t('config.useTemplate')}
                  </Button>
                  {canManageTemplates && (
                    <Button
                      onClick={() => handleRemoveTemplate(template.id)}
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* CSV Import Configuration */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border min-h-[400px]">
        <CardHeader className="py-4 px-4 border-b bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings className="text-green-500" size={20} />
            {t('config.csvMapping', 'CSV Import Configuration')}
          </CardTitle>
          {hasUnsavedChanges && (
            <Button onClick={saveMapping} size="sm" className="h-7 bg-green-600 hover:bg-green-500 text-white">
              <Save size={14} className="mr-1" />
              {t('common.save', 'Save')}
            </Button>
          )}
        </CardHeader>

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

              {[
                { key: 'country', label: 'Country' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'weight', label: t('products.weight') },
                { key: 'formFactor', label: t('config.formFactorLabel') },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                  <Input
                    value={(editingMapping as any)[key] || ''}
                    onChange={e => handleMappingChange(key as keyof CSVMapping, e.target.value)}
                  />
                </div>
              ))}

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
                  ...Object.keys(editingMapping.customFields || {})
                ].map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${field}`}
                      checked={editingMapping.groupingFields.includes(field)}
                      onCheckedChange={() => toggleGroupingField(field)}
                    />
                    <label
                      htmlFor={`group-${field}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                    >
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfigPanel;
