import React, { useState } from 'react';
import { Container, ProductFormFactor, UserProfile } from '../../types';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil, Trash2, X, Container as ContainerIcon, Search, DollarSign, MapPin, ShieldAlert } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { Role, hasRole } from '../../utils/roles';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const canManage = hasRole(userRole, 'manager') || userProfile?.can_edit_containers;

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
      <div className="h-full flex flex-col gap-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium text-sm text-foreground">
            {editingContainerId ? <><Pencil size={16} className="text-primary" /> {t('containers.editing')}</> : <><Plus size={16} className="text-primary" /> {t('containers.addContainer')}</>}
          </span>
          {editingContainerId && (
            <Button variant="ghost" size="sm" onClick={handleCancelContainerEdit} className="h-6 text-xs text-muted-foreground hover:text-foreground">
              <X size={12} className="mr-1" /> {t('common.cancel')}
            </Button>
          )}
        </div>

        <div className="space-y-4 px-4 pb-4 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">{t('containers.namePlaceholder')}</Label>
            <Input
              placeholder={t('containers.namePlaceholder')}
              value={newContainer.name}
              onChange={e => setNewContainer({ ...newContainer, name: e.target.value })}
              className="bg-muted/50 border-input/50 focus:bg-background transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">{t('containers.cost')}</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                className="pl-9 bg-muted/50 border-input/50 focus:bg-background transition-colors"
                value={newContainer.cost}
                onChange={e => setNewContainer({ ...newContainer, cost: parseFloat(e.target.value) || 0 })}
                placeholder={t('containers.costPlaceholder')}
              />
            </div>
          </div>

          <div className="rounded-lg border border-input/50 bg-muted/20 p-4">
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
                      className="h-8 bg-background/50 border-input/50"
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

          <div className="pt-2">
            <Button
              onClick={handleSaveContainer}
              className="w-full font-medium"
              variant={editingContainerId ? "secondary" : "default"}
            >
              {editingContainerId ? <><Save size={16} className="mr-2" /> {t('containers.updateContainer')}</> : <><Plus size={16} className="mr-2" /> {t('containers.addContainer')}</>}
            </Button>
          </div>
        </div>
      </div>
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
                className={`transform transition-all duration-200 hover:shadow-md border bg-card text-card-foreground group relative overflow-hidden ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                  } ${editingContainerId === c.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 z-20">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 hover:border-primary/50 bg-background/50'
                    }`} onClick={() => toggleContainerSelection(c.id)}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-current rounded-sm" />}
                  </div>
                </div>

                <div className="p-4 flex flex-col h-full relative z-10">
                  <div className="mb-3 pr-6">
                    <h3 className="font-semibold text-sm leading-tight text-foreground truncate">{c.name}</h3>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {Object.entries(c.capacities).map(([ffId, cap]) => {
                        const ff = formFactors.find(f => f.id === ffId);
                        if (!ff) return null;
                        return (
                          <div key={ffId} className="contents">
                            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5 bg-secondary/30 text-secondary-foreground border-border/50">
                              {ff.name}: {cap}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-muted-foreground mt-auto">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="shrink-0 opacity-70" />
                      <span className="truncate" title={c.destination || 'N/A'}>{c.destination || <span className="opacity-50">-</span>}</span>
                    </div>
                  </div>

                  {c.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-border/50">
                      {c.restrictions.map((r, i) => (
                        <div key={i} className="contents">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 text-green-600 bg-green-500/10 hover:bg-green-500/20 border-green-500/20">
                            <ShieldAlert size={8} /> {r}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 shadow-sm bg-background border border-border hover:bg-secondary hover:text-secondary-foreground"
                      onClick={(e) => { e.stopPropagation(); handleEditContainer(c) }}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shadow-sm bg-background border border-border text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => { e.stopPropagation(); handleRemoveContainer(c.id) }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContainerPanel;
