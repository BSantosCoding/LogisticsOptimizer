import React, { useState, useMemo } from 'react';
import { Shipment, Product, CSVMapping } from '../../types';
import { Package, Calendar, DollarSign, Box, ChevronRight, ChevronDown, Trash2, RefreshCw, RotateCcw, Truck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ContainerGroup {
    containerName: string;
    assignmentReference: string;
    products: Product[];
    totalQuantity: number;
}

interface ShipmentPanelProps {
    shipments: Shipment[];
    onUnpack: (shipmentId: string) => void;
    onLoadAsBase: (shipmentId: string) => void;
    onDelete: (shipmentId: string) => void;
    onUnpackItem: (shipmentId: string, productId: string) => void;
    csvMapping?: CSVMapping;
}

const ShipmentPanel: React.FC<ShipmentPanelProps> = ({
    shipments,
    onUnpack,
    onLoadAsBase,
    onDelete,
    onUnpackItem,
    csvMapping
}) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedContainerRef, setExpandedContainerRef] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
        setExpandedContainerRef(null);
    };

    // Group products by assignmentReference to reconstruct containers
    const getContainerGroups = (products: Product[] | undefined): ContainerGroup[] => {
        if (!products || products.length === 0) return [];

        const groups = new Map<string, ContainerGroup>();

        products.forEach(p => {
            const ref = p.assignmentReference || 'unassigned';
            const containerName = p.currentContainer || 'Unknown Container';

            if (!groups.has(ref)) {
                groups.set(ref, {
                    containerName,
                    assignmentReference: ref,
                    products: [],
                    totalQuantity: 0
                });
            }

            const group = groups.get(ref)!;
            group.products.push(p);
            group.totalQuantity += p.quantity || 1;
        });

        return Array.from(groups.values());
    };

    if (shipments.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-center">No shipments saved yet.</p>
                <p className="text-xs mt-2 text-muted-foreground/70 text-center">Run an optimization and click "Save as Shipment" to create one.</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="text-primary" /> Saved Shipments
            </h2>

            <div className="space-y-4">
                {shipments.map(shipment => {
                    const containerGroups = getContainerGroups(shipment.products);

                    return (
                        <Card key={shipment.id} className="overflow-hidden">
                            {/* Header */}
                            <div
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                                onClick={() => toggleExpand(shipment.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${shipment.status === 'finalized' ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'}`}>
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{shipment.name}</h3>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> {new Date(shipment.createdAt).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Box size={12} /> {containerGroups.length || shipment.containerCount} Containers
                                            </span>
                                            <span className="flex items-center gap-1 text-success">
                                                <DollarSign size={12} /> ${shipment.totalCost.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {expandedId === shipment.id ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === shipment.id && (
                                <div className="border-t border-border bg-muted/30 p-4">
                                    {/* Actions */}
                                    <div className="flex gap-2 mb-4">
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); onLoadAsBase(shipment.id); }}
                                            className="flex-1"
                                            title="Load these items + new items for re-optimization"
                                        >
                                            <RefreshCw size={16} className="mr-2" /> Load as Base Plan
                                        </Button>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); onUnpack(shipment.id); }}
                                            variant="secondary"
                                            className="flex-1"
                                            title="Release items back to available pool"
                                        >
                                            <RotateCcw size={16} className="mr-2" /> Unpack (Release Items)
                                        </Button>
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); onDelete(shipment.id); }}
                                            variant="outline"
                                            size="icon"
                                            className="text-success hover:bg-success/10"
                                            title="Consume Plan (Ship Items)"
                                        >
                                            <Truck size={16} />
                                        </Button>
                                    </div>

                                    {/* Container List Preview */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Containers</h4>
                                        {containerGroups.map((group) => (
                                            <div key={group.assignmentReference} className="bg-card rounded-lg border border-border overflow-hidden">
                                                <div
                                                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-accent/30"
                                                    onClick={() => setExpandedContainerRef(expandedContainerRef === group.assignmentReference ? null : group.assignmentReference)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Box size={14} className="text-muted-foreground" />
                                                        <span className="text-sm">{group.containerName}</span>
                                                        <span className="text-xs text-muted-foreground">({group.products.length} items)</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">{group.totalQuantity} units</span>
                                                        {expandedContainerRef === group.assignmentReference ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                                                    </div>
                                                </div>

                                                {/* Products List */}
                                                {expandedContainerRef === group.assignmentReference && (
                                                    <div className="bg-background/50 p-2 border-t border-border space-y-1">
                                                        {group.products.map(p => (
                                                            <div key={p.id} className="flex justify-between items-center text-xs p-2 hover:bg-accent/30 rounded group">
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">{p.name}</span>
                                                                        <span className="text-muted-foreground">x{p.quantity}</span>
                                                                    </div>
                                                                    {/* Extra Fields */}
                                                                    {csvMapping?.displayFields?.length > 0 && (
                                                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                                            {csvMapping.displayFields.map(fieldKey => {
                                                                                let val: any;
                                                                                if (Object.prototype.hasOwnProperty.call(p, fieldKey)) {
                                                                                    val = (p as any)[fieldKey];
                                                                                } else {
                                                                                    val = p.extraFields?.[fieldKey];
                                                                                }

                                                                                if (val === undefined || val === null || val === '') return null;

                                                                                const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                                                                                // Get friendly label from mapping or format the key
                                                                                const label = csvMapping.customFields[fieldKey] || fieldKey.replace(/([A-Z])/g, ' $1').trim();

                                                                                return (
                                                                                    <span key={fieldKey} className="text-[10px] text-foreground/70" title={`${label}: ${displayVal}`}>
                                                                                        <span className="font-semibold text-foreground/60 mr-1">{label}:</span>{displayVal}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onUnpackItem(shipment.id, p.id);
                                                                    }}
                                                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Unpack this item"
                                                                >
                                                                    <RotateCcw size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {containerGroups.length === 0 && (
                                            <p className="text-xs text-muted-foreground italic">No products in this shipment</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default ShipmentPanel;

