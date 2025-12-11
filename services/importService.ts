import { Product, ProductFormFactor, CSVMapping } from '../types';
import Papa from 'papaparse';

export const parseProductsCSV = (
    csvContent: string,
    formFactors: ProductFormFactor[],
    csvMapping: CSVMapping
): { products: Product[], productsWithMissingFF: string[], missingHeaders: string[] } => {
    const newProducts: Product[] = [];
    const productsWithMissingFF: string[] = [];
    const missingHeaders: string[] = [];

    // Sort form factors by length (descending) to match longest name first
    const sortedFormFactors = [...formFactors].sort((a, b) => b.name.length - a.name.length);

    // Use PapaParse for robust parsing and delimiter auto-detection
    const parsed = Papa.parse(csvContent, {
        skipEmptyLines: true,
        header: false // We read headers manually to use with our mapping logic
    });

    const rows = parsed.data as string[][];

    if (!rows || rows.length === 0) {
        return { products: [], productsWithMissingFF: [], missingHeaders: [] };
    }

    // Parse Header Row to find indices
    const headers = rows[0].map(h => h.trim());

    // Create a map of lowercased header names to their index
    const headerMap = new Map<string, number>();
    headers.forEach((h, i) => headerMap.set(h.toLowerCase(), i));

    // Get column index from header name
    const getColIndexByHeader = (headerName: string | undefined): number => {
        if (!headerName) return -1;
        return headerMap.get(headerName.toLowerCase().trim()) ?? -1;
    };

    // Get column index for a field (core or custom)
    const getColIndex = (fieldKey: string): number => {
        // Check core fields first
        if (fieldKey === 'country') return getColIndexByHeader(csvMapping.country);
        if (fieldKey === 'quantity') return getColIndexByHeader(csvMapping.quantity);
        if (fieldKey === 'weight') return getColIndexByHeader(csvMapping.weight);

        // Check custom fields
        if (csvMapping.customFields && fieldKey in csvMapping.customFields) {
            return getColIndexByHeader(csvMapping.customFields[fieldKey]);
        }
        return -1;
    };

    // Core field indices
    const countryIdx = getColIndex('country');
    const quantityIdx = getColIndex('quantity');
    const weightIdx = getColIndex('weight');

    // Custom field indices
    const shipToNameIdx = getColIndex('shipToName');
    const descriptionIdx = getColIndex('description');

    // Get indices for all Incoterms headers
    const incotermsIndices = (csvMapping.incoterms || []).map(header => ({
        header,
        index: getColIndexByHeader(header)
    })).filter(item => item.index !== -1);

    // Get indices for all restriction headers
    const restrictionIndices = (csvMapping.restrictions || []).map(header => ({
        header,
        index: getColIndexByHeader(header)
    })).filter(item => item.index !== -1);

    // Build list of all configured headers to validate
    const configuredHeaders: string[] = [
        csvMapping.country,
        csvMapping.quantity,
        csvMapping.weight,
        ...(csvMapping.incoterms || []),
        ...(csvMapping.restrictions || []),
        ...Object.values(csvMapping.customFields || {})
    ].filter(Boolean);

    for (const header of configuredHeaders) {
        if (header && !headerMap.has(header.toLowerCase().trim())) {
            missingHeaders.push(header);
        }
    }

    // Pre-calculate indices for grouping fields
    const groupingIndices = csvMapping.groupingFields.map(field => ({
        field,
        index: getColIndex(field)
    }));

    // Skip header (index 0)
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length === 0) continue;

        // Helper to safely get value
        const getVal = (index: number) => index >= 0 && index < cols.length ? cols[index] : '';

        const country = getVal(countryIdx)?.trim();
        const shipToName = getVal(shipToNameIdx)?.trim();
        const description = getVal(descriptionIdx);

        // Concatenate Incoterms
        const incotermsParts = incotermsIndices.map(item => getVal(item.index)).filter(Boolean);
        const incoterms = incotermsParts.join(' ');

        const numPackagesStr = getVal(quantityIdx);
        const weightStr = getVal(weightIdx);

        // 1. Grouping Key -> Destination
        const destinationParts = groupingIndices
            .filter(item => item.index !== -1)
            .map(item => getVal(item.index));
        const destination = destinationParts.join('|');

        // 2. Quantity
        const quantity = parseInt(numPackagesStr.replace(/,/g, ''), 10) || 0;
        if (quantity <= 0) continue;

        // 3. Weight (parse, allow decimals)
        const weight = parseFloat(weightStr.replace(/,/g, '')) || undefined;

        // 4. Form Factor Matching
        let matchedFFId = '';
        for (const ff of sortedFormFactors) {
            if (description.toLowerCase().includes(ff.name.toLowerCase())) {
                matchedFFId = ff.id;
                break;
            }
        }

        if (!matchedFFId) {
            console.warn(`Could not match form factor for: ${description}`);
            productsWithMissingFF.push(description);
        }

        // 5. Restrictions - check all configured restriction headers
        const restrictions: string[] = [];
        for (const { header, index } of restrictionIndices) {
            const value = getVal(index);
            if (value && value.trim().length > 0) {
                restrictions.push(header);
            }
        }

        const newProduct: Product = {
            id: crypto.randomUUID(),
            name: description.substring(0, 50),
            formFactorId: matchedFFId,
            quantity: quantity,
            weight: weight,
            destination: destination,
            country: country,
            shipToName: shipToName,
            restrictions: restrictions,
            readyDate: '',
            shipDeadline: '',
            arrivalDeadline: ''
        };

        newProducts.push(newProduct);
    }

    return { products: newProducts, productsWithMissingFF, missingHeaders };
};
