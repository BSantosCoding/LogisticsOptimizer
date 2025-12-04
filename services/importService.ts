import { Product, ProductFormFactor, CSVMapping } from '../types';

export const parseProductsCSV = (
    csvContent: string,
    formFactors: ProductFormFactor[],
    csvMapping: CSVMapping
): { products: Product[], productsWithMissingFF: string[], missingHeaders: string[] } => {
    const lines = csvContent.split('\n');
    const newProducts: Product[] = [];
    const productsWithMissingFF: string[] = [];
    const missingHeaders: string[] = [];

    // Sort form factors by length (descending) to match longest name first
    const sortedFormFactors = [...formFactors].sort((a, b) => b.name.length - a.name.length);

    // Helper to parse CSV line handling quotes
    const parseCSVLine = (text: string) => {
        const result = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                cell = '';
            } else {
                cell += char;
            }
        }
        result.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return result;
    };

    // Parse Header Row to find indices
    const headerLine = lines[0].trim();
    const headers = parseCSVLine(headerLine).map(h => h.trim());

    // Create a map of lowercased header names to their index
    const headerMap = new Map<string, number>();
    headers.forEach((h, i) => headerMap.set(h.toLowerCase(), i));

    // Dynamic Column Mapping
    const getColIndex = (key: keyof CSVMapping | string) => {
        // Check standard keys first
        if (key in csvMapping && typeof (csvMapping as any)[key] === 'string') {
            const headerName = (csvMapping as any)[key];
            return headerMap.get(headerName?.toLowerCase().trim() || '') ?? -1;
        }
        // Check custom fields
        if (csvMapping.customFields && key in csvMapping.customFields) {
            const headerName = csvMapping.customFields[key];
            return headerMap.get(headerName?.toLowerCase().trim() || '') ?? -1;
        }
        return -1;
    };

    const customerNumIdx = getColIndex('customerNum');
    const countryIdx = getColIndex('country');
    const shipToNameIdx = getColIndex('shipToName');

    // Get indices for all Incoterms headers
    const incotermsIndices = (csvMapping.incoterms || []).map(header => ({
        header,
        index: headerMap.get(header?.toLowerCase().trim() || '') ?? -1
    })).filter(item => item.index !== -1);

    const salesOrgIdx = getColIndex('salesOrg');
    const quantityIdx = getColIndex('quantity');
    const descriptionIdx = getColIndex('description');

    // Get indices for all restriction headers
    const restrictionIndices = (csvMapping.restrictions || []).map(header => ({
        header,
        index: headerMap.get(header?.toLowerCase().trim() || '') ?? -1
    })).filter(item => item.index !== -1);

    // Validate that at least some configured headers were found
    const configuredHeaders = [
        csvMapping.customerNum,
        csvMapping.country,
        csvMapping.shipToName,
        csvMapping.shipToName,
        ...(csvMapping.incoterms || []),
        csvMapping.salesOrg,
        csvMapping.quantity,
        csvMapping.description,
        ...(csvMapping.restrictions || []),
        ...Object.values(csvMapping.customFields || {})
    ];

    for (const header of configuredHeaders) {
        if (header && !headerMap.has(header.toLowerCase().trim())) {
            missingHeaders.push(header);
        }
    }

    // Pre-calculate indices for grouping fields (standard + custom)
    const groupingIndices = csvMapping.groupingFields.map(field => ({
        field,
        index: getColIndex(field)
    }));

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        // Helper to safely get value
        const getVal = (index: number) => index >= 0 && index < cols.length ? cols[index] : '';

        const customerNum = getVal(customerNumIdx);
        const country = getVal(countryIdx)?.trim();
        const shipToName = getVal(shipToNameIdx)?.trim();

        // Concatenate Incoterms
        const incotermsParts = incotermsIndices.map(item => getVal(item.index)).filter(Boolean);
        const incoterms = incotermsParts.join(' ');

        const salesOrg = getVal(salesOrgIdx);
        const numPackagesStr = getVal(quantityIdx);
        const description = getVal(descriptionIdx);

        // 1. Grouping Key -> Destination
        // Construct destination based on groupingFields
        const destinationParts = groupingIndices
            .filter(item => item.index !== -1) // Only include fields that were found in the header
            .map(item => getVal(item.index));
        const destination = destinationParts.join('|');

        // 2. Quantity
        const quantity = parseInt(numPackagesStr.replace(/,/g, ''), 10) || 0;
        if (quantity <= 0) continue;

        // 3. Form Factor Matching
        let matchedFFId = '';
        for (const ff of sortedFormFactors) {
            if (description.toLowerCase().includes(ff.name.toLowerCase())) {
                matchedFFId = ff.id;
                break;
            }
        }

        // If no form factor matched, flag it
        if (!matchedFFId) {
            console.warn(`Could not match form factor for: ${description}`);
            productsWithMissingFF.push(description);
        }

        // 4. Restrictions - check all configured restriction headers
        const restrictions: string[] = [];
        for (const { header, index } of restrictionIndices) {
            const value = getVal(index);
            if (value && value.trim().length > 0) {
                restrictions.push(header); // Map Header Name -> Tag Name
            }
        }

        const newProduct: Product = {
            id: crypto.randomUUID(),
            name: description.substring(0, 50), // Truncate name if too long
            formFactorId: matchedFFId,
            quantity: quantity,
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
