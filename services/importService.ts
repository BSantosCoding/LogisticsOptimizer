import { Product, ProductFormFactor, CSVMapping } from '../types';
import Papa from 'papaparse';
import { parseLocaleNumber } from '../utils/numberParser';

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
        if (fieldKey === 'formFactor') return getColIndexByHeader(csvMapping.formFactor);

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
    const formFactorIdx = getColIndex('formFactor');
    // Description is now purely custom again
    const descriptionIdx = getColIndex('description');

    // Custom field indices
    const shipToNameIdx = getColIndex('shipToName');

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
        csvMapping.formFactor,
        (csvMapping.shippingAvailableBy || ''),
        (csvMapping.currentContainer || ''),
        (csvMapping.assignmentReference || ''),
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

    // Get index for Shipping Available By
    const shippingDateIdx = getColIndexByHeader(csvMapping.shippingAvailableBy);

    // Pre-calculate indices for all custom fields
    const customFieldIndices = Object.entries(csvMapping.customFields || {}).map(([key, header]) => ({
        key,
        index: getColIndexByHeader(header)
    }));

    // Skip header (index 0)
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length === 0) continue;

        // Helper to safely get value
        const getVal = (index: number) => index >= 0 && index < cols.length ? cols[index] : '';

        const country = getVal(countryIdx)?.trim();
        const shipToName = getVal(shipToNameIdx)?.trim();
        const shippingDate = getVal(shippingDateIdx)?.trim();

        // Extract extra fields
        const extraFields: Record<string, string> = {};
        for (const { key, index } of customFieldIndices) {
            const val = getVal(index);
            if (val) {
                extraFields[key] = val.trim();
            }
        }

        const formFactorVal = getVal(formFactorIdx)?.trim();
        // If description is not configured, use formFactor column as the product name
        // (User intent: "Material Description" is mapped to formFactor, and it effectively IS the product name)
        let description = getVal(descriptionIdx)?.trim();
        if (!description && formFactorVal) {
            description = formFactorVal;
        }

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
        const quantity = Math.round(parseLocaleNumber(numPackagesStr) || 0);
        if (quantity <= 0) continue;

        // 3. Weight (parse, allow decimals)
        const weight = parseLocaleNumber(weightStr);

        // 4. Form Factor Matching
        let matchedFFId = '';

        if (formFactorVal) {
            // Try exact set match from column first (unlikely if column is "Description", but good if purely "ID")
            const exactMatch = formFactors.find(ff => ff.name.toLowerCase() === formFactorVal.toLowerCase());
            if (exactMatch) {
                matchedFFId = exactMatch.id;
            } else {
                // If mapped column value doesn't exactly match a FF name, try checking if the FF name is IN the column value
                // (e.g. Column="DAOTAN... IBC 1000", FF="IBC 1000")
                for (const ff of sortedFormFactors) {
                    if (formFactorVal.toLowerCase().includes(ff.name.toLowerCase())) {
                        matchedFFId = ff.id;
                        break;
                    }
                }
            }
        }

        if (!matchedFFId && description) {
            // Fallback: check if description (if different/distinct) contains FF
            // (If description == formFactorVal, we already checked it above)
            if (description !== formFactorVal) {
                for (const ff of sortedFormFactors) {
                    if (description.toLowerCase().includes(ff.name.toLowerCase())) {
                        matchedFFId = ff.id;
                        break;
                    }
                }
            }
        }

        if (!matchedFFId) {
            console.warn(`Could not match form factor for: ${description || '(no description)'}`);
            productsWithMissingFF.push(description || '(no description)');
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
            name: (description || formFactorVal || 'Unknown Product').substring(0, 50),
            formFactorId: matchedFFId,
            quantity: quantity,
            weight: weight,
            destination: destination,
            country: country,
            shipToName: shipToName,
            restrictions: restrictions,
            readyDate: '',
            shipDeadline: '',
            arrivalDeadline: '',
            shippingAvailableBy: shippingDate,
            currentContainer: getVal(getColIndexByHeader(csvMapping.currentContainer))?.trim(),
            assignmentReference: getVal(getColIndexByHeader(csvMapping.assignmentReference))?.trim(),
            extraFields: extraFields
        };

        newProducts.push(newProduct);
    }

    return { products: newProducts, productsWithMissingFF, missingHeaders };
};
