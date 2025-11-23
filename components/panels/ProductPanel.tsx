
import React from 'react';
import { Product } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Scale, Box, FlaskConical, AlertTriangle } from 'lucide-react';
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
  restrictionTags
}) => {
  return (
    <>
      <div className={`p-4 border-b border-slate-700 z-10 ${editingProductId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-3">
          {editingProductId && (
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12}/> Editing Product</span>
                  <button onClick={handleCancelProductEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12}/> Cancel</button>
              </div>
          )}
          
          {/* Row 1: Basic Info */}
          <div className="flex gap-2">
             <input 
              placeholder="Product Name" 
              value={newProduct.name}
              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
            <div className="relative w-24">
              <input 
                type="number" placeholder="Kg" 
                value={newProduct.weightKg || ''}
                onChange={e => setNewProduct({...newProduct, weightKg: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded pl-2 pr-6 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">kg</span>
            </div>
            <div className="relative w-24">
              <input 
                type="number" placeholder="m³" 
                value={newProduct.volumeM3 || ''}
                onChange={e => setNewProduct({...newProduct, volumeM3: Number(e.target.value)})}
                className="w-full bg-slate-900 border border-slate-600 rounded pl-2 pr-6 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
              />
              <span className="absolute right-2 top-2 text-xs text-slate-500">m³</span>
            </div>
          </div>
          
          {/* Row 2: Chemical / Dangerous Goods Info */}
          <div className="grid grid-cols-2 gap-2">
             <div className="relative">
                <div className="absolute left-2 top-2 pointer-events-none text-orange-400">
                    <FlaskConical size={12} />
                </div>
                <input 
                  type="text"
                  placeholder="UN Number (e.g. UN1090)"
                  value={newProduct.unNumber || ''}
                  onChange={e => setNewProduct({...newProduct, unNumber: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded pl-8 pr-2 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 placeholder:text-slate-600"
                />
             </div>
             <div className="relative">
                 <div className="absolute left-2 top-2 pointer-events-none text-orange-400">
                    <AlertTriangle size={12} />
                </div>
                 <input 
                  type="text"
                  placeholder="Haz Class (e.g. 3, 8)"
                  value={newProduct.hazardClass || ''}
                  onChange={e => setNewProduct({...newProduct, hazardClass: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-600 rounded pl-8 pr-2 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 placeholder:text-slate-600"
                />
             </div>
          </div>

          {/* Row 3: Dates */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <span className="absolute left-2 top-2 text-[10px] text-blue-400 font-medium uppercase">Ready Date</span>
              <input 
                type="date" 
                value={newProduct.readyDate || ''}
                onChange={e => setNewProduct({...newProduct, readyDate: e.target.value})}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
              />
            </div>
            <div className="relative">
              <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase">Ship Before</span>
              <input 
                type="date" 
                value={newProduct.shipDeadline || ''}
                onChange={e => setNewProduct({...newProduct, shipDeadline: e.target.value})}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
              />
            </div>
            <div className="relative">
               <span className="absolute left-2 top-2 text-[10px] text-slate-500 uppercase">Arr. Before</span>
               <input 
                   type="date" 
                   value={newProduct.arrivalDeadline || ''}
                   onChange={e => setNewProduct({...newProduct, arrivalDeadline: e.target.value})}
                   className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2 pt-6 text-xs focus:border-blue-500 outline-none text-slate-300 h-[46px]"
               />
            </div>
          </div>
          
          <button 
            onClick={handleSaveProduct} 
            className={`w-full py-2 rounded flex items-center justify-center transition-colors text-sm font-medium shadow-sm ${editingProductId ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {editingProductId ? <><Save size={16} className="mr-2"/> Update Product</> : <><Plus size={16} className="mr-2"/> Add Product</>}
          </button>

          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Restrictions</span>
            <RestrictionSelector 
              availableOptions={restrictionTags}
              selected={newProduct.restrictions} 
              onChange={r => setNewProduct({...newProduct, restrictions: r})} 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {products.length === 0 && <div className="text-center text-slate-500 mt-10 text-sm">No products added yet.</div>}
        {products.map(p => (
          <div key={p.id} className={`p-3 rounded border flex justify-between items-start group transition-colors ${editingProductId === p.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900/50 border-slate-700 hover:border-blue-500/30'}`}>
            <div className="flex-1">
              <div className="flex justify-between items-start pr-2">
                 <div className="text-sm font-medium text-slate-200">{p.name}</div>
                 {(p.hazardClass || p.unNumber) && (
                     <div className="text-[10px] font-bold text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-900/30">
                        {p.unNumber} {p.hazardClass ? `(Cl ${p.hazardClass})` : ''}
                     </div>
                 )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1"><Scale size={10}/> {p.weightKg}kg</span>
                  <span className="flex items-center gap-1"><Box size={10}/> {p.volumeM3}m³</span>
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
        ))}
      </div>
    </>
  );
};

export default ProductPanel;
