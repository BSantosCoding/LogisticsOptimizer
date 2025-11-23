import React from 'react';
import { Product } from '../../types';
import { Copy, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

interface ConfigPanelProps {
  templates: Product[];
  newTemplate: Partial<Product>;
  setNewTemplate: (t: Partial<Product>) => void;
  handleAddTemplate: () => void;
  applyTemplate: (t: Product) => void;
  restrictionTags: string[];
  newTag: string;
  setNewTag: (s: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (t: string) => void;
  DEFAULT_RESTRICTIONS: string[];
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  templates,
  newTemplate,
  setNewTemplate,
  handleAddTemplate,
  applyTemplate,
  restrictionTags,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  DEFAULT_RESTRICTIONS
}) => {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Templates Section */}
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
          <Copy size={16} className="text-blue-500"/> Product Templates
        </h3>
        
        {/* Add Template Form */}
        <div className="bg-slate-900/50 p-3 rounded border border-slate-700 mb-4">
          <div className="flex gap-2 mb-2">
            <input 
              placeholder="Template Name" 
              value={newTemplate.name}
              onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none text-slate-200"
            />
            <input type="number" placeholder="kg" className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200" value={newTemplate.weightKg || ''} onChange={e => setNewTemplate({...newTemplate, weightKg: Number(e.target.value)})} />
            <input type="number" placeholder="m³" className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200" value={newTemplate.volumeM3 || ''} onChange={e => setNewTemplate({...newTemplate, volumeM3: Number(e.target.value)})} />
            <button onClick={handleAddTemplate} className="bg-blue-600 hover:bg-blue-500 text-white px-2 rounded"><Plus size={16}/></button>
          </div>
          <RestrictionSelector availableOptions={restrictionTags} selected={newTemplate.restrictions || []} onChange={r => setNewTemplate({...newTemplate, restrictions: r})} />
        </div>

        {/* List Templates */}
        <div className="space-y-2">
          {templates.length === 0 && <div className="text-slate-500 text-xs italic">No templates defined.</div>}
          {templates.map(t => (
            <div key={t.id} className="bg-slate-800 p-2 rounded border border-slate-700 flex justify-between items-center">
               <div>
                 <div className="font-medium text-sm text-slate-200">{t.name}</div>
                 <div className="text-xs text-slate-500">{t.weightKg}kg | {t.volumeM3}m³ | {t.restrictions.join(', ')}</div>
               </div>
               <button onClick={() => applyTemplate(t)} className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">
                 Use Template
               </button>
            </div>
          ))}
        </div>
      </div>

      {/* Restriction Tags Section */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
          <ShieldAlert size={16} className="text-purple-500"/> Manage Restriction Tags
        </h3>
        <div className="flex gap-2 mb-3">
          <input 
            placeholder="New Tag Name" 
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200"
          />
          <button onClick={handleAddTag} className="bg-purple-600 hover:bg-purple-500 text-white px-3 rounded flex items-center gap-1">
            <Plus size={16}/> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {restrictionTags.map(tag => (
            <div key={tag} className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-sm flex items-center gap-2 text-slate-300">
              {tag}
              {!DEFAULT_RESTRICTIONS.includes(tag) && (
                <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-red-400"><Trash2 size={12}/></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;