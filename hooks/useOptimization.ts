import React, { useState, useEffect } from 'react';
import { Product, Container, OptimizationPriority, OptimizationResult, LoadedContainer } from '../types';
import { validateLoadedContainer, calculatePacking } from '../services/logisticsEngine';

export const useOptimization = (
    products: Product[],
    containers: Container[],
    countries: any[],
    selectedProductIds: Set<string>,
    selectedContainerIds: Set<string>,
    optimalUtilizationRange: { min: number; max: number }
) => {
    const [results, setResults] = useState<Record<OptimizationPriority, OptimizationResult> | null>(null);
    const [activePriority, setActivePriority] = useState<OptimizationPriority>(OptimizationPriority.MANUAL);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [draggedProductId, setDraggedProductId] = useState<string | null>(null);

    // Initialize and sync Manual Mode
    useEffect(() => {
        if (!results) {
            // First time initialization
            setResults({
                [OptimizationPriority.AUTOMATIC]: {
                    assignments: [],
                    unassignedProducts: [],
                    totalCost: 0,
                    reasoning: ''
                },
                [OptimizationPriority.MANUAL]: {
                    assignments: [],
                    unassignedProducts: [...products],
                    totalCost: 0,
                    reasoning: 'Manual planning mode'
                }
            });
        } else {
            // Update Manual mode's unassigned products when products change
            // Note: This is a bit tricky. If we just reset unassigned to all products, we lose assignments.
            // But the original code did:
            /*
            setResults(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                [OptimizationPriority.MANUAL]: {
                  ...prev[OptimizationPriority.MANUAL],
                  unassignedProducts: [...products]
                }
              };
            });
            */
            // This seems to imply that manual mode resets unassigned products to ALL products?
            // But what about assigned ones?
            // The original code in App.tsx line 1072 does exactly that.
            // It seems flawed if assignments exist, but let's replicate existing behavior for now or fix it.
            // Actually, if products change (e.g. added/removed), we probably want to sync.
            // But if we have assignments, we shouldn't overwrite unassigned with ALL products, only those not assigned?
            // The original code seems to assume manual mode starts fresh or something?
            // Wait, line 1079: `unassignedProducts: [...products]`.
            // If I have assignments, and I add a product, `products` has everything.
            // So `unassignedProducts` gets everything.
            // This means assignments might be pointing to products that are also in unassigned?
            // That would be a bug in the original code or I'm misunderstanding.
            // Let's stick to the original logic for now to avoid breaking changes, but maybe add a TODO.
            // Actually, looking at `handleDrop`, it moves items between assignments and unassigned.
            // If `products` updates (e.g. new product added), we want it to appear in unassigned.
            // But we don't want to duplicate assigned ones.
            // Let's keep the original logic for now as this is a refactor, not a bug fix (unless critical).

            setResults(prev => {
                if (!prev) return prev;
                // We only want to update unassigned if we are NOT in the middle of an operation that manages it?
                // Or maybe we should filter out assigned ones?
                // For safety in refactor, I will copy the logic but maybe it's worth checking.
                return {
                    ...prev,
                    [OptimizationPriority.MANUAL]: {
                        ...prev[OptimizationPriority.MANUAL],
                        unassignedProducts: [...products] // This looks suspicious but keeping it for now.
                    }
                };
            });
        }
    }, [products]);

    const handleRunOptimization = (onError: (msg: string) => void, onSuccess: () => void) => {
        if (products.length === 0) {
            onError('Add products first!');
            return;
        }
        if (containers.length === 0) {
            onError('Add container templates first!');
            return;
        }

        setIsOptimizing(true);
        setResults(null);

        // Filter products: Only use selected ones that are AVAILABLE
        const productsToUse = products.filter(p =>
            (selectedProductIds.size === 0 || selectedProductIds.has(p.id)) &&
            (!p.status || p.status === 'available') // Exclude shipped items
        );

        if (productsToUse.length === 0) {
            onError('No available products to optimize! Check if items are already shipped.');
            setIsOptimizing(false);
            return;
        }

        const containersToUse = selectedContainerIds.size > 0
            ? containers.filter(d => selectedContainerIds.has(d.id))
            : containers;

        // Transform countries data into countryCosts map
        const countryCosts: Record<string, Record<string, number>> = {};
        countries.forEach((country: any) => {
            if (country.containerCosts) {
                if (country.code) countryCosts[country.code] = country.containerCosts;
                if (country.name) countryCosts[country.name] = country.containerCosts;
            }
        });

        setTimeout(async () => {
            const priority = OptimizationPriority.AUTOMATIC;
            const { assignments, unassigned } = calculatePacking(
                productsToUse,
                containersToUse,
                priority,
                optimalUtilizationRange.min,
                countryCosts,
                optimalUtilizationRange.max
            );

            // Calculate total cost using country-specific costs when available
            const totalCost = assignments.reduce((sum, a) => {
                const country = a.assignedProducts[0]?.country;
                const cost = (country && countryCosts[country]?.[a.container.id]) ?? a.container.cost;
                return sum + cost;
            }, 0);

            const avgUtilization = assignments.length > 0
                ? assignments.reduce((sum, a) => sum + a.totalUtilization, 0) / assignments.length
                : 0;

            const automaticResult: OptimizationResult = {
                assignments,
                unassignedProducts: unassigned,
                totalCost,
                reasoning: `Optimization complete.\n${assignments.length} containers used (avg ${avgUtilization.toFixed(1)}% full). ${unassigned.length} items unassigned.`
            };

            const newResults: Record<OptimizationPriority, OptimizationResult> = {
                [OptimizationPriority.AUTOMATIC]: automaticResult,
                [OptimizationPriority.MANUAL]: results?.[OptimizationPriority.MANUAL] || {
                    assignments: [],
                    unassignedProducts: [...products],
                    totalCost: 0,
                    reasoning: 'Manual planning mode'
                }
            };

            setResults(newResults);
            setActivePriority(OptimizationPriority.AUTOMATIC);
            setIsOptimizing(false);
            onSuccess();
        }, 500);
    };

    const handleDragStart = (e: React.DragEvent, productId: string, sourceId: string) => {
        e.dataTransfer.setData("productId", productId);
        e.dataTransfer.setData("sourceId", sourceId);
        setDraggedProductId(productId);
    };

    const handleDrop = (e: React.DragEvent, targetId: string, quantity?: number) => {
        e.preventDefault();
        if (!results) return;

        const currentResult = results[activePriority];
        if (!currentResult) return;

        const productId = e.dataTransfer.getData("productId");
        const sourceId = e.dataTransfer.getData("sourceId");

        if (sourceId === targetId) return;

        const newAssignments = currentResult.assignments.map((a: LoadedContainer) => ({
            ...a,
            assignedProducts: [...a.assignedProducts],
        }));
        let newUnassigned = [...currentResult.unassignedProducts];

        // Helper to find and remove product(s)
        const moveProducts = (qtyToMove: number) => {
            const movedProducts: Product[] = [];
            let remainingQty = qtyToMove;

            // Helper to process a list of products
            const processList = (list: Product[]) => {
                let primaryIndex = list.findIndex(p => p.id === productId);

                if (primaryIndex === -1) {
                    return list;
                }

                const templateProd = list[primaryIndex];

                const candidates = list.map((p, idx) => ({ p, idx })).filter(item =>
                    item.p.id === productId ||
                    (item.p.name === templateProd.name && item.p.formFactorId === templateProd.formFactorId)
                );

                candidates.sort((a, b) => (a.p.id === productId ? -1 : 1));

                const indicesToRemove: number[] = [];

                for (const candidate of candidates) {
                    if (remainingQty <= 0) break;

                    if (candidate.p.quantity <= remainingQty) {
                        movedProducts.push(candidate.p);
                        indicesToRemove.push(candidate.idx);
                        remainingQty -= candidate.p.quantity;
                    } else {
                        const newProduct = { ...candidate.p, id: crypto.randomUUID(), quantity: remainingQty };
                        movedProducts.push(newProduct);
                        candidate.p.quantity -= remainingQty;
                        remainingQty = 0;
                    }
                }

                indicesToRemove.sort((a, b) => b - a);
                const newList = [...list];
                indicesToRemove.forEach(idx => newList.splice(idx, 1));
                return newList;
            };

            if (sourceId === 'unassigned') {
                newUnassigned = processList(newUnassigned);
            } else {
                const sourceContainerIndex = newAssignments.findIndex(a => a.container.id === sourceId);
                if (sourceContainerIndex !== -1) {
                    const sourceContainer = newAssignments[sourceContainerIndex];
                    const updatedProducts = processList(sourceContainer.assignedProducts);
                    const updatedContainer = {
                        ...sourceContainer.container,
                        destination: updatedProducts.length > 0 ? updatedProducts[0].destination : sourceContainer.container.destination
                    };
                    const revalidatedSource = validateLoadedContainer(updatedContainer, updatedProducts);
                    newAssignments[sourceContainerIndex] = revalidatedSource;
                }
            }

            return movedProducts;
        };

        let productsToInsert: Product[] = [];

        if (quantity !== undefined) {
            productsToInsert = moveProducts(quantity);
        } else {
            let p: Product | undefined;
            if (sourceId === 'unassigned') {
                p = newUnassigned.find(x => x.id === productId);
            } else {
                const sc = newAssignments.find(a => a.container.id === sourceId);
                p = sc?.assignedProducts.find(x => x.id === productId);
            }

            if (p) {
                productsToInsert = moveProducts(p.quantity);
            }
        }

        if (productsToInsert.length === 0) return;

        // Add to Target
        if (targetId === 'unassigned') {
            newUnassigned.push(...productsToInsert);
        } else {
            const targetContainerIndex = newAssignments.findIndex(a => a.container.id === targetId);

            if (targetContainerIndex === -1) {
                const freshContainer = containers.find(d => d.id === targetId);
                if (freshContainer) {
                    const newLoadedContainer = validateLoadedContainer(freshContainer, productsToInsert);
                    newLoadedContainer.container.destination = productsToInsert[0].destination;
                    newAssignments.push(newLoadedContainer);
                }
            } else {
                const targetContainer = newAssignments[targetContainerIndex];
                const updatedProducts = [...targetContainer.assignedProducts, ...productsToInsert];
                const updatedContainer = { ...targetContainer.container, destination: productsToInsert[0].destination };
                const revalidatedTarget = validateLoadedContainer(updatedContainer, updatedProducts);
                newAssignments[targetContainerIndex] = revalidatedTarget;
            }
        }

        setDraggedProductId(null);

        const nonEmptyAssignments = newAssignments.filter((a: LoadedContainer) => a.assignedProducts.length > 0);
        const totalCost = nonEmptyAssignments.reduce((sum, a) => sum + a.container.cost, 0);

        setResults({
            ...results,
            [activePriority]: {
                ...currentResult,
                assignments: nonEmptyAssignments,
                unassignedProducts: newUnassigned,
                totalCost
            }
        });
    };

    const handleAddContainer = (container: Container) => {
        if (!results) return;

        const currentResult = results[activePriority];
        if (activePriority !== OptimizationPriority.MANUAL) return;

        const newContainer = { ...container, id: `${container.id}-instance-${Date.now()}` };
        const newLoadedContainer = validateLoadedContainer(newContainer, []);

        const newAssignments = [...currentResult.assignments, newLoadedContainer];

        const newResults = {
            ...results,
            [activePriority]: {
                ...currentResult,
                assignments: newAssignments
            }
        };
        setResults(newResults);
    };

    const handleDeleteContainer = (containerId: string, priority: OptimizationPriority) => {
        if (!results) return;

        const currentResult = results[priority];
        const containerToDelete = currentResult.assignments.find(a => a.container.id === containerId);
        if (!containerToDelete) return;

        const newAssignments = currentResult.assignments.filter(a => a.container.id !== containerId);
        const newUnassigned = [...currentResult.unassignedProducts, ...containerToDelete.assignedProducts];

        const newResults = {
            ...results,
            [priority]: {
                ...currentResult,
                assignments: newAssignments,
                unassignedProducts: newUnassigned
            }
        };
        setResults(newResults);
    };

    return {
        results,
        setResults,
        activePriority,
        setActivePriority,
        isOptimizing,
        draggedProductId,
        handleRunOptimization,
        handleDragStart,
        handleDrop,
        handleAddContainer,
        handleDeleteContainer
    };
};
