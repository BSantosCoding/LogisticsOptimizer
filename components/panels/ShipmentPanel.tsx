import React, { useState } from 'react';
import { Shipment, LoadedContainer } from '../../types';
import { Package, Calendar, DollarSign, Box, ChevronRight, ChevronDown, Trash2, RefreshCw, RotateCcw } from 'lucide-react';

interface ShipmentPanelProps {
    shipments: Shipment[];
    onUnpack: (shipmentId: string) => void;
    onLoadAsBase: (shipmentId: string) => void;
    onDelete: (shipmentId: string) => void;
}

const ShipmentPanel: React.FC<ShipmentPanelProps> = ({
    shipments,
    onUnpack,
    onLoadAsBase,
    onDelete
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (shipments.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-center">No shipments saved yet.</p>
                <p className="text-xs mt-2 text-slate-600 text-center">Run an optimization and click "Save as Shipment" to create one.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Package className="text-blue-500" /> Saved Shipments
            </h2>

            <div className="space-y-4">
                {shipments.map(shipment => (
                    <div key={shipment.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        {/* Header */}
                        <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                            onClick={() => toggleExpand(shipment.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${shipment.status === 'finalized' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>
                                    <Package size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{shipment.name}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(shipment.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Box size={12} /> {shipment.containerCount} Containers
                                        </span>
                                        <span className="flex items-center gap-1 text-green-400">
                                            <DollarSign size={12} /> ${shipment.totalCost.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {expandedId === shipment.id ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === shipment.id && (
                            <div className="border-t border-slate-700 bg-slate-900/30 p-4">
                                {/* Actions */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onLoadAsBase(shipment.id); }}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                                        title="Load these items + new items for re-optimization"
                                    >
                                        <RefreshCw size={16} /> Load as Base Plan
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUnpack(shipment.id); }}
                                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                                        title="Release items back to available pool"
                                    >
                                        <RotateCcw size={16} /> Unpack (Release Items)
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(shipment.id); }}
                                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 px-4 rounded flex items-center justify-center transition-colors"
                                        title="Delete Shipment Record"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Container List Preview */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Containers</h4>
                                    {shipment.snapshot?.assignments?.map((a: LoadedContainer, idx: number) => (
                                        <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Box size={14} className="text-slate-500" />
                                                <span className="text-sm text-slate-300">{a.container.name}</span>
                                                <span className="text-xs text-slate-500">({a.container.destination})</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400">{a.totalUtilization.toFixed(1)}% Full</span>
                                                <span className="text-xs text-green-400">${a.container.cost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ShipmentPanel;
