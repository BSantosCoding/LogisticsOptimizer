import React, { useState } from 'react';
import { Product, ProductFormFactor } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Box, Search, Filter, MapPin, ChevronDown, Hash } from 'lucide-react';
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
  formFactors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
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

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.destination || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter ? p.restrictions.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  if (viewMode === 'form') {
    return (
      <div className={`p-4 border-b border-slate-700 z-10 ${editingProductId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-3">
          {editingProductId && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12} /> Editing Product</span>
              <button onClick={handleCancelProductEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12} /> Cancel</button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              placeholder="Product Name / Request ID"
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={newProduct.formFactorId || ''}
                onChange={e => setNewProduct({ ...newProduct, formFactorId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              >
                <option value="" disabled>Select Form Factor...</option>
                {formFactors.map(ff => (
                  <option key={ff.id} value={ff.id}>{ff.name}</option>
                ))}
              </select>
            </div>
            <div className="relative w-24">
              <input
                type="number" placeholder="Qty"
                value={newProduct.quantity || ''}
                onChange={e => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded pl-2 pr-6 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">#</span>
            </div>
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              placeholder="Destination (Optional)"
              value={newProduct.destination || ''}
              onChange={e => setNewProduct({ ...newProduct, destination: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-9 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <span className="absolute left-2 top-2 text-[10px] text-blue-400 font-medium uppercase">Ready Date</span>
              <input
                type="date"
                value={newProduct.readyDate || ''}
                onChange={e => setNewProduct({ ...newProduct, readyDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase">Ship Before</span>
              <input
                type="date"
                value={newProduct.shipDeadline || ''}
                onChange={e => setNewProduct({ ...newProduct, shipDeadline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase">Arr. Before</span>
              <input
                type="date"
                value={newProduct.arrivalDeadline || ''}
                onChange={e => setNewProduct({ ...newProduct, arrivalDeadline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Restrictions</span>
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
            {editingProductId ? <><Save size={16} className="mr-2" /> Update Product</> : <><Plus size={16} className="mr-2" /> Add Product</>}
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Box className="text-blue-500" /> Product Inventory
          <span className="text-sm font-normal text-slate-500 ml-2">{filteredProducts.length} items</span>
        </h2>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600 px-3 py-1 rounded flex items-center gap-1">
            Import CSV
          </button>
          {products.length > 0 && (
            <button onClick={onClearAll} className="text-xs bg-slate-800 hover:bg-red-900/30 text-red-400 border border-slate-600 px-3 py-1 rounded flex items-center gap-1">
              Clear All
            </button>
          )}
        </div>
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search name or dest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 pl-10 text-sm text-slate-200 focus:border-blue-500 outline-none h-10 transition-colors focus:bg-slate-800/80"
            />
          </div>
          <div className="relative w-[180px] shrink-0 hidden sm:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select
              value={selectedTagFilter}
              onChange={e => setSelectedTagFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 pl-10 pr-8 text-sm text-slate-200 focus:border-blue-500 outline-none appearance-none h-10 cursor-pointer hover:bg-slate-700/50 transition-colors"
            >
              <option value="">All Tags</option>
              {restrictionTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
            <Box size={48} className="mb-2 opacity-50" />
            <p>No products added yet.</p>
            <p className="text-sm">Use the form on the left to add items.</p>
          </div>
        )}

        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="text-center text-slate-500 mt-10 text-sm">No products match your search.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const isSelected = selectedProductIds.has(p.id);
            const ff = formFactors.find(f => f.id === p.formFactorId);
            return (
              <div
                key={p.id}
                onClick={() => toggleProductSelection(p.id)}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${isSelected
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 hover:shadow-lg'
                  } ${editingProductId === p.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-200 truncate pr-6">{p.name}</h3>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 bg-slate-900/50'}`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mb-3">
                  <div className="flex items-center gap-1.5"><Box size={14} className="text-slate-500" /> {ff?.name || 'Unknown'}</div>
                  <div className="flex items-center gap-1.5"><Hash size={14} className="text-slate-500" /> {p.quantity} units</div>
                </div>

                {(p.destination || p.readyDate) && (
                  <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-2 mb-2 space-y-1">
                    {p.destination && <div className="flex items-center gap-1.5 text-blue-400"><MapPin size={12} /> {p.destination}</div>}
                    {p.readyDate && <div className="flex items-center gap-1.5">Ready: {p.readyDate}</div>}
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
  );
};

export default ProductPanel;
