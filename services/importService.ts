import { Product, ProductFormFactor, CSVMapping } from '../types';

export const parseProductsCSV = (
    csvContent: string,
    formFactors: ProductFormFactor[],
    csvMapping: CSVMapping
): { products: Product[], productsWithMissingFF: string[] } => {
    const lines = csvContent.split('\n');
    const newProducts: Product[] = [];
    const productsWithMissingFF: string[] = [];

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

    // Map Configured Header Names to Indices
    const getIndex = (headerName: string): number => {
        const index = headers.findIndex(h => h.toLowerCase() === headerName.toLowerCase());
        return index;
    };

    const fieldIndices = {
        customerNum: getIndex(csvMapping.customerNum),
        country: getIndex(csvMapping.country),
        shipToName: getIndex(csvMapping.shipToName),
        incoterms: getIndex(csvMapping.incoterms),
        incoterms2: getIndex(csvMapping.incoterms2),
        salesOrg: getIndex(csvMapping.salesOrg),
        quantity: getIndex(csvMapping.quantity),
        description: getIndex(csvMapping.description),
        tempControl: getIndex(csvMapping.tempControl),
    };

    // Check for critical missing headers (optional, but good for debugging)
    // console.log('Field Indices:', fieldIndices);

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        // Extract fields based on mapped indices
        // Helper to safely get value
        const getVal = (index: number) => index >= 0 && index < cols.length ? cols[index] : '';

        const customerNum = getVal(fieldIndices.customerNum);
        const country = getVal(fieldIndices.country)?.trim();
        const shipToName = getVal(fieldIndices.shipToName)?.trim();
        const incoterms = getVal(fieldIndices.incoterms);
        const incoterms2 = getVal(fieldIndices.incoterms2);
        const salesOrg = getVal(fieldIndices.salesOrg);
        const numPackagesStr = getVal(fieldIndices.quantity);
        const description = getVal(fieldIndices.description);
        const tempControl = getVal(fieldIndices.tempControl);

        // 1. Grouping Key -> Destination
        // Construct destination based on groupingFields
        const destinationParts = csvMapping.groupingFields.map(fieldKey => {
            const idx = getIndex((csvMapping as any)[fieldKey]);
            return getVal(idx);
        });
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

        // 4. Restrictions
        const restrictions: string[] = [];
        if (tempControl && tempControl.trim().length > 0) {
            restrictions.push('Temperature Control');
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

    return { products: newProducts, productsWithMissingFF };
};
