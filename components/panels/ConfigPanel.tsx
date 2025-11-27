
import React, { useState } from 'react';
import { Product } from '../../types';
import { Copy, Plus, ShieldAlert, Trash2, Lock, Search, Filter, ChevronDown, Settings } from 'lucide-react';
import RestrictionSelector from '../RestrictionSelector';

interface ConfigPanelProps {
  viewMode: 'form' | 'list';
  templates: Product[];
  newTemplate: Partial<Product>;
  setNewTemplate: (t: Partial<Product>) => void;
  handleAddTemplate: () => void;
  handleRemoveTemplate: (id: string) => void;
  applyTemplate: (t: Product) => void;
  restrictionTags: string[];
  newTag: string;
  setNewTag: (s: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (t: string) => void;
  DEFAULT_RESTRICTIONS: string[];
  userRole: 'admin' | 'manager' | 'standard' | null;
  optimalRange?: { min: number; max: number };
  setOptimalRange?: (range: { min: number; max: number }) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  viewMode,
  templates,
  newTemplate,
  setNewTemplate,
  handleAddTemplate,
  handleRemoveTemplate,
  applyTemplate,
  restrictionTags,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  DEFAULT_RESTRICTIONS,
  userRole,
  optimalRange,
  setOptimalRange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const canManageConfig = userRole === 'admin' || userRole === 'manager';

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTagFilter ? t.restrictions.includes(selectedTagFilter) : true;
    return matchesSearch && matchesTag;
  });

  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Optimal Utilization Settings */}
        {optimalRange && setOptimalRange && (
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <Settings size={20} />
              <h3 className="font-semibold">Optimization Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Optimal Utilization Range (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimalRange.min}
                    onChange={(e) => setOptimalRange({ ...optimalRange, min: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                    placeholder="Min"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimalRange.max}
                    onChange={(e) => setOptimalRange({ ...optimalRange, max: parseInt(e.target.value) || 100 })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                    placeholder="Max"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Target utilization range for containers. Optimization will aim to keep containers within this range.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template Creation Form */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
            <Copy size={16} className="text-blue-500" /> New Template
          </h3>
          {canManageConfig ? (
            <div className="bg-slate-900/50 p-3 rounded border border-slate-700 space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder="Template Name"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-200 min-w-0"
                />
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase font-bold">Restrictions</span>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
              </div>

              <button
                onClick={handleAddTemplate}
                className="w-full py-2 rounded flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition-colors text-sm font-medium"
              >
                <Plus size={16} className="mr-2" /> Add Template
              </button>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded text-xs text-slate-400 flex items-center gap-2">
              <Lock size={12} /> Template creation is restricted to managers and admins.
            </div>
          )}
        </div>

        {/* Add Tag Form */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
            <ShieldAlert size={16} className="text-purple-500" /> New Tag
          </h3>
          {canManageConfig ? (
            <div className="flex gap-2 items-center">
              <input
                placeholder="New Tag Name"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 text-sm focus:border-blue-500 outline-none text-slate-200 h-9"
              />
              <button
                onClick={handleAddTag}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 h-9 rounded flex items-center gap-1 shrink-0 transition-colors"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Lock size={12} /> Only managers can add tags.
            </div>
          )}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
          <Settings className="text-blue-500" /> Configuration
        </h2>

        {/* Templates List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-slate-300">Product Templates</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 pl-9 text-xs text-slate-200 focus:border-blue-500 outline-none h-9"
              />
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-slate-500 text-sm italic py-4 border border-dashed border-slate-700 rounded text-center">No templates found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map(t => (
                <div key={t.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between group hover:border-slate-500 transition-all">
                  <div>
                    <div className="font-semibold text-slate-200 mb-2">{t.name}</div>
                    {t.restrictions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {t.restrictions.map(r => <span key={r} className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">{r}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700/50">
                    <button onClick={() => applyTemplate(t)} className="flex-1 text-xs bg-blue-600/20 text-blue-400 py-1.5 rounded border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all text-center">
                      Use Template
                    </button>
                    {canManageConfig && (
                      <button onClick={() => handleRemoveTemplate(t.id)} className="text-slate-500 hover:text-red-400 px-2 rounded hover:bg-slate-700 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags List */}
        <div>
          <h3 className="text-lg font-medium text-slate-300 mb-4">Restriction Tags</h3>
          <div className="flex flex-wrap gap-2">
            {restrictionTags.map(tag => (
              <div key={tag} className="bg-slate-800 pl-4 pr-2 py-2 rounded-full border border-slate-700 text-sm flex items-center gap-2 text-slate-300 group hover:border-purple-500/50 transition-colors">
                {tag}
                {!DEFAULT_RESTRICTIONS.includes(tag) && canManageConfig && (
                  <button onClick={() => handleRemoveTag(tag)} className="text-slate-500 hover:text-red-400 p-1.5 rounded-full hover:bg-slate-700 transition-colors"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
