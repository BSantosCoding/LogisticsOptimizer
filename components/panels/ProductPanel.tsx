import React, { useState } from 'react';
import { Product, ProductFormFactor } from '../../types';
import { useTranslation } from 'react-i18next';
import { Plus, Save, Pencil, Trash2, X, Box, Search, Filter, MapPin, ChevronDown, Hash, AlertTriangle, Weight } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

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
  allSelected
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
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
      const matchesTag = selectedTagFilter ? p.restrictions.includes(selectedTagFilter) : true;

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
      <div className={`p-4 border-b border-slate-700 z-10 ${editingProductId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-3">
          {editingProductId && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12} /> {t('products.editing')}</span>
              <button onClick={handleCancelProductEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12} /> {t('common.cancel')}</button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              placeholder={t('products.namePlaceholder')}
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">{t('products.destination')}</label>
              <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2">
                <MapPin size={14} className="text-slate-500 mr-2" />
                <input
                  placeholder={t('products.destination')}
                  value={newProduct.destination || ''}
                  onChange={e => setNewProduct({ ...newProduct, destination: e.target.value })}
                  className="bg-transparent text-sm text-slate-200 outline-none w-full"
                />
              </div>
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-slate-400 mb-1">{t('products.country')}</label>
              <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2">
                <input
                  placeholder={t('products.country') + " (e.g. CN)"}
                  value={newProduct.country || ''}
                  onChange={e => setNewProduct({ ...newProduct, country: e.target.value })}
                  className="bg-transparent text-sm text-slate-200 outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">{t('products.formFactor')}</label>
              <select
                value={newProduct.formFactorId || ''}
                onChange={e => setNewProduct({ ...newProduct, formFactorId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 h-[38px]"
              >
                <option value="" disabled>{t('products.selectFormFactor')}</option>
                {formFactors.map(ff => (
                  <option key={ff.id} value={ff.id}>{ff.name}</option>
                ))}
              </select>
            </div>
            <div className="w-1/4">
              <label className="block text-xs text-slate-400 mb-1">{t('common.units')}</label>
              <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2 h-[38px]">
                <input
                  type="number"
                  min="1"
                  value={newProduct.quantity}
                  onChange={e => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                  className="bg-transparent text-sm text-slate-200 outline-none w-full"
                />
                <span className="text-slate-500 text-xs ml-1">#</span>
              </div>
            </div>
            <div className="w-1/4">
              <label className="block text-xs text-slate-400 mb-1">{t('products.weight', 'Weight (kg)')}</label>
              <div className="flex items-center bg-slate-900 border border-slate-600 rounded px-3 py-2 h-[38px]">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="-"
                  value={newProduct.weight ?? ''}
                  onChange={e => setNewProduct({ ...newProduct, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="bg-transparent text-sm text-slate-200 outline-none w-full"
                />
                <Weight size={14} className="text-slate-500 ml-1" />
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">{t('products.restrictions')}</span>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newProduct.restrictions}
              onChange={r => setNewProduct({ ...newProduct, restrictions: r })}
            />
          </div>

          <button
            onClick={handleSaveProduct}
            className={`w-full py-2 rounded flex items-center justify-center transition-colors text-sm font-medium shadow-sm ${editingProductId ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {editingProductId ? <><Save size={16} className="mr-2" /> {t('products.updateProduct')}</> : <><Plus size={16} className="mr-2" /> {t('products.addProduct')}</>}
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-slate-700 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/10 p-2 rounded-lg border border-blue-500/20">
                <Box className="text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{t('products.title')}</h2>
                <p className="text-xs text-slate-500">{products.length} {t('products.items')}</p>
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
              <button onClick={() => fileInputRef.current?.click()} className="h-9 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600 px-3 rounded flex items-center gap-1.5">
                {t('products.importCsv')}
              </button>
              {products.length > 0 && (
                <button onClick={onClearAll} className="h-9 text-xs bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-600 px-3 rounded flex items-center gap-1.5">
                  {t('common.clearAll')}
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder={t('common.search') + "..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 pl-9 text-xs text-slate-200 focus:border-blue-500 outline-none h-9"
              />
            </div>

            <select
              value={shipmentFilter}
              onChange={(e) => setShipmentFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-600 rounded px-3 text-xs text-slate-200 focus:border-blue-500 outline-none h-9 min-w-[100px]"
            >
              <option value="available">{t('products.filterAvailable')}</option>
              <option value="shipped">{t('products.filterShipped')}</option>
              <option value="all">{t('products.filterAll')}</option>
            </select>

            <select
              value={selectedTagFilter}
              onChange={e => setSelectedTagFilter(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded px-3 text-xs text-slate-200 focus:border-blue-500 outline-none h-9 min-w-[120px]"
            >
              <option value="">{t('products.allTags')}</option>
              {restrictionTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <button
              onClick={() => setShowWarningsOnly(!showWarningsOnly)}
              className={`px-3 h-9 rounded flex items-center gap-1.5 text-xs font-medium transition-all shrink-0 ${showWarningsOnly
                ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-600'
                : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-slate-300'
                }`}
              title="Show only products with warnings (missing form factors)"
            >
              <AlertTriangle size={14} />
              <span className="hidden sm:inline">{t('common.warnings')}</span>
            </button>

            {onSelectAll && (
              <button
                onClick={onSelectAll}
                className="px-3 h-9 rounded text-xs font-medium bg-slate-800 text-slate-400 border border-slate-600 hover:border-blue-500 hover:text-blue-400 transition-colors shrink-0"
              >
                {allSelected ? t('common.deselectAll') : t('common.selectAll')}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20">
          {products.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
              <Box size={48} className="mb-2 opacity-50" />
              <p>{t('products.noProducts')}</p>
              <p className="text-sm">{t('products.useForm')}</p>
            </div>
          )}

          {products.length > 0 && filteredProducts.length === 0 && (
            <div className="text-center text-slate-500 mt-10 text-sm">{t('products.noMatches')}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              const isSelected = selectedProductIds.has(p.id);
              const ff = formFactors.find(f => f.id === p.formFactorId);
              const hasMissingFF = !p.formFactorId || !ff; // Check if form factor is missing
              return (
                <div
                  key={p.id}
                  onClick={() => toggleProductSelection(p.id)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${hasMissingFF
                    ? 'bg-yellow-900/10 border-yellow-500/50 hover:border-yellow-400/70'
                    : isSelected
                      ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 hover:shadow-lg'
                    } ${editingProductId === p.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {hasMissingFF && (
                    <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-yellow-500/30">
                      <AlertTriangle size={10} />
                      {t('products.noFormFactor')}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-200 truncate pr-6">{p.name}</h3>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 bg-slate-900/50'}`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin size={12} />
                      {p.destination || 'No Destination'}
                      {p.country && <span className="text-slate-500">({p.country})</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Box size={12} />
                      {ff?.name || <span className="text-yellow-500 font-bold">{t('products.unknown')}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mb-3">
                    <div className="flex items-center gap-1.5"><Hash size={14} className="text-slate-500" /> {p.quantity} {t('common.units')}</div>
                    {p.weight !== undefined && (
                      <div className="flex items-center gap-1.5"><Weight size={14} className="text-slate-500" /> {p.weight} kg</div>
                    )}
                  </div>

                  {(p.readyDate) && (
                    <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-2 mb-2 space-y-1">
                      {p.readyDate && <div className="flex items-center gap-1.5">{t('products.ready')}: {p.readyDate}</div>}
                    </div>
                  )}

                  {p.restrictions.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      {p.restrictions.map((r, i) => (
                        <span key={i} className="text-[10px] bg-red-900/20 text-red-300 px-1.5 py-0.5 rounded border border-red-900/20">{r}</span>
                      ))}
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 hidden group-hover:flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-xl z-20">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                      className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-400 rounded transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveProduct(p.id); }}
                      className="p-1.5 hover:bg-red-600 hover:text-white text-slate-400 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPanel;
