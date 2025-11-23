
import React, { useState } from 'react';
import { Deal } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Scale, Box, DollarSign, Clock, MapPin, ShieldAlert, Search, Filter } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

interface DealPanelProps {
  deals: Deal[];
  newDeal: Omit<Deal, 'id'>;
  setNewDeal: (d: Omit<Deal, 'id'>) => void;
  editingDealId: string | null;
  handleSaveDeal: () => void;
  handleEditDeal: (d: Deal) => void;
  handleRemoveDeal: (id: string) => void;
  handleCancelDealEdit: () => void;
  restrictionTags: string[];
  selectedDealIds: Set<string>;
  toggleDealSelection: (id: string) => void;
}

const DealPanel: React.FC<DealPanelProps> = ({
  deals,
  newDeal,
  setNewDeal,
  editingDealId,
  handleSaveDeal,
  handleEditDeal,
  handleRemoveDeal,
  handleCancelDealEdit,
  restrictionTags,
  selectedDealIds,
  toggleDealSelection
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  const filteredDeals = deals.filter(d => {
    const textMatch = d.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.containerType.toLowerCase().includes(searchTerm.toLowerCase());
    const tagMatch = selectedTagFilter ? d.restrictions.includes(selectedTagFilter) : true;
    return textMatch && tagMatch;
  });

  return (
    <>
      <div className={`p-4 border-b border-slate-700 z-10 ${editingDealId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-2">
          {editingDealId && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12} /> Editing Deal</span>
              <button onClick={handleCancelDealEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12} /> Cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              placeholder="Carrier Name"
              value={newDeal.carrierName}
              onChange={e => setNewDeal({ ...newDeal, carrierName: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
            <input
              placeholder="Type (e.g. 20ft)"
              value={newDeal.containerType}
              onChange={e => setNewDeal({ ...newDeal, containerType: e.target.value })}
              className="w-1/3 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" placeholder="Max Kg" value={newDeal.maxWeightKg || ''} onChange={e => setNewDeal({ ...newDeal, maxWeightKg: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-8 text-slate-200" />
              <Scale size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
            <div className="relative flex-1">
              <input type="number" placeholder="Max m³" value={newDeal.maxVolumeM3 || ''} onChange={e => setNewDeal({ ...newDeal, maxVolumeM3: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-8 text-slate-200" />
              <Box size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" placeholder="Cost" value={newDeal.cost || ''} onChange={e => setNewDeal({ ...newDeal, cost: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-7 text-slate-200" />
              <DollarSign size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
            <div className="relative flex-1">
              <input type="number" placeholder="Days" value={newDeal.transitTimeDays || ''} onChange={e => setNewDeal({ ...newDeal, transitTimeDays: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-7 text-slate-200" />
              <Clock size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <input placeholder="Destination (Empty = Any)" value={newDeal.destination} onChange={e => setNewDeal({ ...newDeal, destination: e.target.value })} className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200" />
            <input type="date" value={newDeal.availableFrom} onChange={e => setNewDeal({ ...newDeal, availableFrom: e.target.value })} className="w-1/3 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm focus:border-blue-500 outline-none text-slate-400" />
            <button
              onClick={handleSaveDeal}
              className={`px-3 rounded flex items-center justify-center transition-colors ${editingDealId ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              title={editingDealId ? "Update Deal" : "Add Deal"}
            >
              {editingDealId ? <Save size={18} /> : <Plus size={18} />}
            </button>
          </div>
          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Capabilities</span>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newDeal.restrictions}
              onChange={r => setNewDeal({ ...newDeal, restrictions: r })}
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
            placeholder="Search deals..."
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
            <option value="">All Caps</option>
            {restrictionTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {deals.length === 0 && <div className="text-center text-slate-500 mt-10 text-sm">No deals added yet.</div>}
        {deals.length > 0 && filteredDeals.length === 0 && <div className="text-center text-slate-500 mt-4 text-sm">No deals match your search.</div>}

        {filteredDeals.map(d => {
          const isSelected = selectedDealIds.has(d.id);
          return (
            <div key={d.id} className={`p-3 rounded border flex gap-3 items-start group transition-colors ${editingDealId === d.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900/50 border-slate-700 hover:border-blue-500/30'}`}>
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDealSelection(d.id)}
                  className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-800 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-200 flex justify-between pr-2">
                  <span>{d.carrierName}</span>
                  <span className="text-slate-500 text-xs font-normal bg-slate-800 px-1 rounded">{d.containerType}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {d.destination || 'Anywhere'}</span>
                  <span className="flex items-center gap-1 text-green-400"><DollarSign size={10} /> {d.cost}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {d.transitTimeDays}d</span>
                </div>
                {d.restrictions.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {d.restrictions.map((r, i) => (
                      <span key={i} className="text-[10px] bg-green-900/20 text-green-400 px-1.5 py-0.5 rounded border border-green-900/30 flex items-center gap-1">
                        <ShieldAlert size={8} /> {r}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1.5 border-t border-slate-800 pt-1.5 flex justify-between">
                  <span>Cap: {d.maxWeightKg}kg / {d.maxVolumeM3}m³</span>
                  <span>Avail: {d.availableFrom}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEditDeal(d)} className="text-slate-600 hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-800">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleRemoveDeal(d.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-800">
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

export default DealPanel;
