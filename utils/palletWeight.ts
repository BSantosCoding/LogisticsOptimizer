import { Product, ProductFormFactor } from '../types';

/**
 * Calculate total weight including pallet weight for a product
 * 
 * Formula: 
 * - palletCount = ceil(quantity / unitsPerPallet)
 * - totalWeight = productWeight + (palletCount × palletWeight)
 * 
 * If pallet config is not defined on the form factor, returns just the product weight.
 */
export const calculateTotalWeightWithPallets = (
    product: Product,
    formFactors: ProductFormFactor[]
): number => {
    const productWeight = product.weight ?? 0;

    if (!product.formFactorId) {
        return productWeight;
    }

    const formFactor = formFactors.find(ff => ff.id === product.formFactorId);

    if (!formFactor || !formFactor.pallet_weight || !formFactor.units_per_pallet) {
        // No pallet configuration, return just product weight
        return productWeight;
    }

    const palletCount = Math.ceil(product.quantity / formFactor.units_per_pallet);
    const palletWeight = palletCount * formFactor.pallet_weight;

    return productWeight + palletWeight;
};

/**
 * Apply pallet weight calculations to a list of products
 * Returns new product objects with updated weight including pallets
 */
export const applyPalletWeights = (
    products: Product[],
    formFactors: ProductFormFactor[]
): Product[] => {
    return products.map(product => ({
        ...product,
        weight: calculateTotalWeightWithPallets(product, formFactors)
    }));
};
