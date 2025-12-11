import React, { useState, useRef } from 'react';
import { Container, ProductFormFactor, UserProfile } from '../../types';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil, Trash2, X, Container as ContainerIcon, Search, Filter, DollarSign, AlertTriangle, MapPin, ShieldAlert, Upload } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { Role, hasRole } from '../../utils/roles';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ContainerPanelProps {
  viewMode: 'form' | 'list';
  containers: Container[];
  newContainer: Omit<Container, 'id'>;
  setNewContainer: (c: Omit<Container, 'id'>) => void;
  editingContainerId: string | null;
  handleSaveContainer: () => void;
  handleEditContainer: (c: Container) => void;
  handleRemoveContainer: (id: string) => void;
  handleCancelContainerEdit: () => void;
  restrictionTags: string[];
  selectedContainerIds: Set<string>;
  toggleContainerSelection: (id: string) => void;
  onImport: (csv: string) => void;
  onClearAll: () => void;
  formFactors: ProductFormFactor[];
  userRole: Role | null;
  userProfile: UserProfile | null;
}

const ContainerPanel: React.FC<ContainerPanelProps> = ({
  viewMode,
  containers,
  newContainer,
  setNewContainer,
  editingContainerId,
  handleSaveContainer,
  handleEditContainer,
  handleRemoveContainer,
  handleCancelContainerEdit,
  restrictionTags,
  selectedContainerIds,
  toggleContainerSelection,
  onImport,
  onClearAll,
  formFactors,
  userRole,
  userProfile
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all_caps');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = hasRole(userRole, 'manager') || userProfile?.can_edit_containers;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) onImport(content);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  const filteredContainers = containers.filter(c => {
    const textMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const tagMatch = selectedTagFilter && selectedTagFilter !== 'all_caps' ? c.restrictions.includes(selectedTagFilter) : true;
    return textMatch && tagMatch;
  });

  const handleCapacityChange = (ffId: string, val: string) => {
    const num = parseInt(val) || 0;
    setNewContainer({
      ...newContainer,
      capacities: {
        ...newContainer.capacities,
        [ffId]: num
      }
    });
  };

  if (viewMode === 'form') {
    // Only show form to managers and above
    if (!canManage) {
      return null;
    }

    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-4 py-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              {editingContainerId ? <><Pencil size={16} className="text-primary" /> {t('containers.editing')}</> : <><Plus size={16} className="text-primary" /> {t('containers.addContainer')}</>}
            </span>
            {editingContainerId && (
              <Button variant="ghost" size="sm" onClick={handleCancelContainerEdit} className="h-6 text-xs">
                <X size={12} className="mr-1" /> {t('common.cancel')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder={t('containers.namePlaceholder')}
            value={newContainer.name}
            onChange={e => setNewContainer({ ...newContainer, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('containers.destination')}</Label>
              <div className="relative">
                <ContainerIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={newContainer.destination}
                  onChange={e => setNewContainer({ ...newContainer, destination: e.target.value })}
                  placeholder={t('containers.destinationPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('containers.cost')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  className="pl-9"
                  value={newContainer.cost}
                  onChange={e => setNewContainer({ ...newContainer, cost: parseFloat(e.target.value) || 0 })}
                  placeholder={t('containers.costPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <Label className="text-xs uppercase text-muted-foreground font-bold mb-3 block">{t('containers.capacities')}</Label>
            {formFactors.length === 0 ? (
              <div className="text-xs text-destructive">{t('containers.noFormFactors')}</div>
            ) : (
              <div className="space-y-3">
                {formFactors.map(ff => (
                  <div key={ff.id} className="flex items-center gap-3">
                    <Label className="w-24 text-xs font-medium truncate" title={ff.name}>{ff.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newContainer.capacities[ff.id] || 0}
                      onChange={e => handleCapacityChange(ff.id, e.target.value)}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">{t('containers.capabilities')}</Label>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newContainer.restrictions}
              onChange={r => setNewContainer({ ...newContainer, restrictions: r })}
            />
          </div>

          <Button
            onClick={handleSaveContainer}
            className="w-full"
            variant={editingContainerId ? "default" : "secondary"}
          >
            {editingContainerId ? <><Save size={16} className="mr-2" /> {t('containers.updateContainer')}</> : <><Plus size={16} className="mr-2" /> {t('containers.addContainer')}</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-4 z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ContainerIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('containers.logisticsContainers')}</h2>
              <p className="text-xs text-muted-foreground">{filteredContainers.length} {t('common.units')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} className="mr-2" />
                  {t('products.importCsv')}
                </Button>
                {containers.length > 0 && (
                  <Button variant="outline" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} className="mr-2" />
                    {t('common.clearAll')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="w-[180px] hidden sm:block">
            <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t('common.allCaps')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_caps">{t('common.allCaps')}</SelectItem>
                {restrictionTags.map(tag => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {containers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <ContainerIcon size={48} className="mb-2 opacity-50" />
            <p>{t('containers.noContainers')}</p>
            <p className="text-sm">{t('products.useForm')}</p>
          </div>
        )}

        {containers.length > 0 && filteredContainers.length === 0 && <div className="text-center text-muted-foreground mt-10 text-sm">{t('products.noMatches')}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {filteredContainers.map(c => {
            const isSelected = selectedContainerIds.has(c.id);
            return (
              <Card
                key={c.id}
                onClick={() => toggleContainerSelection(c.id)}
                className={`group cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  } ${editingContainerId === c.id ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{c.name}</h3>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(c.capacities).map(([ffId, cap]) => {
                          const ff = formFactors.find(f => f.id === ffId);
                          if (!ff) return null;
                          return (
                            <div key={ffId} className="contents">
                              <Badge variant="outline" className="text-[10px] font-normal bg-secondary/50 text-secondary-foreground">
                                {ff.name}: {cap}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'}`}>
                      {isSelected && <div className="w-2 h-2 bg-current rounded-sm" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      {c.destination || 'No Destination'}
                    </div>
                  </div>

                  {c.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3">
                      {c.restrictions.map((r, i) => (
                        <div key={i} className="contents">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 text-green-600 bg-green-500/10 hover:bg-green-500/20 border-green-500/20">
                            <ShieldAlert size={8} /> {r}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {canManage && (
                    <div className="absolute bottom-2 right-2 hidden group-hover:flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleEditContainer(c) }}
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleRemoveContainer(c.id) }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContainerPanel;
