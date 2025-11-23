
import React, { useState } from 'react';
import { Product } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Scale, Box, Search, Filter, MapPin } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

interface ProductPanelProps {
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
}

const ProductPanel: React.FC<ProductPanelProps> = ({
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
  toggleProductSelection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.destination || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter ? p.restrictions.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  const toggleSelectAll = () => {
    if (filteredProducts.every(p => selectedProductIds.has(p.id))) {
      // Deselect all visible
      filteredProducts.forEach(p => toggleProductSelection(p.id));
    } else {
      // Select all visible
      filteredProducts.forEach(p => {
        if (!selectedProductIds.has(p.id)) toggleProductSelection(p.id);
      });
    }
  };

  return (
    <>
      <div className={`p-4 border-b border-slate-700 z-10 ${editingProductId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-3">
          {editingProductId && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12} /> Editing Product</span>
              <button onClick={handleCancelProductEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12} /> Cancel</button>
            </div>
          )}

          {/* Row 1: Basic Info */}
          <div className="flex gap-2">
            <input
              placeholder="Product Name"
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
            <div className="relative w-20">
              <input
                type="number" placeholder="Kg"
                value={newProduct.weightKg || ''}
                onChange={e => setNewProduct({ ...newProduct, weightKg: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded pl-2 pr-6 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">kg</span>
            </div>
            <div className="relative w-20">
              <input
                type="number" placeholder="m³"
                value={newProduct.volumeM3 || ''}
                onChange={e => setNewProduct({ ...newProduct, volumeM3: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-600 rounded pl-2 pr-6 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">m³</span>
            </div>
          </div>

          {/* Destination Input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              placeholder="Destination (Optional - match with Deals)"
              value={newProduct.destination || ''}
              onChange={e => setNewProduct({ ...newProduct, destination: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-9 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>

          {/* Row 2: Dates */}
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

          <button
            onClick={handleSaveProduct}
            className={`w-full py-2 rounded flex items-center justify-center transition-colors text-sm font-medium shadow-sm ${editingProductId ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {editingProductId ? <><Save size={16} className="mr-2" /> Update Product</> : <><Plus size={16} className="mr-2" /> Add Product</>}
          </button>

          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Restrictions</span>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newProduct.restrictions}
              onChange={r => setNewProduct({ ...newProduct, restrictions: r })}
            />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            placeholder="Search name or dest..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-9 text-xs text-slate-200 focus:border-blue-500 outline-none h-9"
          />
        </div>
        <div className="relative w-1/3 min-w-[100px]">
          <Filter className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
          <select
            value={selectedTagFilter}
            onChange={e => setSelectedTagFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 pl-8 text-xs text-slate-200 focus:border-blue-500 outline-none appearance-none h-9 cursor-pointer"
          >
            <option value="">All Tags</option>
            {restrictionTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {products.length === 0 && <div className="text-center text-slate-500 mt-10 text-sm">No products added yet.</div>}
        {products.length > 0 && filteredProducts.length === 0 && <div className="text-center text-slate-500 mt-4 text-sm">No products match your search.</div>}

        {filteredProducts.map(p => {
          const isSelected = selectedProductIds.has(p.id);
          return (
            <div key={p.id} className={`p-3 rounded border flex gap-3 items-start group transition-colors ${editingProductId === p.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900/50 border-slate-700 hover:border-blue-500/30'}`}>
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleProductSelection(p.id)}
                  className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-800 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start pr-2">
                  <div className="text-sm font-medium text-slate-200">{p.name}</div>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Scale size={10} /> {p.weightKg}kg</span>
                  <span className="flex items-center gap-1"><Box size={10} /> {p.volumeM3}m³</span>
                  {p.destination && <span className="flex items-center gap-1 text-blue-400"><MapPin size={10} /> {p.destination}</span>}
                </div>
                {(p.shipDeadline || p.arrivalDeadline || p.readyDate) && (
                  <div className="text-[10px] text-slate-500 mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-800 pt-1 w-fit">
                    {p.readyDate && <span className="text-blue-400 font-medium">Ready: {p.readyDate}</span>}
                    {p.shipDeadline && <span>Ship &lt; {p.shipDeadline}</span>}
                    {p.arrivalDeadline && <span>Arrive &lt; {p.arrivalDeadline}</span>}
                  </div>
                )}
                {p.restrictions.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {p.restrictions.map((r, i) => (
                      <span key={i} className="text-[10px] bg-red-900/20 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30">{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEditProduct(p)} className="text-slate-600 hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-800">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleRemoveProduct(p.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-800">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default ProductPanel;
