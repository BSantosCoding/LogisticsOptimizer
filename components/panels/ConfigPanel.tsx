import React, { useState } from 'react';
import { Product, UserProfile, CSVMapping } from '../../types';
import { Role, hasRole } from '../../utils/roles';
import { Copy, Plus, Trash2, Lock, Search, Settings, Save, Filter } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  _setRestrictionTags,
  allowUnitSplitting,
  setAllowUnitSplitting,
  shippingDateGroupingRange,
  setShippingDateGroupingRange
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [_selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  // Local state for CSV mapping editing
  const [editingMapping, setEditingMapping] = useState<CSVMapping>(csvMapping);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when prop changes
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
    const matchesTag = _selectedTagFilter ? t.restrictions.includes(_selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium text-sm text-foreground">
            <Copy size={16} className="text-primary" /> {t('config.newTemplate')}
          </span>
        </div>

        <div className="space-y-4 px-4">
          {canManageTemplates ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">{t('config.templateName')}</Label>
                <Input
                  placeholder={t('config.templateName')}
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="bg-muted/50 border-input/50 focus:bg-background transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium">{t('config.restrictions')}</Label>
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
            <div className="p-3 bg-muted/50 border border-border rounded text-xs text-muted-foreground flex items-center gap-2">
              <Lock size={12} /> {t('config.restrictedAccess')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="flex gap-4 h-full">
      {/* Left Panel: Templates + Optimization Settings */}
      <div className="w-96 flex-none flex flex-col gap-4">

        {/* Product Templates Section */}
        <Card className="flex flex-col flex-1 min-h-0">
          <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Copy className="text-primary" size={16} />
                {t('config.productTemplates')}
              </CardTitle>
              <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                {filteredTemplates.length}
              </div>
            </div>
          </CardHeader>

          <div className="p-3 border-b border-border bg-muted/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 bg-background border-input/50 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {canManageTemplates && (
            <div className="p-3 border-b border-border bg-muted/5">
              <div className="space-y-3">
                <Input
                  placeholder="New Template Name"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="h-8 bg-background border-input/50"
                />
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
                <Button
                  onClick={handleAddTemplate}
                  size="sm"
                  className="w-full h-8"
                >
                  <Plus size={14} className="mr-1" /> {t('config.addTemplate')}
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('config.noTemplates')}
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <div key={template.id} className="bg-muted/30 border border-border/50 rounded-lg p-3 group hover:border-primary/30 hover:bg-muted/50 transition-all">
                    <div className="font-medium text-sm mb-2">{template.name}</div>
                    {template.restrictions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {template.restrictions.map(r => (
                          <div key={r} className="contents">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-secondary/30">
                              {r}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                      <Button
                        onClick={() => applyTemplate(template)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                      >
                        {t('config.useTemplate')}
                      </Button>
                      {canManageTemplates && (
                        <Button
                          onClick={() => handleRemoveTemplate(template.id)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Optimization Settings */}
        <Card>
          <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="text-primary" size={16} /> {t('config.optimization')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
              <Checkbox
                id="split-units"
                checked={allowUnitSplitting}
                onCheckedChange={(c) => setAllowUnitSplitting(c === true)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="split-units"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('config.splitProductUnits')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('config.splitProductUnitsDesc')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grouping Settings */}
        <Card>
          <CardHeader className="p-4 py-3 border-b border-border bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="text-primary" size={16} /> {t('config.grouping')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
              <Label className="text-xs text-muted-foreground font-medium">{t('config.shippingDateGrouping')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Ignore dates"
                  value={shippingDateGroupingRange === undefined ? '' : shippingDateGroupingRange}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShippingDateGroupingRange(val === '' ? undefined : parseInt(val));
                  }}
                  className="flex-1 h-8 bg-background"
                />
                <span className="text-xs text-muted-foreground font-medium">{t('config.days')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('config.shippingDateGroupingDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: CSV Import Configuration */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="p-4 py-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="text-primary" size={16} />
            {t('config.csvMapping', 'CSV Import Configuration')}
          </CardTitle>
          {hasUnsavedChanges && (
            <Button onClick={saveMapping} size="sm" className="h-7 bg-green-600 hover:bg-green-500 text-white shadow-sm">
              <Save size={14} className="mr-1" />
              {t('common.save', 'Save')}
            </Button>
          )}
        </CardHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {!canManageImportConfig && (
              <div className="p-3 bg-muted/50 border border-border rounded text-xs text-muted-foreground flex items-center gap-2">
                <Lock size={12} /> {t('config.restrictedAccessCSV')}
              </div>
            )}

            <div className={`space-y-6 ${!canManageImportConfig ? 'opacity-50 pointer-events-none' : ''}`}>

              {/* Core Fields */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 mb-4">Core Fields (CSV Header Names)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'country', label: 'Country' },
                    { key: 'quantity', label: 'Quantity' },
                    { key: 'weight', label: t('products.weight') },
                    { key: 'formFactor', label: t('config.formFactorLabel') },
                    { key: 'shippingAvailableBy', label: 'Shipping Available By (Date)' },
                    { key: 'currentContainer', label: 'Current Container' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
                      <Input
                        value={(editingMapping as any)[key] || ''}
                        onChange={e => handleMappingChange(key as keyof CSVMapping, e.target.value)}
                        className="bg-muted/30 border-input/50 h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Incoterms Headers */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 mb-4">Incoterms Headers</h4>
                <div className="space-y-2">
                  {(editingMapping.incoterms || []).map((header, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={header}
                        onChange={e => {
                          const newIncoterms = [...editingMapping.incoterms];
                          newIncoterms[idx] = e.target.value;
                          setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="CSV Header Name"
                        className="flex-1 bg-muted/30 border-input/50 h-8"
                      />
                      <Button
                        onClick={() => {
                          const newIncoterms = editingMapping.incoterms.filter((_, i) => i !== idx);
                          setEditingMapping(prev => ({ ...prev, incoterms: newIncoterms }));
                          setHasUnsavedChanges(true);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
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
                    className="w-full h-8 border-dashed text-muted-foreground"
                  >
                    <Plus size={14} className="mr-1" /> Add Incoterms Header
                  </Button>
                </div>
              </div>

              {/* Restrictions Headers */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 mb-4">Restriction Headers</h4>
                <div className="space-y-2">
                  {(editingMapping.restrictions || []).map((header, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={header}
                        onChange={e => {
                          const newRestrictions = [...editingMapping.restrictions];
                          newRestrictions[idx] = e.target.value;
                          setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="CSV Header Name"
                        className="flex-1 bg-muted/30 border-input/50 h-8"
                      />
                      <Button
                        onClick={() => {
                          const newRestrictions = editingMapping.restrictions.filter((_, i) => i !== idx);
                          setEditingMapping(prev => ({ ...prev, restrictions: newRestrictions }));
                          setHasUnsavedChanges(true);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
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
                    className="w-full h-8 border-dashed text-muted-foreground"
                  >
                    <Plus size={14} className="mr-1" /> Add Restriction Header
                  </Button>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center gap-2 border-b border-border pb-2 mb-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Custom Fields</h4>
                  <div className="text-[10px] text-muted-foreground bg-muted px-1.5 rounded border border-border">Company-Specific</div>
                </div>

                <div className="space-y-4">
                  {Object.entries(editingMapping.customFields || {}).map(([key, value]) => (
                    <div key={key} className="p-3 bg-muted/20 border border-border/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-xs font-semibold">{key}</Label>
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
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
                        className="bg-background border-input/50 h-8 text-xs"
                        placeholder="CSV Header Name"
                      />
                    </div>
                  ))}

                  <div className="flex gap-2">
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

              {/* Grouping Fields Selection */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 mb-4">{t('config.groupingFields')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'country', 'incoterms',
                    ...Object.keys(editingMapping.customFields || {})
                  ].map(field => (
                    <div key={field} className="flex items-center space-x-2 p-2 rounded-md border border-transparent hover:bg-muted/50 hover:border-border/50 transition-colors">
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

              {/* Product Display Fields Selection */}
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 mb-4">{t('config.productDisplayFields')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'country', 'quantity', 'weight', 'shippingAvailableBy',
                    ...Object.keys(editingMapping.customFields || {})
                  ].map(field => (
                    <div key={field} className="flex items-center space-x-2 p-2 rounded-md border border-transparent hover:bg-muted/50 hover:border-border/50 transition-colors">
                      <Checkbox
                        id={`display-${field}`}
                        checked={editingMapping.displayFields?.includes(field) || false}
                        onCheckedChange={() => {
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
                      <label
                        htmlFor={`display-${field}`}
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
        </ScrollArea>
      </Card>
    </div>
  );
};

export default ConfigPanel;
