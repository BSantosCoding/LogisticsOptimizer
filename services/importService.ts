import { Product, ProductFormFactor } from '../types';

export const parseProductsCSV = (
    csvContent: string,
    formFactors: ProductFormFactor[]
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

    // Skip header (index 0)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseCSVLine(line);

        // Extract fields based on CSV structure
        if (cols.length < 27) continue; // Skip malformed lines

        const customerNum = cols[4];
        const country = cols[2]?.trim(); // Ship To: Country (Index 2)
        const shipToName = cols[5]?.trim(); // Ship To: Name (Index 5)
        const incoterms = cols[6];
        const incoterms2 = cols[7];
        const salesOrg = cols[13];
        const numPackagesStr = cols[25];
        const description = cols[26];
        const tempControl = cols[30];

        // 1. Grouping Key -> Destination
        const destination = `${customerNum}|${incoterms}|${incoterms2}|${salesOrg}`;

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
