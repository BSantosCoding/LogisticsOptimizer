import React, { useState } from 'react';
import { Product, ProductFormFactor, CSVMapping } from '../../types';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil, Trash2, X, Box, Search, Filter, MapPin, ChevronDown, Hash, AlertTriangle, Weight, Upload } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-4 py-3 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              {editingProductId ? <><Pencil size={16} className="text-primary" /> {t('products.editing')}</> : <><Plus size={16} className="text-primary" /> {t('products.addProduct')}</>}
            </span>
            {editingProductId && (
              <Button variant="ghost" size="sm" onClick={handleCancelProductEdit} className="h-6 text-xs">
                <X size={12} className="mr-1" /> {t('common.cancel')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>{t('products.namePlaceholder')}</Label>
            <Input
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder={t('products.namePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('products.destination')}</Label>
              <div className="relative">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  value={newProduct.destination || ''}
                  onChange={e => setNewProduct({ ...newProduct, destination: e.target.value })}
                  placeholder={t('products.destination')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('products.country')}</Label>
              <Input
                value={newProduct.country || ''}
                onChange={e => setNewProduct({ ...newProduct, country: e.target.value })}
                placeholder="e.g. CN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('products.formFactor')}</Label>
              <Select
                value={newProduct.formFactorId || ''}
                onValueChange={(val) => setNewProduct({ ...newProduct, formFactorId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('products.selectFormFactor')} />
                </SelectTrigger>
                <SelectContent>
                  {formFactors.map(ff => (
                    <SelectItem key={ff.id} value={ff.id}>{ff.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.units')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  value={newProduct.quantity}
                  onChange={e => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">#</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('products.weight')} (kg)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="0.1"
                placeholder="-"
                value={newProduct.weight ?? ''}
                onChange={e => setNewProduct({ ...newProduct, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="pr-8"
              />
              <Weight className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('products.restrictions')}</Label>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newProduct.restrictions}
              onChange={r => setNewProduct({ ...newProduct, restrictions: r })}
            />
          </div>

          <Button
            onClick={handleSaveProduct}
            className="w-full"
            variant={editingProductId ? "default" : "secondary"}
          >
            {editingProductId ? <><Save size={16} className="mr-2" /> {t('products.updateProduct')}</> : <><Plus size={16} className="mr-2" /> {t('products.addProduct')}</>}
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
                onClick={() => toggleProductSelection(p.id)}
                className={`group cursor-pointer transition-all hover:shadow-md ${hasMissingFF ? 'border-yellow-500/50 bg-yellow-500/5' :
                  isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  } ${editingProductId === p.id ? 'ring-2 ring-primary' : ''}`}
              >
                <CardContent className="p-4">
                  {hasMissingFF && (
                    <Badge variant="outline" className="mb-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20">
                      <AlertTriangle size={10} className="mr-1" />
                      {t('products.noFormFactor')}
                    </Badge>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground truncate pr-6">{p.name}</h3>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'}`}>
                      {isSelected && <div className="w-2 h-2 bg-current rounded-sm" />}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} />
                      {p.destination || 'No Destination'}
                      {p.country && <span className="text-muted-foreground/75">({p.country})</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Box size={12} />
                      {ff?.name || <span className="text-yellow-600 font-medium">{t('products.unknown')}</span>}
                    </div>
                  </div>

                  <Separator className="my-2" />

                  <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground mb-3">
                    <div><span className="font-medium text-foreground">{t('products.quantity')}:</span> {p.quantity}</div>
                    {p.weight && <div><span className="font-medium text-foreground">{t('products.weight')}:</span> {p.weight} kg</div>}
                    {p.shippingAvailableBy && <div className="col-span-2"><span className="font-medium text-foreground">Avail:</span> {p.shippingAvailableBy}</div>}
                    {csvMapping?.displayFields?.map(fieldKey => {
                      const val = p.extraFields?.[fieldKey];
                      if (!val) return null;
                      return (
                        <div key={fieldKey} className="col-span-2 truncate">
                          <span className="font-medium text-foreground capitalize">{fieldKey.replace(/([A-Z])/g, ' $1').trim()}:</span> {val}
                        </div>
                      );
                    })}
                  </div>

                  {p.readyDate && (
                    <div className="text-xs text-muted-foreground border-t border-border pt-2 mb-2">
                      <div className="flex items-center gap-1.5">{t('products.ready')}: {p.readyDate}</div>
                    </div>
                  )}

                  {p.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {p.restrictions.map((r, i) => (
                        <div key={i} className="contents">
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {r}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 hidden group-hover:flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id); }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ProductPanel;
