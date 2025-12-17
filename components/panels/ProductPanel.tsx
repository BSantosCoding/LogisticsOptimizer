import React, { useState } from 'react';
import { Product, ProductFormFactor, CSVMapping } from '../../types';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil, Trash2, X, Box, Search, MapPin, AlertTriangle, Weight, Upload } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductPanelProps {
  viewMode: 'form' | 'list';
  products: Product[];
  newProduct: Omit<Product, 'id'>;
  setNewProduct: (p: Omit<Product, 'id'>) => void;
  editingProductId: string | null;
  handleSaveProduct: () => void;
  handleEditProduct: (p: Product) => void;
  handleRemoveProduct: (id: string) => void;
  handleCancelProductEdit: () => void;
  restrictionTags: string[];
  selectedProductIds: Set<string>;
  toggleProductSelection: (id: string) => void;
  onImport: (csv: string) => void;
  onClearAll: () => void;
  formFactors: ProductFormFactor[];
  onSelectAll?: () => void;
  allSelected?: boolean;
  csvMapping?: CSVMapping;
}

const ProductPanel: React.FC<ProductPanelProps> = ({
  viewMode,
  products,
  newProduct,
  setNewProduct,
  editingProductId,
  handleSaveProduct,
  handleEditProduct,
  handleRemoveProduct,
  handleCancelProductEdit,
  restrictionTags,
  selectedProductIds,
  toggleProductSelection,
  onImport,
  onClearAll,
  formFactors,
  onSelectAll,
  allSelected,
  csvMapping
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all_tags');
  const [shipmentFilter, setShipmentFilter] = useState<'available' | 'shipped' | 'all'>('available');
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper to manage destination components
  const updateDestinationPart = (index: number, value: string) => {
    const parts = (newProduct.destination || '').split('|');
    // Ensure array has enough slots
    while (parts.length <= index) parts.push('');
    parts[index] = value;
    // Reconstruct, filtering out empty trailing parts if you want, but for index alignment, keep them.
    // However, clean join is important.
    // If we have fixed grouping fields, we should probably maintain that size.
    const expectedLength = csvMapping?.groupingFields.length || 1;
    while (parts.length < expectedLength) parts.push('');

    const newDest = parts.join('|');
    setNewProduct({ ...newProduct, destination: newDest });
  };

  const getDestinationPart = (index: number) => {
    const parts = (newProduct.destination || '').split('|');
    return parts[index] || '';
  };

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

  const filteredProducts = products
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.destination || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTagFilter && selectedTagFilter !== 'all_tags' ? p.restrictions.includes(selectedTagFilter) : true;

      const matchesShipment =
        shipmentFilter === 'all' ? true :
          shipmentFilter === 'shipped' ? (p.status === 'shipped') :
            (p.status !== 'shipped'); // Default 'available'

      const hasMissingFF = !p.formFactorId || !formFactors.find(f => f.id === p.formFactorId);
      const matchesWarnings = showWarningsOnly ? hasMissingFF : true;

      return matchesSearch && matchesTag && matchesShipment && matchesWarnings;
    })
    .sort((a, b) => {
      // Sort products with missing form factors to the top
      const aHasMissingFF = !a.formFactorId || !formFactors.find(f => f.id === a.formFactorId);
      const bHasMissingFF = !b.formFactorId || !formFactors.find(f => f.id === b.formFactorId);

      if (aHasMissingFF && !bHasMissingFF) return -1;
      if (!aHasMissingFF && bHasMissingFF) return 1;
      return 0;
    });

  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium text-sm text-foreground">
            {editingProductId ? <><Pencil size={16} className="text-primary" /> {t('products.editing')}</> : <><Plus size={16} className="text-primary" /> {t('products.addProduct')}</>}
          </span>
          {editingProductId && (
            <Button variant="ghost" size="sm" onClick={handleCancelProductEdit} className="h-6 text-xs text-muted-foreground hover:text-foreground">
              <X size={12} className="mr-1" /> {t('common.cancel')}
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full pr-4 -mr-4">
            <div className="space-y-3 px-4 pb-4">
              {/* Header: Name */}
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('products.namePlaceholder')}</Label>
                <Input
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder={t('products.namePlaceholder')}
                  className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                />
              </div>

              {/* Destination Section */}
              <div className="bg-muted/10 p-3 rounded-lg border border-border/40 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={12} className="text-primary" />
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t('products.destination')}</Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Destination Parts Breakdown */}
                  {csvMapping?.groupingFields.map((field, idx) => {
                    if (field === 'country' || field === csvMapping.country) return null;
                    const label = csvMapping.customFields?.[field] || field;
                    return (
                      <div key={`dest-${idx}`} className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground truncate block" title={label}>{label}</Label>
                        <Input
                          className="h-8 pl-2 bg-background border-input/50 focus:bg-background transition-colors text-sm"
                          value={getDestinationPart(idx)}
                          onChange={e => updateDestinationPart(idx, e.target.value)}
                          placeholder={label}
                        />
                      </div>
                    );
                  })}

                  {/* Fallback Destination if no mapping */}
                  {!csvMapping && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px] text-muted-foreground">{t('products.destination')}</Label>
                      <Input
                        className="h-8 bg-background border-input/50 focus:bg-background transition-colors text-sm"
                        value={newProduct.destination || ''}
                        onChange={e => setNewProduct({ ...newProduct, destination: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Country - Always Visible */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">{t('products.country')}</Label>
                    <Input
                      value={newProduct.country || ''}
                      onChange={e => setNewProduct({ ...newProduct, country: e.target.value })}
                      placeholder="e.g. CN"
                      className="h-8 bg-background border-input/50 focus:bg-background transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Logistics Details */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground truncate block">
                    {csvMapping?.customFields?.['shipToName'] || 'Ship To Name'}
                  </Label>
                  <Input
                    value={newProduct.shipToName || ''}
                    onChange={e => setNewProduct({ ...newProduct, shipToName: e.target.value })}
                    className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground truncate block">
                    {csvMapping?.shippingAvailableBy || 'Available By'}
                  </Label>
                  <Input
                    type="date"
                    value={newProduct.shippingAvailableBy || ''}
                    onChange={e => setNewProduct({ ...newProduct, shippingAvailableBy: e.target.value })}
                    className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                  />
                </div>

                {/* Custom Fields */}
                {csvMapping?.incoterms && csvMapping.incoterms.length > 0 && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-[10px] text-muted-foreground">Incoterms</Label>
                    <Input
                      value={newProduct.extraFields?.['Incoterms'] || ''}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        extraFields: { ...newProduct.extraFields, Incoterms: e.target.value }
                      })}
                      className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                    />
                  </div>
                )}

                {csvMapping && Object.entries(csvMapping.customFields).map(([key, label]) => {
                  if (key === 'shipToName') return null;
                  if (csvMapping.groupingFields.includes(key)) return null;
                  return (
                    <div key={key} className="space-y-1 col-span-2">
                      <Label className="text-[10px] text-muted-foreground truncate block" title={label}>{label}</Label>
                      <Input
                        value={newProduct.extraFields?.[key] || ''}
                        onChange={(e) => setNewProduct({
                          ...newProduct,
                          extraFields: { ...newProduct.extraFields, [key]: e.target.value }
                        })}
                        className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Physical Attributes */}
              <div className="grid grid-cols-12 gap-2 pt-1">
                <div className="col-span-6 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('products.formFactor')}</Label>
                  <Select
                    value={newProduct.formFactorId || ''}
                    onValueChange={(val) => setNewProduct({ ...newProduct, formFactorId: val })}
                  >
                    <SelectTrigger className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-xs">
                      <SelectValue placeholder={t('products.selectFormFactor')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formFactors.map(ff => (
                        <SelectItem key={ff.id} value={ff.id} className="text-xs">{ff.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('common.units')}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      value={newProduct.quantity}
                      onChange={e => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                      className="h-8 pr-6 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-muted-foreground">#</span>
                  </div>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{t('products.weight')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="-"
                    value={newProduct.weight ?? ''}
                    onChange={e => setNewProduct({ ...newProduct, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="h-8 bg-muted/50 border-input/50 focus:bg-background transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Restrictions */}
              <div className="space-y-1 pt-1">
                <Label className="text-[10px] text-muted-foreground">{t('products.restrictions')}</Label>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newProduct.restrictions}
                  onChange={r => setNewProduct({ ...newProduct, restrictions: r })}
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveProduct}
                  className="w-full font-medium h-9"
                  variant={editingProductId ? "secondary" : "default"}
                >
                  {editingProductId ? <><Save size={14} className="mr-2" /> {t('products.updateProduct')}</> : <><Plus size={14} className="mr-2" /> {t('products.addProduct')}</>}
                </Button>
              </div>
            </div>
          </ScrollArea>
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
              <Box size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('products.title')}</h2>
              <p className="text-xs text-muted-foreground">{products.length} {t('products.items')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} className="mr-2" />
              {t('products.importCsv')}
            </Button>
            {products.length > 0 && (
              <Button variant="outline" size="sm" onClick={onClearAll} className="text-destructive hover:text-destructive">
                <Trash2 size={14} className="mr-2" />
                {t('common.clearAll')}
              </Button>
            )}
          </div>
        </div>

        {/* Filters Row */}
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

          <Select value={shipmentFilter} onValueChange={(val: any) => setShipmentFilter(val)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">{t('products.filterAvailable')}</SelectItem>
              <SelectItem value="shipped">{t('products.filterShipped')}</SelectItem>
              <SelectItem value="all">{t('products.filterAll')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder={t('products.allTags')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_tags">{t('products.allTags')}</SelectItem>
              {restrictionTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={showWarningsOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowWarningsOnly(!showWarningsOnly)}
            className="h-9 px-3"
            title="Show only products with warnings"
          >
            <AlertTriangle size={14} className={showWarningsOnly ? "mr-2" : ""} />
            {showWarningsOnly && <span className="hidden sm:inline">{t('common.warnings')}</span>}
          </Button>

          {onSelectAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="h-9 px-3"
            >
              {allSelected ? t('common.deselectAll') : t('common.selectAll')}
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <Box size={48} className="mb-2 opacity-50" />
            <p>{t('products.noProducts')}</p>
            <p className="text-sm">{t('products.useForm')}</p>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center text-muted-foreground mt-10 text-sm">{t('products.noMatches')}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
          {filteredProducts.map(p => {
            const isSelected = selectedProductIds.has(p.id);
            const ff = formFactors.find(f => f.id === p.formFactorId);
            const hasMissingFF = !p.formFactorId || !ff;

            return (
              <Card
                key={p.id}
                className={`transform transition-all duration-200 hover:shadow-md border bg-card text-card-foreground group relative overflow-hidden ${hasMissingFF ? 'border-yellow-500/50 bg-yellow-500/5' :
                  isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/50'
                  } ${editingProductId === p.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => toggleProductSelection(p.id)}
              >
                <div onClick={(e) => e.stopPropagation()} className="absolute top-2 right-2 z-20">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 hover:border-primary/50 bg-background/50'
                    }`} onClick={() => toggleProductSelection(p.id)}>
                    {isSelected && <div className="w-2.5 h-2.5 bg-current rounded-sm" />}
                  </div>
                </div>

                <div className="p-4 flex flex-col h-full relative z-10">
                  <div className="mb-3 pr-6">
                    <div className="flex items-center gap-2 mb-1.5">
                      {p.formFactorId ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-secondary text-secondary-foreground border-border/50">
                          {formFactors.find(f => f.id === p.formFactorId)?.name || 'Unknown'}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-normal">
                          <AlertTriangle size={8} className="mr-1" /> {t('products.noFormFactor')}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight text-foreground truncate" title={p.name}>{p.name}</h3>
                  </div>

                  <div className="space-y-1.5 mt-auto">
                    {/* Destination & Country */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin size={12} className="shrink-0 opacity-70" />
                      <span className="truncate" title={p.destination || 'N/A'}>
                        {p.destination ? p.destination.split('|')[0] : <span className="opacity-50">-</span>}
                      </span>
                      {p.country && <span className="opacity-50 text-[10px] ml-auto">({p.country})</span>}
                    </div>

                    {/* Ship To Name (if present) */}
                    {p.shipToName && (
                      <div className="text-[10px] text-muted-foreground pl-4 truncate" title={p.shipToName}>
                        {p.shipToName}
                      </div>
                    )}

                    {/* Stats Row 1: Qty & Weight */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <Box size={12} className="shrink-0 opacity-70" />
                        <span>{p.quantity} {t('common.units')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Weight size={12} className="shrink-0 opacity-70" />
                        <span>{p.weight || '-'} kg</span>
                      </div>
                    </div>

                    {/* Stats Row 2: Date & Custom Fields */}
                    {p.shippingAvailableBy && (
                      <div className="text-[10px] text-muted-foreground pl-4 flex items-center gap-1">
                        <span className="opacity-50">Avail:</span> {p.shippingAvailableBy}
                      </div>
                    )}

                    {/* Extra Fields */}
                    {csvMapping?.displayFields?.map(fieldKey => {
                      let val: any;
                      if (Object.prototype.hasOwnProperty.call(p, fieldKey)) {
                        val = (p as any)[fieldKey];
                      } else {
                        val = p.extraFields?.[fieldKey];
                      }
                      if (val === undefined || val === null || val === '') return null;
                      const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);

                      return (
                        <div key={fieldKey} className="text-[10px] text-muted-foreground pl-4 truncate" title={`${fieldKey}: ${displayVal}`}>
                          <span className="opacity-50 capitalize">{fieldKey}:</span> {displayVal}
                        </div>
                      );
                    })}
                  </div>

                  {p.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-3 pt-3 border-t border-border/50">
                      {p.restrictions.map((r, i) => (
                        <div key={i} className="contents">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-secondary text-secondary-foreground">
                            {r}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Actions overlay - always visible */}
                <div className="absolute right-2 bottom-2 flex gap-2 z-20">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shadow-sm bg-background border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => { e.stopPropagation(); handleEditProduct(p) }}
                    title={t('common.edit')}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shadow-sm bg-background border border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id) }}
                    title={t('common.delete')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductPanel;
