
import React, { useState } from 'react';
import { Product, UserProfile } from '../../types';
import { Role, hasRole } from '../../utils/roles';
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
  userRole: Role | null;
  userProfile: UserProfile | null;
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
  userProfile,
  optimalRange,
  setOptimalRange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');

  const canManageTemplates = hasRole(userRole, 'manager') || userProfile?.can_edit_templates;
  const canManageTags = hasRole(userRole, 'manager') || userProfile?.can_edit_tags;
  const canManageConfig = canManageTemplates || canManageTags; // Fallback for general UI, but specific actions should check specific flags

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
            <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
              <Settings size={16} className="text-blue-500" /> Optimization Settings
            </h3>
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
          {canManageTemplates ? (
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
          {canManageTags ? (
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

  // LIST VIEW - Templates left, Optimal Range + Tags stacked right
  return (
    <div className="flex gap-4 h-full">
      {/* Product Templates Panel - Takes most space */}
      <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Copy className="text-blue-400" size={20} />
            Product Templates
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
              {filteredTemplates.length}
            </span>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 pl-9 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none h-8"
              />
            </div>
          </div>
        </div>

        {/* Template Creation Form - For Managers and Admins */}
        {canManageConfig && (
          <div className="p-4 border-b border-slate-700 bg-slate-800/30">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Template Name</label>
                <input
                  placeholder="e.g. Standard Product"
                  value={newTemplate.name}
                  onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Restrictions</label>
                <RestrictionSelector
                  availableOptions={restrictionTags}
                  selected={newTemplate.restrictions || []}
                  onChange={r => setNewTemplate({ ...newTemplate, restrictions: r })}
                />
              </div>

              <button
                onClick={handleAddTemplate}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
              >
                <Plus size={16} /> Add Template
              </button>
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No templates found.
            </div>
          ) : (
            filteredTemplates.map(t => (
              <div key={t.id} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 group hover:border-slate-600 transition-colors">
                <div className="font-semibold text-slate-200 mb-2">{t.name}</div>
                {t.restrictions.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {t.restrictions.map(r => (
                      <span key={r} className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 border border-slate-700">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-700/50">
                  <button
                    onClick={() => applyTemplate(t)}
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded transition-colors text-center font-medium"
                  >
                    Use Template
                  </button>
                  {canManageTemplates && (
                    <button
                      onClick={() => handleRemoveTemplate(t.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column - Optimal Range + Tags stacked */}
      <div className="w-80 flex flex-col gap-4">
        {/* Optimal Range Panel - Compact */}
        {optimalRange && setOptimalRange && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="text-green-400" size={20} />
                Optimization
              </h2>
            </div>

            <div className="p-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Optimal Utilization Range (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimalRange.min}
                    onChange={(e) => setOptimalRange({ ...optimalRange, min: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Min"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={optimalRange.max}
                    onChange={(e) => setOptimalRange({ ...optimalRange, max: parseInt(e.target.value) || 100 })}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Max"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Target utilization range for containers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Restriction Tags Panel */}
        <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldAlert className="text-purple-400" size={20} />
              Restriction Tags
            </h2>
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded-full">
              {restrictionTags.length}
            </span>
          </div>

          {/* Tag Creation Form - For Managers and Admins */}
          {canManageTags && (
            <div className="p-4 border-b border-slate-700 bg-slate-800/30">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tag Name</label>
                  <input
                    placeholder="e.g. Fragile"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={handleAddTag}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                >
                  <Plus size={16} /> Add Tag
                </button>
              </div>
            </div>
          )}

          {/* Tags List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {restrictionTags.map(tag => (
              <div key={tag} className="bg-slate-700/30 border border-slate-700 rounded-lg p-3 group hover:border-purple-500/50 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-slate-200">{tag}</span>
                  {!DEFAULT_RESTRICTIONS.includes(tag) && canManageTags && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-700 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
