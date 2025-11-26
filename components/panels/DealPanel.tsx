import React, { useState, useRef } from 'react';
import { Container, ProductFormFactor } from '../../types';
import { Plus, Save, Pencil, Trash2, X, Box, DollarSign, Clock, MapPin, ShieldAlert, Search, Filter, ChevronDown, Container as ContainerIcon } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

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
  formFactors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const tagMatch = selectedTagFilter ? c.restrictions.includes(selectedTagFilter) : true;
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
    return (
      <div className={`p-4 border-b border-slate-700 z-10 ${editingContainerId ? 'bg-blue-900/10' : 'bg-slate-800'}`}>
        <div className="space-y-3">
          {editingContainerId && (
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-blue-400 uppercase flex items-center gap-1"><Pencil size={12} /> Editing Container</span>
              <button onClick={handleCancelContainerEdit} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><X size={12} /> Cancel</button>
            </div>
          )}

          <div className="flex gap-2">
            <input
              placeholder="Container Name (e.g. Maersk 40ft)"
              value={newContainer.name}
              onChange={e => setNewContainer({ ...newContainer, name: e.target.value })}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
          </div>

          <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
            <span className="text-xs text-slate-500 uppercase font-bold mb-2 block">Capacities (Max Units)</span>
            {formFactors.length === 0 ? (
              <div className="text-xs text-red-400">No Form Factors defined. Please add them in the Config panel.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {formFactors.map(ff => (
                  <div key={ff.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-12 truncate" title={ff.name}>{ff.name}</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={newContainer.capacities[ff.id] || ''}
                      onChange={e => handleCapacityChange(ff.id, e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none text-slate-200"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" placeholder="Cost" value={newContainer.cost || ''} onChange={e => setNewContainer({ ...newContainer, cost: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-7 text-slate-200" />
              <DollarSign size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
            <div className="relative flex-1">
              <input type="number" placeholder="Days" value={newContainer.transitTimeDays || ''} onChange={e => setNewContainer({ ...newContainer, transitTimeDays: Number(e.target.value) })} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none pl-7 text-slate-200" />
              <Clock size={12} className="absolute left-2.5 top-3 text-slate-500" />
            </div>
          </div>

          <div className="flex gap-2">
            <input placeholder="Destination (Empty = Any)" value={newContainer.destination} onChange={e => setNewContainer({ ...newContainer, destination: e.target.value })} className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200" />
            <input type="date" value={newContainer.availableFrom} onChange={e => setNewContainer({ ...newContainer, availableFrom: e.target.value })} className="w-1/3 bg-slate-900 border border-slate-600 rounded px-2 py-2 text-sm focus:border-blue-500 outline-none text-slate-400" />
          </div>

          <div>
            <span className="text-xs text-slate-500 uppercase font-bold">Capabilities</span>
            <RestrictionSelector
              availableOptions={restrictionTags}
              selected={newContainer.restrictions}
              onChange={r => setNewContainer({ ...newContainer, restrictions: r })}
            />
          </div>

          <button
            onClick={handleSaveContainer}
            className={`w-full py-2 rounded flex items-center justify-center transition-colors text-sm font-medium shadow-sm ${editingContainerId ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {editingContainerId ? <><Save size={16} className="mr-2" /> Update Container</> : <><Plus size={16} className="mr-2" /> Add Container</>}
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
          <ContainerIcon className="text-blue-500" /> Logistics Containers
          <span className="text-sm font-normal text-slate-500 ml-2">{filteredContainers.length} units</span>
        </h2>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
          <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600 px-3 py-1 rounded flex items-center gap-1">
            Import CSV
          </button>
          {containers.length > 0 && (
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
              placeholder="Search containers..."
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
              <option value="">All Caps</option>
              {restrictionTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        {containers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
            <ContainerIcon size={48} className="mb-2 opacity-50" />
            <p>No containers added yet.</p>
            <p className="text-sm">Use the form on the left to add containers.</p>
          </div>
        )}

        {containers.length > 0 && filteredContainers.length === 0 && <div className="text-center text-slate-500 mt-10 text-sm">No containers match your search.</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContainers.map(c => {
            const isSelected = selectedContainerIds.has(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleContainerSelection(c.id)}
                className={`relative p-4 rounded-xl border transition-all cursor-pointer group ${isSelected
                  ? 'bg-blue-900/20 border-blue-500/50 shadow-lg shadow-blue-900/10'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-800/80 hover:shadow-lg'
                  } ${editingContainerId === c.id ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-200">{c.name}</h3>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Object.entries(c.capacities).map(([ffId, cap]) => {
                        const ff = formFactors.find(f => f.id === ffId);
                        if (!ff) return null;
                        return (
                          <span key={ffId} className="text-[10px] bg-slate-900 text-slate-400 px-1 rounded border border-slate-700">
                            {ff.name}: {cap}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 bg-slate-900/50'}`}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 mb-3 pt-2">
                  <div className="flex items-center gap-1.5"><DollarSign size={14} className="text-green-500" /> {c.cost}</div>
                  <div className="flex items-center gap-1.5"><Clock size={14} className="text-slate-500" /> {c.transitTimeDays}d</div>
                  <div className="flex items-center gap-1.5 col-span-2 text-blue-400"><MapPin size={14} /> {c.destination || 'Anywhere'}</div>
                </div>

                <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-2 mb-2 flex justify-between">
                  <span>Available: {c.availableFrom}</span>
                </div>

                {c.restrictions.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-1">
                    {c.restrictions.map((r, i) => (
                      <span key={i} className="text-[10px] bg-green-900/20 text-green-400 px-1.5 py-0.5 rounded border border-green-900/30 flex items-center gap-1">
                        <ShieldAlert size={8} /> {r}
                      </span>
                    ))}
                  </div>
                )}

                <div className="absolute bottom-2 right-2 hidden group-hover:flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-xl z-20">
                  <button onClick={(e) => { e.stopPropagation(); handleEditContainer(c) }} className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-400 rounded transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveContainer(c.id) }} className="p-1.5 hover:bg-red-600 hover:text-white text-slate-400 rounded transition-colors">
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

export default ContainerPanel;
